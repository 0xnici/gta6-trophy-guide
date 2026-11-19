// Leonida Ledger — screenshot capture for the make.fun entry.
//
// Reads shots.json at the repo root, serves app/ through serve.ts, drives a
// headless Chrome over the DevTools protocol, waits for each scene to flag
// window.__shotReady, and writes JPEGs into screenshots/. Every capture is
// asserted against the competition's per-screenshot byte cap.
//
// Usage: node tools/capture.mjs [--chrome /path/to/chrome]

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAX_BYTES = 262144;
const HTTP_PORT = 4173;
const CDP_PORT = 9223;

const argv = process.argv.slice(2);
const chromeFlag = argv.indexOf("--chrome");
const CHROME = chromeFlag >= 0
  ? argv[chromeFlag + 1]
  : "/home/hatch/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome";

const parsed = JSON.parse(readFileSync(join(root, "shots.json"), "utf8"));
const shots = Array.isArray(parsed) ? parsed : parsed.shots;
if (!Array.isArray(shots) || shots.length === 0) throw new Error("shots.json lists no shots");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error(`timed out waiting for ${url}`);
}

// Minimal CDP client over the built-in WebSocket.
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });
    return new Cdp(ws);
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const out = await this.send("Runtime.evaluate", { expression, returnByValue: true });
    if (out.exceptionDetails) throw new Error(`page error: ${JSON.stringify(out.exceptionDetails).slice(0, 400)}`);
    return out.result.value;
  }
}

async function main() {
  const server = spawn(process.execPath, [join(root, "serve.ts")], {
    env: { ...process.env, PORT: String(HTTP_PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stderr.on("data", (d) => process.stderr.write(`[serve] ${d}`));
  const chrome = spawn(CHROME, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${CDP_PORT}`,
    "--user-data-dir=/tmp/leonida-capture-profile",
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });

  try {
    await waitForHttp(`http://127.0.0.1:${HTTP_PORT}/`, 15000);
    await waitForHttp(`http://127.0.0.1:${CDP_PORT}/json/version`, 15000);

    let target = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: "PUT" })).json().catch(() => null);
    if (!target || !target.webSocketDebuggerUrl) {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
      target = list.find((t) => t.type === "page");
    }
    if (!target) throw new Error("no CDP page target");

    const cdp = await Cdp.connect(target.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    for (const shot of shots) {
      const width = shot.viewport ? shot.viewport.width : shot.width;
      const height = shot.viewport ? shot.viewport.height : shot.height;
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width, height, deviceScaleFactor: 1, mobile: false,
      });
      await cdp.send("Page.navigate", { url: `http://127.0.0.1:${HTTP_PORT}${shot.path}` });
      const deadline = Date.now() + 20000;
      let ready = false;
      while (Date.now() < deadline) {
        ready = await cdp.evaluate("window.__shotReady === true").catch(() => false);
        if (ready) break;
        await sleep(200);
      }
      if (!ready) throw new Error(`scene never became ready: ${shot.path}`);
      await sleep(300);
      const shotTitle = await cdp.evaluate("document.title");
      const cards = await cdp.evaluate("document.querySelectorAll('.card').length");
      const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 78 });
      const buf = Buffer.from(data, "base64");
      if (buf.length > MAX_BYTES) {
        throw new Error(`${shot.file} is ${buf.length} bytes, over the ${MAX_BYTES} cap`);
      }
      const outPath = join(root, "screenshots", shot.file);
      writeFileSync(outPath, buf);
      console.log(`${shot.file}: ${buf.length} bytes, ${width}x${height}, title=${JSON.stringify(shotTitle)}, cards=${cards}`);
    }
    cdp.ws.close();
  } finally {
    chrome.kill("SIGTERM");
    server.kill("SIGTERM");
  }
}

main().then(
  () => console.log("capture complete"),
  (err) => { console.error(err); process.exit(1); },
);

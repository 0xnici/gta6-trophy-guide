// Capture the dossier screenshots for the GTA 6 Trophy Guide.
//
// Starts serve.ts on port 8081, drives a headless Chrome over the DevTools
// protocol (Node standard library only — the global WebSocket client and
// fetch), opens every scene listed in shots.json at 1280x800, waits for the
// page to raise window.__shotReady, and saves a JPEG per scene into
// screenshots/. Each file must come in at or under 262144 bytes (256 KiB);
// if a capture is too heavy the quality is lowered and the shot retaken.
//
//   node tools/capture.mjs

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
const PORT = 8081;
const CDP_PORT = 9342;
const MAX_BYTES = 262144;

const CHROME_CANDIDATES = [
  `${process.env.HOME}/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome`,
  '/opt/meta-chromium/chrome',
];
const chromeBin = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chromeBin) throw new Error(`no Chrome found; looked in: ${CHROME_CANDIDATES.join(', ')}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHttp(url, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch { /* not up yet */ }
    await sleep(150);
  }
  throw new Error(`timed out waiting for ${label} at ${url}`);
}

/* --- tiny CDP client over the browser-level WebSocket --- */
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message}`));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }
}

async function main() {
  const server = spawn(process.execPath, [join(root, 'serve.ts'), '--port', String(PORT)], { stdio: 'pipe' });
  const chrome = spawn(chromeBin, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    `--remote-debugging-port=${CDP_PORT}`, 'about:blank',
  ], { stdio: 'pipe' });

  try {
    await waitForHttp(`http://localhost:${PORT}/`, 10000, 'serve.ts');
    const versionRes = await waitForHttp(`http://localhost:${CDP_PORT}/json/version`, 10000, 'Chrome CDP');
    const version = await versionRes.json();

    const ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
    const cdp = new Cdp(ws);

    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const page = (method, params) => cdp.send(method, params, sessionId);

    await page('Page.enable');
    await page('Runtime.enable');
    await page('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

    mkdirSync(join(root, 'screenshots'), { recursive: true });

    for (const shot of shots) {
      const { width, height } = shot.viewport || { width: 1280, height: 800 };
      await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      await page('Page.navigate', { url: `http://localhost:${PORT}${shot.path}` });

      const deadline = Date.now() + 20000;
      let readyFlag = false;
      while (Date.now() < deadline) {
        const r = await page('Runtime.evaluate', { expression: 'window.__shotReady === true', returnByValue: true });
        if (r && r.result && r.result.value === true) { readyFlag = true; break; }
        await sleep(150);
      }
      if (!readyFlag) throw new Error(`scene ${shot.file} never raised window.__shotReady`);
      await sleep(120);

      let quality = 80;
      let buffer;
      for (;;) {
        const shotRes = await page('Page.captureScreenshot', { format: 'jpeg', quality, captureBeyondViewport: false });
        buffer = Buffer.from(shotRes.data, 'base64');
        if (buffer.length <= MAX_BYTES || quality <= 35) break;
        quality -= 15;
      }
      if (buffer.length > MAX_BYTES) throw new Error(`scene ${shot.file} is ${buffer.length} bytes even at quality ${quality}`);
      writeFileSync(join(root, 'screenshots', shot.file), buffer);
      console.log(`${shot.file}: ${buffer.length} bytes (jpeg quality ${quality}, viewport ${width}x${height})`);
    }

    ws.close();
  } finally {
    chrome.kill('SIGTERM');
    server.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(`capture failed: ${err.message}`);
  process.exit(1);
});

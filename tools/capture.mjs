// Screenshot capture for the guide (Node standard library only).
// Starts serve.ts, launches headless Chrome, drives it over the DevTools
// protocol on a WebSocket, waits for window.__shotReady in each ?shot= scene,
// and writes the JPEGs listed in shots.json into screenshots/.
// Usage: node tools/capture.mjs
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
const chromeCandidates = [
  '/home/hatch/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome',
  '/opt/meta-chromium/chrome',
];
const chrome = chromeCandidates.find(p => existsSync(p));
if (!chrome) throw new Error('no Chrome binary found');
const PORT = 17431, CDP = 17432, BASE = `http://127.0.0.1:${PORT}`;

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) { try { const r = await fetch(url); if (r.ok) return r; } catch {} await sleep(300); }
  throw new Error(`timed out waiting for ${url}`);
}

const server = spawn('node', ['serve.ts'], { cwd: root, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
const browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${CDP}`, '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });

try {
  await waitFor(`${BASE}/`);
  const version = await (await waitFor(`http://127.0.0.1:${CDP}/json/version`)).json();
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0; const pending = new Map();
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}, sessionId) => new Promise(res => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); });

  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, sessionId);

  mkdirSync(join(root, 'screenshots'), { recursive: true });
  for (const shot of shots) {
    await send('Page.navigate', { url: BASE + shot.path }, sessionId);
    let ready = false;
    for (let i = 0; i < 60; i++) {
      const r = await send('Runtime.evaluate', { expression: 'document.title + "|" + (window.__shotReady === true)', returnByValue: true }, sessionId);
      const value = r.result?.result?.value || '';
      if (value.startsWith('GTA 6 Trophy Guide') && value.endsWith('|true')) { ready = true; break; }
      await sleep(300);
    }
    if (!ready) throw new Error(`scene ${shot.file} never became ready on the guide page`);
    await sleep(250);
    const shotRes = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72, captureBeyondViewport: false }, sessionId);
    const buf = Buffer.from(shotRes.result.data, 'base64');
    writeFileSync(join(root, 'screenshots', shot.file), buf);
    console.log(`${shot.file}: ${buf.length} bytes`);
    if (buf.length > 262144) throw new Error(`${shot.file} exceeds 262144 bytes`);
  }
  ws.close();
} finally {
  browser.kill(); server.kill();
}

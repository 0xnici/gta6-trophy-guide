// A minimal static file server for the guide's app/ folder, so the entry can
// be tried locally with no build step: `node serve.ts` serves on
// http://localhost:8081 (pass `--port <n>` to change it). Node standard
// library only. It refuses paths that escape app/, answers 404 for anything
// missing, and exists purely as a development convenience.

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));

const args = process.argv.slice(2);
const portFlag = args.indexOf('--port');
const parsed = portFlag === -1 ? 8081 : Number(args[portFlag + 1]);
const port = Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : 8081;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  const filePath = normalize(join(appRoot, pathname));
  if (filePath !== appRoot && !filePath.startsWith(appRoot + sep)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
    'content-length': statSync(filePath).size,
    'cache-control': 'no-store',
  });
  createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(`gta6-trophy-guide: serving app/ at http://localhost:${port}`);
});

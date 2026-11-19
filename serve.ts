// Leonida Ledger — local development server (Node 22, standard library only).
// Serves app/ on http://127.0.0.1:8080 so the guide can be opened in a desktop browser
// with no build step. Port: --port <n> flag wins, then the PORT env var, then 8080.
// Paths are confined to app/: anything that resolves outside it is refused.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));

function pickPort() {
  const argv = process.argv.slice(2);
  const flagAt = argv.indexOf('--port');
  const fromFlag = flagAt === -1 ? NaN : Number(argv[flagAt + 1]);
  const fromEnv = Number(process.env.PORT);
  for (const candidate of [fromFlag, fromEnv, 8080]) {
    if (Number.isInteger(candidate) && candidate > 0 && candidate < 65536) return candidate;
  }
  return 8080;
}

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

const server = createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const filePath = resolve(join(appRoot, '.' + pathname));
  if (filePath !== appRoot && !filePath.startsWith(appRoot + sep)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let length;
  try {
    const stats = statSync(filePath);
    if (!stats.isFile()) throw new Error('not a file');
    length = stats.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': CONTENT_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    'content-length': length,
    'cache-control': 'no-store',
  });
  createReadStream(filePath).pipe(response);
});

const port = pickPort();
server.listen(port, '127.0.0.1', () => {
  console.log(`Leonida Ledger app/ is served at http://127.0.0.1:${port}`);
});

// Minimal local server for trying the guide: `node serve.ts` (PORT env or 8080).
// Serves only files under app/, with the handful of MIME types the app uses.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const port = Number(process.env.PORT) || 8080;
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

createServer((req, res) => {
  let pathPart: string;
  try { pathPart = decodeURIComponent(new URL(req.url ?? '/', 'http://local').pathname); }
  catch { res.writeHead(400).end('bad request'); return; }
  if (pathPart.endsWith('/')) pathPart += 'index.html';
  const target = resolve(join(appRoot, normalize(pathPart)));
  if (target !== appRoot && !target.startsWith(appRoot + sep)) { res.writeHead(403).end('forbidden'); return; }
  try {
    const st = statSync(target);
    if (!st.isFile()) throw new Error('not a file');
    res.writeHead(200, { 'content-type': TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream', 'content-length': st.size, 'cache-control': 'no-store' });
    createReadStream(target).pipe(res);
  } catch { res.writeHead(404).end('not found'); }
}).listen(port, '127.0.0.1', () => console.log(`guide on http://localhost:${port}`));

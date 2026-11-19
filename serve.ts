import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game/', import.meta.url)));
// Decode once and confine every request to a regular file below game/.
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.jpg':'image/jpeg', '.png':'image/png' };
createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    const file = resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!file.startsWith(root + sep) || !statSync(file).isFile()) throw new Error('Missing street');
    res.writeHead(200, { 'content-type':mime[extname(file)] ?? 'application/octet-stream', 'cache-control':'no-store' });
    createReadStream(file).pipe(res);
  } catch { res.writeHead(404).end('Street not found'); }
}).listen(Number(process.env.PORT ?? 8080), '127.0.0.1', () => console.log('SOLMARA / http://localhost:' + (process.env.PORT ?? 8080)));

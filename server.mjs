import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { handleNotesApi } from './notes-api.mjs';

const port = Number(process.env.PORT || 4321);
const distDirectory = path.resolve('dist');
const mimeTypes = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };

createServer(async (request, response) => {
  if (await handleNotesApi(request, response)) return;
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const relativePath = pathname === '/' ? 'index.html' : `${pathname.replace(/^\//, '').replace(/\/$/, '')}/index.html`;
  let filePath = path.resolve(distDirectory, relativePath);
  if (!filePath.startsWith(`${distDirectory}${path.sep}`)) {
    response.writeHead(403).end();
    return;
  }
  try {
    await stat(filePath);
  } catch {
    filePath = path.resolve(distDirectory, pathname.replace(/^\//, ''));
  }
  try {
    await stat(filePath);
    response.setHeader('Content-Type', `${mimeTypes[path.extname(filePath)] || 'application/octet-stream'}; charset=utf-8`);
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Local site: http://localhost:${port}`);
});

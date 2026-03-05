// scripts/dev-hub.mjs
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const HUB_PORT = 5100;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Dev Hub OK');
});

server.listen(HUB_PORT, () => {
  console.log(`Dev Hub running at http://localhost:${HUB_PORT}`);
});

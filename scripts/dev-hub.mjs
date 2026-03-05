// scripts/dev-hub.mjs
import http from 'http';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const HUB_PORT = 5100;
const BASE_PORT = 5173; // main always gets 5173

// --- Worktree discovery ---

function parseWorktrees() {
  const raw = execSync('git worktree list --porcelain', { cwd: REPO_ROOT }).toString();
  const worktrees = [];
  for (const block of raw.trim().split('\n\n')) {
    const wt = {};
    for (const line of block.trim().split('\n')) {
      if (line.startsWith('worktree ')) wt.path = line.slice(9);
      if (line.startsWith('HEAD '))     wt.commit = line.slice(5, 12);
      if (line.startsWith('branch '))   wt.branch = line.slice(7).replace('refs/heads/', '');
      if (line === 'bare') wt.bare = true;
    }
    if (!wt.bare) worktrees.push(wt);
  }
  return worktrees;
}

function isMerged(branch) {
  if (!branch || branch === 'main') return false;
  try {
    execSync(`git merge-base --is-ancestor "${branch}" main`, { cwd: REPO_ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// --- In-memory server state ---
// Map<id, { process: ChildProcess|null, state: 'idle'|'starting'|'ready'|'error' }>
const serverState = new Map();

function buildStatus() {
  const worktrees = parseWorktrees();
  return worktrees.map((wt, i) => {
    const id = String(i);
    const entry = serverState.get(id) ?? { process: null, state: 'idle' };
    return {
      id,
      path:        wt.path,
      branch:      wt.branch ?? '(detached)',
      commit:      wt.commit ?? '???????',
      port:        BASE_PORT + i,
      merged:      isMerged(wt.branch),
      serverState: entry.state,
    };
  });
}

// --- HTTP server ---

function sendJson(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/status') {
    return sendJson(res, buildStatus());
  }
  res.writeHead(404);
  res.end('Not found');
});

server.listen(HUB_PORT, () => {
  console.log(`Dev Hub running at http://localhost:${HUB_PORT}`);
});

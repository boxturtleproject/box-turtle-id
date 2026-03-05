// scripts/dev-hub.mjs
import http from 'http';
import { execSync, spawn } from 'child_process';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const HUB_PORT = 5100;
const BASE_PORT = 5173; // main always gets 5173

function waitForPort(port, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    function attempt() {
      const socket = new net.Socket();
      socket.setTimeout(300);
      socket.on('connect', () => { socket.destroy(); resolve(); });
      socket.on('error',   () => { socket.destroy(); retry(); });
      socket.on('timeout', () => { socket.destroy(); retry(); });
      socket.connect(port, '127.0.0.1');
    }
    function retry() {
      if (Date.now() > deadline) return reject(new Error(`Port ${port} not ready after ${timeoutMs}ms`));
      setTimeout(attempt, 500);
    }
    attempt();
  });
}

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
// Map<path, { process: ChildProcess|null, state: 'idle'|'starting'|'ready'|'error' }>
const serverState = new Map();

function buildStatus() {
  const worktrees = parseWorktrees();
  return worktrees.map((wt, i) => {
    const entry = serverState.get(wt.path) ?? { process: null, state: 'idle' };
    return {
      id:          String(i),
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

  if (req.method === 'POST' && req.url?.startsWith('/api/start/')) {
    const id = req.url.slice('/api/start/'.length);
    const status = buildStatus();
    const wt = status.find(w => w.id === id);
    if (!wt) return sendJson(res, { error: 'not found' }, 404);

    const existing = serverState.get(wt.path);
    if (existing && (existing.state === 'starting' || existing.state === 'ready')) {
      return sendJson(res, { ok: true, state: existing.state });
    }

    serverState.set(wt.path, { process: null, state: 'starting' });
    sendJson(res, { ok: true, state: 'starting' });

    // Spawn vite asynchronously
    const proc = spawn('npm', ['run', 'dev', '--', '--port', String(wt.port)], {
      cwd: wt.path,
      stdio: 'ignore',
      detached: false,
    });
    serverState.set(wt.path, { process: proc, state: 'starting' });

    proc.on('error', () => serverState.set(wt.path, { process: null, state: 'error' }));
    proc.on('exit', (code) => {
      serverState.set(wt.path, { process: null, state: code === 0 ? 'idle' : 'error' });
    });

    waitForPort(wt.port)
      .then(() => {
        const entry = serverState.get(wt.path);
        if (entry && entry.process) serverState.set(wt.path, { ...entry, state: 'ready' });
      })
      .catch(() => {
        serverState.set(wt.path, { process: null, state: 'error' });
      });

    return; // response already sent
  }

  if (req.method === 'POST' && req.url?.startsWith('/api/remove/')) {
    const id = req.url.slice('/api/remove/'.length);
    const status = buildStatus();
    const wt = status.find(w => w.id === id);
    if (!wt) return sendJson(res, { error: 'not found' }, 404);
    if (!wt.merged) return sendJson(res, { error: 'branch not merged into main' }, 400);

    // Kill running server if any
    const entry = serverState.get(wt.path);
    if (entry?.process) entry.process.kill();
    serverState.delete(wt.path);

    try {
      execSync(`git worktree remove --force "${wt.path}"`, { cwd: REPO_ROOT });
      sendJson(res, { ok: true });
    } catch (e) {
      sendJson(res, { error: String(e) }, 500);
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(HUB_PORT, () => {
  console.log(`Dev Hub running at http://localhost:${HUB_PORT}`);
});

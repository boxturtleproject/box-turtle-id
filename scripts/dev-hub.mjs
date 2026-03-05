// scripts/dev-hub.mjs
import http from 'http';
import { execSync, spawn, exec } from 'child_process';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const HUB_PORT = 5100;
const BASE_PORT = 5173; // main always gets 5173

const HUB_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dev Hub</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'DM Mono', ui-monospace, monospace;
    background: #0f0f0f;
    color: #e0e0e0;
    padding: 2rem;
    min-height: 100dvh;
  }
  h1 {
    font-size: 0.7rem;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: #666;
    margin-bottom: 2rem;
  }
  .grid { display: flex; flex-direction: column; gap: 1px; }
  .card {
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .branch { font-size: 0.875rem; flex: 1; min-width: 200px; }
  .commit { font-size: 0.7rem; color: #555; font-family: monospace; }
  .badges { display: flex; gap: 0.5rem; align-items: center; }
  .badge {
    font-size: 0.6rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 0.2rem 0.5rem;
    border-radius: 2px;
    white-space: nowrap;
  }
  .badge.merged   { background: #1a2a1a; color: #4a8a4a; border: 1px solid #2a4a2a; }
  .badge.unmerged { background: #2a1a0a; color: #ca7a2a; border: 1px solid #4a2a0a; }
  .badge.idle     { background: #1e1e1e; color: #555;    border: 1px solid #2a2a2a; }
  .badge.starting { background: #1a1a2a; color: #6a6aaa; border: 1px solid #2a2a4a; }
  .badge.ready    { background: #0a1a2a; color: #4a8aaa; border: 1px solid #1a4a6a; }
  .badge.error    { background: #2a0a0a; color: #aa4a4a; border: 1px solid #4a1a1a; }
  .actions { display: flex; gap: 0.5rem; margin-left: auto; }
  button {
    font-family: inherit;
    font-size: 0.65rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    border: 1px solid #333;
    background: #222;
    color: #bbb;
    padding: 0.3rem 0.75rem;
    cursor: pointer;
    border-radius: 2px;
  }
  button:hover { background: #2a2a2a; border-color: #555; color: #eee; }
  button.primary { border-color: #1a4a6a; color: #4a8aaa; }
  button.primary:hover { background: #0a1a2a; }
  button.danger  { border-color: #4a1a1a; color: #aa4a4a; }
  button.danger:hover  { background: #2a0a0a; }
</style>
</head>
<body>
<h1>Box Turtle ID &mdash; Dev Hub</h1>
<div class="grid" id="root"></div>
<script>
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  async function poll() {
    try {
      const res = await fetch('/api/status');
      render(await res.json());
    } catch {}
  }

  function render(worktrees) {
    document.getElementById('root').innerHTML = worktrees.map(wt => \`
      <div class="card">
        <div class="branch">\${esc(wt.branch)}</div>
        <div class="commit">\${esc(wt.commit)}</div>
        <div class="badges">
          <span class="badge \${wt.merged ? 'merged' : 'unmerged'}">\${wt.merged ? 'merged' : 'unmerged'}</span>
          <span class="badge \${wt.serverState}">\${wt.serverState}</span>
          <span class="badge" style="color:#444;border-color:#222">:\${wt.port}</span>
        </div>
        <div class="actions">
          \${wt.serverState === 'idle' || wt.serverState === 'error'
            ? \`<button class="primary" onclick="start('\${wt.id}')">Start</button>\`
            : ''}
          \${wt.serverState === 'ready'
            ? \`<button class="primary" onclick="window.open('http://localhost:\${wt.port}')">Open</button>\`
            : ''}
          \${wt.merged
            ? \`<button class="danger" onclick="remove('\${wt.id}')">Remove</button>\`
            : ''}
        </div>
      </div>
    \`).join('');
  }

  async function start(id) {
    await fetch('/api/start/' + id, { method: 'POST' });
  }

  async function remove(id) {
    if (!confirm('Remove this worktree? This cannot be undone.')) return;
    await fetch('/api/remove/' + id, { method: 'POST' });
  }

  setInterval(poll, 1500);
  poll();
</script>
</body>
</html>`;

function waitForPort(port, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    function attempt() {
      const socket = new net.Socket();
      socket.setTimeout(300);
      socket.on('connect', () => { socket.destroy(); resolve(); });
      socket.on('error',   () => { socket.destroy(); retry(); });
      socket.on('timeout', () => { socket.destroy(); retry(); });
      socket.connect(port, 'localhost');
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
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(HUB_HTML);
  }

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
  const opener = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${opener} http://localhost:${HUB_PORT}`);
});

process.on('SIGINT', () => {
  console.log('\nShutting down Dev Hub...');
  for (const entry of serverState.values()) {
    if (entry.process) entry.process.kill();
  }
  process.exit(0);
});

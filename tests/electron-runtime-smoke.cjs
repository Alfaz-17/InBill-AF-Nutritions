const http = require('node:http');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { app, BrowserWindow } = require('electron');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.INBILL_SMOKE_PORT || 3466);
const url = `http://localhost:${port}/`;
const nextBin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'next.cmd' : 'next');

let server;

function waitForServer(timeoutMs = 60000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
        } else if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Server responded with ${res.statusCode}`));
        } else {
          setTimeout(attempt, 1000);
        }
      });
      req.on('error', (error) => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(error);
        } else {
          setTimeout(attempt, 1000);
        }
      });
      req.setTimeout(5000, () => req.destroy(new Error('Server request timed out')));
    };
    attempt();
  });
}

function stopServer() {
  if (!server || server.killed) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
  } else {
    server.kill('SIGTERM');
  }
}

async function run() {
  server = spawn(nextBin, ['dev', '-p', String(port)], {
    cwd: root,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });

  let serverOutput = '';
  server.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
  server.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });

  server.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error(serverOutput);
    }
  });

  await waitForServer();
  await app.whenReady();

  const messages = [];
  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) messages.push(`${sourceId}:${line}: ${message}`);
  });
  win.webContents.on('render-process-gone', (_event, details) => {
    messages.push(`Renderer process gone: ${details.reason}`);
  });

  await win.loadURL(url);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const bodyText = await win.webContents.executeJavaScript('document.body.innerText', true);
  const title = await win.webContents.getTitle();
  const fatal = messages.filter((message) => (
    /__webpack_modules__\[moduleId\] is not a function|Runtime TypeError|Unhandled Runtime Error|Failed to compile|ENOENT|Cannot find module/i.test(message)
  ));

  console.log(`Electron runtime title: ${title}`);
  console.log(`Electron runtime body ready: ${/Dashboard|InBill|Executive Overview|Professional ERP/.test(bodyText)}`);
  if (messages.length) {
    console.log('Renderer warnings/errors:');
    for (const message of messages) console.log(` - ${message}`);
  }

  if (fatal.length) {
    throw new Error(`Fatal renderer errors detected:\n${fatal.join('\n')}`);
  }
}

app.on('window-all-closed', (event) => event.preventDefault());

run()
  .then(() => {
    stopServer();
    app.quit();
  })
  .catch((error) => {
    console.error(error);
    stopServer();
    app.quit();
    process.exitCode = 1;
  });

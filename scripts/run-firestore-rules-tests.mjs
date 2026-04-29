#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
const projectId = process.env.GCLOUD_PROJECT || 'kingstonconnect';

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(startPort, attempts = 20) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const candidate = startPort + offset;
    if (await isPortAvailable(candidate)) return candidate;
  }

  throw new Error(`Could not find an open port starting at ${startPort}.`);
}

async function main() {
  const firestorePort = await findAvailablePort(8080);
  const loggingPort = await findAvailablePort(4500);
  const hubPort = await findAvailablePort(4400);
  const uiPort = await findAvailablePort(4000);

  const firebaseConfig = JSON.parse(fs.readFileSync(path.join(cwd, 'firebase.json'), 'utf8'));
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kingstonconnect-rules-'));
  const tempConfigPath = path.join(tempDir, 'firebase.json');
  const rulesSourcePath = path.join(cwd, firebaseConfig.firestore?.rules || 'firestore.rules');
  const indexesSourcePath = path.join(cwd, firebaseConfig.firestore?.indexes || 'firestore.indexes.json');
  const rulesFileName = 'firestore.rules';
  const indexesFileName = 'firestore.indexes.json';

  fs.copyFileSync(rulesSourcePath, path.join(tempDir, rulesFileName));
  if (fs.existsSync(indexesSourcePath)) {
    fs.copyFileSync(indexesSourcePath, path.join(tempDir, indexesFileName));
  }

  firebaseConfig.firestore = {
    ...(firebaseConfig.firestore || {}),
    rules: rulesFileName,
    indexes: indexesFileName,
  };
  firebaseConfig.emulators = {
    ...(firebaseConfig.emulators || {}),
    firestore: {
      ...(firebaseConfig.emulators?.firestore || {}),
      host: '127.0.0.1',
      port: firestorePort,
    },
    logging: {
      ...(firebaseConfig.emulators?.logging || {}),
      host: '127.0.0.1',
      port: loggingPort,
    },
    hub: {
      ...(firebaseConfig.emulators?.hub || {}),
      host: '127.0.0.1',
      port: hubPort,
    },
    ui: {
      ...(firebaseConfig.emulators?.ui || {}),
      enabled: false,
      host: '127.0.0.1',
      port: uiPort,
    },
  };

  fs.writeFileSync(tempConfigPath, JSON.stringify(firebaseConfig, null, 2));

  const command = `${process.execPath} --test tests/firestore.rules.test.mjs`;
  const result = spawnSync(
    'npx',
    ['-y', 'firebase-tools@12.9.1', 'emulators:exec', '--config', tempConfigPath, '--only', 'firestore', command],
    {
      cwd,
      stdio: 'inherit',
      env: {
        ...process.env,
        GCLOUD_PROJECT: projectId,
        FIRESTORE_EMULATOR_HOST: `127.0.0.1:${firestorePort}`,
      },
    }
  );

  fs.rmSync(tempDir, { recursive: true, force: true });

  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});

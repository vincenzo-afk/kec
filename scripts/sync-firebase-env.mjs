#!/usr/bin/env node
/**
 * Syncs `.env.local` with the live Firebase WEB app SDK config.
 *
 * Prereq: `firebase login` must have been run in an interactive terminal.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'kingstonconnect';
const ENV_PATH = path.resolve(process.cwd(), '.env.local');

function runFirebase(args) {
  return execFileSync('firebase', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function parseAppsList(output) {
  // firebase-tools prints a human table by default; `--json` exists on some
  // commands but not all. We fall back to regex extraction.
  //
  // Example rows include:
  //  appId: 1:123:web:abcdef
  const appIds = [];
  for (const line of output.split('\n')) {
    const m = line.match(/appId:\s*([0-9]+:[0-9]+:web:[0-9a-f]+)/i);
    if (m) appIds.push(m[1]);
  }
  return appIds;
}

function parseSdkConfig(output) {
  // apps:sdkconfig WEB prints JSON for web config.
  // It can be either the pure JSON or wrapped with some info lines.
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Could not find JSON SDK config in firebase output.');
  }
  const jsonText = output.slice(start, end + 1);
  return JSON.parse(jsonText);
}

function readEnvFile(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

function upsertEnv(envText, key, value) {
  const safeValue = value == null ? '' : String(value);
  const line = `${key}=${safeValue}`;
  const re = new RegExp(`^${key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}=.*$`, 'm');
  if (re.test(envText)) return envText.replace(re, line);
  const trimmed = envText.replace(/\s*$/s, '');
  return (trimmed ? trimmed + '\n' : '') + line + '\n';
}

function ensureAesKey(envText) {
  if (/^AES_KEY=.{64}\s*$/m.test(envText)) return envText;
  // Generate a new one if missing/invalid.
  const hex = randomBytes(32).toString('hex');
  return upsertEnv(envText, 'AES_KEY', hex);
}

async function main() {
  let envText = readEnvFile(ENV_PATH);

  const appsOut = runFirebase(['apps:list', 'WEB', '--project', PROJECT_ID]);
  const appIds = parseAppsList(appsOut);
  if (!appIds.length) {
    throw new Error(`No Firebase WEB apps found for project "${PROJECT_ID}".`);
  }
  const appId = appIds[0];

  const sdkOut = runFirebase(['apps:sdkconfig', 'WEB', appId]);
  const cfg = parseSdkConfig(sdkOut);

  envText = upsertEnv(envText, 'VITE_FIREBASE_API_KEY', cfg.apiKey);
  envText = upsertEnv(envText, 'VITE_FIREBASE_AUTH_DOMAIN', cfg.authDomain);
  envText = upsertEnv(envText, 'VITE_FIREBASE_PROJECT_ID', cfg.projectId);
  envText = upsertEnv(envText, 'VITE_FIREBASE_STORAGE_BUCKET', cfg.storageBucket);
  envText = upsertEnv(envText, 'VITE_FIREBASE_MESSAGING_SENDER_ID', cfg.messagingSenderId);
  envText = upsertEnv(envText, 'VITE_FIREBASE_APP_ID', cfg.appId);
  if (cfg.measurementId) envText = upsertEnv(envText, 'VITE_FIREBASE_MEASUREMENT_ID', cfg.measurementId);

  // VAPID key is not part of apps:sdkconfig (Firebase console only).
  if (!/^VITE_FIREBASE_VAPID_KEY=/m.test(envText)) {
    envText = upsertEnv(envText, 'VITE_FIREBASE_VAPID_KEY', 'your-vapid-key-here');
  }

  envText = ensureAesKey(envText);

  fs.writeFileSync(ENV_PATH, envText, 'utf8');
  process.stdout.write(`Updated ${path.relative(process.cwd(), ENV_PATH)} using Firebase app ${appId}\n`);
}

main().catch((err) => {
  const msg = `${err?.message || err}`;
  if (msg.includes('Command failed: firebase') || msg.includes('Failed to get Firebase SDK config')) {
    process.stderr.write(
      `${msg}\n\n` +
        'Auth required: run `firebase login` in an interactive terminal, then re-run:\n' +
        '  node scripts/sync-firebase-env.mjs\n'
    );
  } else {
    process.stderr.write(`${msg}\n`);
  }
  process.exit(1);
});

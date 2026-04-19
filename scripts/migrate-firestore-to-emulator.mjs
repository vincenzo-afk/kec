#!/usr/bin/env node
/**
 * Copy Firestore data from a source Firebase project (via service account)
 * into a local Firestore emulator project.
 *
 * Usage:
 *   node scripts/migrate-firestore-to-emulator.mjs --srcCred /path/key.json
 *
 * Optional:
 *   --collections users,announcements
 *   --maxDocs 5000
 *   --listOnly
 *
 * Env:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 (default)
 *   GCLOUD_PROJECT=kingstonconnect (default target projectId for emulator)
 */
import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      args._.push(a);
      continue;
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}

async function listAllDocsInCollection(colRef, limit) {
  // Firestore Admin SDK does not provide cursor pagination without ordering.
  // We use document references list + get in batches to avoid loading all data at once.
  const docRefs = await colRef.listDocuments();
  if (limit != null) return docRefs.slice(0, limit);
  return docRefs;
}

async function copyCollectionRecursive({
  srcDb,
  dstDb,
  srcColPath,
  dstColPath,
  bulkWriter,
  stats,
  maxDocs,
}) {
  const srcCol = srcDb.collection(srcColPath);
  const dstCol = dstDb.collection(dstColPath);

  const remaining = maxDocs == null ? null : Math.max(0, maxDocs - stats.docsCopied);
  if (remaining === 0) return;

  const docRefs = await listAllDocsInCollection(srcCol, remaining);
  for (const srcDocRef of docRefs) {
    if (maxDocs != null && stats.docsCopied >= maxDocs) return;

    const snap = await srcDocRef.get();
    if (!snap.exists) continue;

    const dstDocRef = dstCol.doc(srcDocRef.id);
    bulkWriter.set(dstDocRef, snap.data(), { merge: false });
    stats.docsCopied += 1;

    // Recurse into subcollections under this doc.
    const subcols = await srcDocRef.listCollections();
    for (const subcol of subcols) {
      const childSrcPath = `${srcColPath}/${srcDocRef.id}/${subcol.id}`;
      const childDstPath = `${dstColPath}/${srcDocRef.id}/${subcol.id}`;
      await copyCollectionRecursive({
        srcDb,
        dstDb,
        srcColPath: childSrcPath,
        dstColPath: childDstPath,
        bulkWriter,
        stats,
        maxDocs,
      });
      if (maxDocs != null && stats.docsCopied >= maxDocs) return;
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const srcCredPath = args.srcCred || args.srccred || process.env.SRC_CRED;
  if (!srcCredPath) {
    throw new Error('Missing --srcCred /path/to/serviceAccount.json');
  }

  const absCredPath = path.resolve(process.cwd(), srcCredPath);
  const credJsonPath = fs.existsSync(absCredPath) ? absCredPath : srcCredPath;
  if (!fs.existsSync(credJsonPath)) {
    throw new Error(`Service account JSON not found: ${srcCredPath}`);
  }

  const srcCred = JSON.parse(fs.readFileSync(credJsonPath, 'utf8'));
  if (!srcCred.project_id) {
    throw new Error('Invalid service account JSON (missing project_id).');
  }

  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'kingstonconnect';

  const srcApp = initializeApp(
    { credential: cert(srcCred), projectId: srcCred.project_id },
    'src'
  );
  const srcDb = getFirestore(srcApp);

  // Destination is emulator: auth is not needed, but we still create a named app.
  const dstApp = initializeApp(
    { credential: applicationDefault(), projectId: process.env.GCLOUD_PROJECT },
    'dst'
  );
  const dstDb = getFirestore(dstApp);

  const collections = (args.collections || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const maxDocs = args.maxDocs ? Number(args.maxDocs) : null;
  if (args.maxDocs && (!Number.isFinite(maxDocs) || maxDocs <= 0)) {
    throw new Error('--maxDocs must be a positive number');
  }

  const rootCollections =
    collections.length > 0 ? collections : (await srcDb.listCollections()).map((c) => c.id);

  console.log(`Source project: ${srcCred.project_id}`);
  console.log(`Target emulator project: ${process.env.GCLOUD_PROJECT} (${process.env.FIRESTORE_EMULATOR_HOST})`);
  console.log(`Collections: ${rootCollections.join(', ') || '(none)'}`);
  if (maxDocs != null) console.log(`Max docs: ${maxDocs}`);

  if (args.listOnly || args.listonly) {
    console.log('List-only mode: no data copied.');
    return;
  }

  const bulkWriter = dstDb.bulkWriter();
  bulkWriter.onWriteError((err) => {
    console.warn('BulkWriter error:', err?.message || err);
    // Retry a few transient failures.
    return err.failedAttempts < 3;
  });

  const stats = { docsCopied: 0 };
  for (const colId of rootCollections) {
    await copyCollectionRecursive({
      srcDb,
      dstDb,
      srcColPath: colId,
      dstColPath: colId,
      bulkWriter,
      stats,
      maxDocs,
    });
    if (maxDocs != null && stats.docsCopied >= maxDocs) break;
  }

  await bulkWriter.close();
  console.log(`Done. Copied ${stats.docsCopied} docs into emulator.`);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});

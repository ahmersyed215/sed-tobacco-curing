import {
  type DocumentReference,
  type Firestore,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase/config';

/** Stay under Firestore's 500-op batch limit. */
export const BATCH_OP_LIMIT = 450;

/** How many batches to commit concurrently. */
export const PARALLEL_BATCH_WAVE = 5;

export type BatchProgressCallback = (done: number, total: number) => void;

export type BatchWriteOp =
  | { type: 'delete'; ref: DocumentReference }
  | { type: 'set'; ref: DocumentReference; data: Record<string, unknown> };

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Commit write operations in chunked batches with limited parallelism.
 * Progress reports completed operation count (not batch count).
 */
export async function commitBatchedOps(
  ops: BatchWriteOp[],
  options?: {
    firestore?: Firestore;
    batchSize?: number;
    concurrency?: number;
    onProgress?: BatchProgressCallback;
  },
): Promise<void> {
  if (ops.length === 0) {
    options?.onProgress?.(0, 0);
    return;
  }

  const firestore = options?.firestore ?? db;
  const batchSize = options?.batchSize ?? BATCH_OP_LIMIT;
  const concurrency = options?.concurrency ?? PARALLEL_BATCH_WAVE;
  const onProgress = options?.onProgress;
  const total = ops.length;
  let done = 0;

  const chunks = chunkArray(ops, batchSize);

  for (let i = 0; i < chunks.length; i += concurrency) {
    const wave = chunks.slice(i, i + concurrency);
    const committedSizes = await Promise.all(
      wave.map(async (chunk) => {
        const batch = writeBatch(firestore);
        chunk.forEach((op) => {
          if (op.type === 'delete') {
            batch.delete(op.ref);
          } else {
            batch.set(op.ref, op.data);
          }
        });
        await batch.commit();
        return chunk.length;
      }),
    );
    done += committedSizes.reduce((sum, size) => sum + size, 0);
    onProgress?.(done, total);
  }
}

/**
 * Convenience: delete many document refs via chunked parallel batches.
 */
export async function commitBatchedDeletes(
  refs: DocumentReference[],
  options?: {
    firestore?: Firestore;
    batchSize?: number;
    concurrency?: number;
    onProgress?: BatchProgressCallback;
  },
): Promise<void> {
  return commitBatchedOps(
    refs.map((ref) => ({ type: 'delete' as const, ref })),
    options,
  );
}

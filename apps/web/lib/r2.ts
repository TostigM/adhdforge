/**
 * r2.ts — Cloudflare R2 storage for praise audio (M10).
 * ──────────────────────────────────────────────────────────────────────────────
 * Private bucket, signed URLs only (Inviolable Rule 8 / doc 07 Rule 9):
 *   - playback links expire after 1 hour
 *   - admin review links expire after 30 minutes (doc 06 §10.6)
 * Uploads are server-mediated (AGENTS.md §5.20 D3): the browser never sees
 * bucket credentials and no CORS policy is needed.
 *
 * Object keys: praise/{recipientUserId}/{id}.webm — stored in
 * praise_memos.audio_path verbatim.
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const PLAYBACK_URL_TTL_SECONDS = 60 * 60; // 1 hour
export const REVIEW_URL_TTL_SECONDS = 30 * 60; // 30 minutes (admin review)

let client: S3Client | null = null;

/** Lazy singleton — env is validated at boot (lib/env.ts), read at first use. */
function getR2(): S3Client {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      },
    });
  }
  return client;
}

function bucket(): string {
  return process.env.R2_BUCKET_NAME ?? '';
}

/** Upload praise audio. Throws on failure — callers decide how to surface it. */
export async function putPraiseAudio(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  await getR2().send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }),
  );
}

/** 1-hour signed playback URL for the recipient. */
export function getPlaybackUrl(key: string): Promise<string> {
  return getSignedUrl(getR2(), new GetObjectCommand({ Bucket: bucket(), Key: key }), {
    expiresIn: PLAYBACK_URL_TTL_SECONDS,
  });
}

/** 30-minute signed URL for admin content review — regenerated per access. */
export function getReviewUrl(key: string): Promise<string> {
  return getSignedUrl(getR2(), new GetObjectCommand({ Bucket: bucket(), Key: key }), {
    expiresIn: REVIEW_URL_TTL_SECONDS,
  });
}

/**
 * Best-effort delete (revocation, moderation removal, failed-submit cleanup).
 * Logs and swallows — the DB rows are already gone/committed and a stray
 * object is a cost concern, not a correctness one.
 */
export async function deletePraiseAudio(keys: string[]): Promise<void> {
  for (const key of keys) {
    try {
      await getR2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
    } catch (e) {
      console.error(`[r2] delete failed for ${key} (non-fatal):`, e);
    }
  }
}

/** Test seam. */
export function __setR2ClientForTests(next: unknown): void {
  client = next as S3Client | null;
}

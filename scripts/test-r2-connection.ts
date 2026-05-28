/**
 * scripts/test-r2-connection.ts
 * Validates R2 credentials: uploads then deletes a test file.
 *
 * Run:    pnpm test:r2
 * Needs:  .env.local with R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 *         R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME set
 *         @aws-sdk/client-s3 installed (done in M10)
 */

// NOTE: @aws-sdk/client-s3 is added in M10. Leaving as placeholder.

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

async function main() {
  const accountId = process.env['R2_ACCOUNT_ID'];
  const accessKeyId = process.env['R2_ACCESS_KEY_ID'];
  const secretAccessKey = process.env['R2_SECRET_ACCESS_KEY'];
  const bucketName = process.env['R2_BUCKET_NAME'];

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    console.error('❌ R2 env vars not set. Check .env.local for R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME');
    process.exit(1);
  }

  console.log('Testing Cloudflare R2 connection...');
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const testKey = `connection-test-${Date.now()}.txt`;

  try {
    await client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: 'Focus Forge R2 connection test',
    }));
    console.log('✅ R2 upload works');

    await client.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: testKey,
    }));
    console.log('✅ R2 delete works');
    console.log('✅ R2 connection validated successfully');
  } catch (error) {
    console.error('❌ R2 connection failed:');
    console.error(error);
    process.exit(1);
  }
}

main();

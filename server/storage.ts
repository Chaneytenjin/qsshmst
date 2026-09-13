import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

function normalizeKey(relKey: string) {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function getClient() {
  if (!ENV.storageBucket || !ENV.storageAccessKeyId || !ENV.storageSecretAccessKey) {
    throw new Error("S3 storage is not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY");
  }
  return new S3Client({
    region: ENV.storageRegion,
    endpoint: ENV.storageEndpoint || undefined,
    forcePathStyle: Boolean(ENV.storageEndpoint),
    credentials: { accessKeyId: ENV.storageAccessKeyId, secretAccessKey: ENV.storageSecretAccessKey },
  });
}

function publicUrl(key: string) {
  if (!ENV.storagePublicBaseUrl) return `/storage/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
  return `${ENV.storagePublicBaseUrl.replace(/\/+$/, "")}/${key}`;
}

export async function storagePut(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream") {
  const key = appendHashSuffix(normalizeKey(relKey));
  await getClient().send(new PutObjectCommand({ Bucket: ENV.storageBucket, Key: key, Body: data, ContentType: contentType }));
  return { key, url: publicUrl(key) };
}

export async function storageGet(relKey: string) {
  const key = normalizeKey(relKey);
  return { key, url: publicUrl(key) };
}

export async function storageGetSignedUrl(relKey: string, expiresIn = 900) {
  const key = normalizeKey(relKey);
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: ENV.storageBucket, Key: key }), { expiresIn });
}

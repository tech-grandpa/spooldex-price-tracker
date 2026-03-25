import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readFile } from "node:fs/promises";

function getClient() {
  const endpoint = process.env.R2_ENDPOINT;
  const bucket = process.env.R2_BUCKET;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    bucket,
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "") || null,
    client: new S3Client({
      region: process.env.R2_REGION || "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

export async function cacheRemoteImageToR2(imageUrl: string | null | undefined, key: string) {
  if (!imageUrl) return null;
  const config = getClient();
  if (!config) return imageUrl;

  const response = await fetch(imageUrl);
  if (!response.ok) return imageUrl;

  const body = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const bucketKey = `${key.replace(/^\/+/, "")}`;

  await config.client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: bucketKey,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return config.publicBaseUrl ? `${config.publicBaseUrl}/${bucketKey}` : imageUrl;
}

export async function cacheLocalImageToR2(filePath: string, key: string) {
  const config = getClient();
  if (!config) return null;

  const body = await readFile(filePath);
  const bucketKey = `${key.replace(/^\/+/, "")}`;

  await config.client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: bucketKey,
      Body: body,
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return config.publicBaseUrl ? `${config.publicBaseUrl}/${bucketKey}` : null;
}

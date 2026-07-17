import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";

interface StoredObjectRow {
  content: Uint8Array;
  mimeType: string;
}

@Injectable()
export class ObjectStorageService {
  private readonly bucket = process.env.S3_BUCKET ?? "azez-ai-os";
  private readonly client: S3Client | undefined;
  private fallbackReady: Promise<void> | undefined;

  constructor(private readonly database: DatabaseService) {
    const endpoint = process.env.S3_ENDPOINT?.trim();
    const accessKeyId = process.env.S3_ACCESS_KEY?.trim();
    const secretAccessKey = process.env.S3_SECRET_KEY?.trim();
    const useIam = process.env.S3_USE_IAM === "true";
    const useS3 = useIam || Boolean(accessKeyId && secretAccessKey);
    if (!useS3) return;

    this.client = new S3Client({
      region: process.env.S3_REGION ?? "us-east-1",
      forcePathStyle: Boolean(endpoint),
      ...(endpoint ? { endpoint } : {}),
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
  }

  usesDatabaseFallback(): boolean {
    return !this.client;
  }

  async put(key: string, body: Buffer, mimeType: string, checksum: string): Promise<void> {
    if (this.client) {
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
        Metadata: { sha256: checksum },
        ServerSideEncryption: process.env.S3_SERVER_SIDE_ENCRYPTION === "false" ? undefined : "AES256",
      }));
      return;
    }

    await this.ensureFallbackTable();
    await this.database.client.$executeRaw`
      INSERT INTO "file_objects" ("storage_key", "content", "mime_type", "checksum", "updated_at")
      VALUES (${key}, ${body}, ${mimeType}, ${checksum}, NOW())
      ON CONFLICT ("storage_key") DO UPDATE SET
        "content" = EXCLUDED."content",
        "mime_type" = EXCLUDED."mime_type",
        "checksum" = EXCLUDED."checksum",
        "updated_at" = NOW()
    `;
  }

  async signedDownload(key: string, fileName: string): Promise<string> {
    if (!this.client) throw new Error("SIGNED_DOWNLOAD_UNAVAILABLE_FOR_DATABASE_STORAGE");
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      }),
      { expiresIn: 300 },
    );
  }

  async read(key: string): Promise<{ body: Buffer; mimeType: string } | null> {
    if (this.client) return null;
    await this.ensureFallbackTable();
    const rows = await this.database.client.$queryRaw<StoredObjectRow[]>`
      SELECT "content", "mime_type" AS "mimeType"
      FROM "file_objects"
      WHERE "storage_key" = ${key}
      LIMIT 1
    `;
    const row = rows[0];
    return row ? { body: Buffer.from(row.content), mimeType: row.mimeType } : null;
  }

  async delete(key: string): Promise<void> {
    if (this.client) {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      return;
    }
    await this.ensureFallbackTable();
    await this.database.client.$executeRaw`DELETE FROM "file_objects" WHERE "storage_key" = ${key}`;
  }

  private ensureFallbackTable(): Promise<void> {
    this.fallbackReady ??= this.database.client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "file_objects" (
        "storage_key" VARCHAR(500) PRIMARY KEY,
        "content" BYTEA NOT NULL,
        "mime_type" VARCHAR(160) NOT NULL,
        "checksum" VARCHAR(64) NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).then(() => undefined);
    return this.fallbackReady;
  }
}

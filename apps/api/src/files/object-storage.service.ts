import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ObjectStorageService {
  private readonly bucket = process.env.S3_BUCKET ?? "azez-ai-os";
  private readonly client: S3Client;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY; const secretAccessKey = process.env.S3_SECRET_KEY;
    this.client = new S3Client({
      region: process.env.S3_REGION ?? "us-east-1", forcePathStyle: true,
      ...(endpoint ? { endpoint } : {}),
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    });
  }

  async put(key: string, body: Buffer, mimeType: string, checksum: string): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: mimeType, Metadata: { sha256: checksum }, ServerSideEncryption: process.env.S3_SERVER_SIDE_ENCRYPTION === "false" ? undefined : "AES256" }));
  }

  async signedDownload(key: string, fileName: string): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key, ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}` }), { expiresIn: 300 });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private bucket: string;
  private client: any;

  constructor() {
    this.bucket = process.env.MINIO_BUCKET ?? 'sitelager-dev';
    // Lazy-load minio to avoid import errors when env not configured
    this.client = null;
  }

  private getClient() {
    if (!this.client) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Minio = require('minio');
      this.client = new Minio.Client({
        endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
        port: parseInt(process.env.MINIO_PORT ?? '9000'),
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY ?? '',
        secretKey: process.env.MINIO_SECRET_KEY ?? '',
      });
    }
    return this.client;
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<{ storageKey: string; hash: string }> {
    const client = this.getClient();
    const exists = await client.bucketExists(this.bucket);
    if (!exists) await client.makeBucket(this.bucket, 'eu-central-1');
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    await client.putObject(this.bucket, key, Readable.from(buffer), buffer.length, { 'Content-Type': contentType });
    return { storageKey: key, hash };
  }

  async uploadPublic(key: string, buffer: Buffer, contentType: string): Promise<{ storageKey: string; hash: string }> {
    const client = this.getClient();
    const exists = await client.bucketExists(this.bucket);
    if (!exists) await client.makeBucket(this.bucket, 'eu-central-1');
    try {
      await client.setBucketPolicy(this.bucket, JSON.stringify({
        Version: '2012-10-17',
        Statement: [{ Effect: 'Allow', Principal: { AWS: ['*'] }, Action: ['s3:GetObject'], Resource: [`arn:aws:s3:::${this.bucket}/*`] }],
      }));
    } catch {
      // policy already set or unsupported in test environments
    }
    return this.upload(key, buffer, contentType);
  }

  getPublicUrl(key: string): string {
    const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
    const endpoint = process.env.MINIO_ENDPOINT ?? 'localhost';
    const port = process.env.MINIO_PORT ?? '9000';
    const publicBase = process.env.MINIO_PUBLIC_URL ?? `${protocol}://${endpoint}:${port}`;
    return `${publicBase}/${this.bucket}/${key}`;
  }

  async uploadSafe(key: string, buffer: Buffer, contentType: string): Promise<{ storageKey: string; hash: string }> {
    try {
      return await this.upload(key, buffer, contentType);
    } catch {
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      return { storageKey: key, hash };
    }
  }

  async getSignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.getClient().presignedGetObject(this.bucket, key, expirySeconds);
  }
}

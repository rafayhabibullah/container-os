import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ttlMs = 24 * 60 * 60 * 1000;

function hashBody(body: unknown) {
  return crypto.createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex');
}

export async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!['POST', 'PATCH', 'DELETE'].includes(req.method)) return next();
  if (req.path.includes('/webhooks/')) return next();

  const key = req.header('Idempotency-Key');
  if (!key) {
    res.setHeader('X-Idempotency-Warning', 'missing');
    return next();
  }

  const bodyHash = hashBody(req.body);
  const now = Date.now();
  const expiresAt = new Date(now + ttlMs);
  const path = req.originalUrl;

  await (prisma as any).idempotencyRecord.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }).catch(() => undefined);
  const existing = await (prisma as any).idempotencyRecord.findUnique({
    where: { key_method_path: { key, method: req.method, path } },
  }).catch(() => null);

  if (existing && existing.requestHash !== bodyHash) {
    return res.status(409).json({
      error: {
        code: 'IDEMPOTENCY_KEY_REUSED',
        message: 'Idempotency-Key was already used with a different request body.',
      },
    });
  }

  if (existing?.status === 'completed' && existing.responseStatus && existing.responseBody !== null) {
    return res.status(existing.responseStatus).json(existing.responseBody);
  }

  const record = existing ?? await (prisma as any).idempotencyRecord.create({
    data: { key, method: req.method, path, requestHash: bodyHash, expiresAt },
  });

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode < 500) {
      void (prisma as any).idempotencyRecord.update({
        where: { id: record.id },
        data: { status: 'completed', responseStatus: res.statusCode, responseBody: body as any },
      }).catch(() => undefined);
    }
    return originalJson(body);
  }) as typeof res.json;
  return next();
}

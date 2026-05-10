import { describe, it, expect, vi } from 'vitest';
import { TemplateRendererService } from './template-renderer.service';

const mockPrisma = { notificationTemplate: { findFirst: vi.fn() } };
const service = new TemplateRendererService(mockPrisma as any);

describe('TemplateRendererService', () => {
  it('renders German template with variable substitution', async () => {
    mockPrisma.notificationTemplate.findFirst.mockResolvedValue({ channel: 'email', locale: 'de', eventType: 'invoice.overdue', subject: 'Rechnung {{number}} überfällig', body: 'Sehr geehrte/r {{name}},' });
    const result = await service.render('email', 'de', 'invoice.overdue', { number: 'INV-001', name: 'Anna' });
    expect(result.subject).toBe('Rechnung INV-001 überfällig');
    expect(result.body).toContain('Anna');
  });

  it('falls back to English when German template not found', async () => {
    mockPrisma.notificationTemplate.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ channel: 'email', locale: 'en', eventType: 'invoice.overdue', subject: 'Invoice {{number}} overdue', body: 'Dear {{name}},' });
    const result = await service.render('email', 'de', 'invoice.overdue', { number: 'INV-001', name: 'John' });
    expect(result.subject).toContain('INV-001');
  });

  it('throws when no template found in any locale', async () => {
    mockPrisma.notificationTemplate.findFirst.mockResolvedValue(null);
    await expect(service.render('email', 'de', 'nonexistent.event', {})).rejects.toThrow();
  });
});

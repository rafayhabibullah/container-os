'use client';

import { useRouter } from 'next/navigation';
import { clientFetch } from '@/lib/client-api';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  reviewerName: string | null;
  status: string;
  createdAt: string;
  listing?: { title: string; slug: string };
}

export default function ReviewModeration({ orgId, reviews }: { orgId: string; reviews: Review[] }) {
  const router = useRouter();

  async function moderate(reviewId: string, status: 'published' | 'hidden' | 'rejected') {
    await clientFetch(`/v1/organisations/${orgId}/listings/reviews/${reviewId}/moderate`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  if (reviews.length === 0) return null;

  return (
    <section style={{ marginTop: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #e2e8f0' }}>
        <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Marketplace reviews</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1px', background: '#e2e8f0' }}>
        {reviews.slice(0, 12).map((review) => (
          <article key={review.id} style={{ background: '#ffffff', padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '14px' }}>
            <div>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{review.rating}/5 · {review.title ?? review.listing?.title ?? 'Review'}</p>
              {review.body && <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>{review.body}</p>}
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#94a3b8' }}>{review.reviewerName ?? 'Tenant'} · {review.status}</p>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {(['published', 'hidden', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => moderate(review.id, status)}
                  disabled={review.status === status}
                  style={{ border: '1px solid #e2e8f0', background: review.status === status ? '#f1f5f9' : '#ffffff', borderRadius: '6px', padding: '6px 9px', fontSize: '12px', fontWeight: 700, color: '#475569', cursor: review.status === status ? 'default' : 'pointer' }}
                >
                  {status}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

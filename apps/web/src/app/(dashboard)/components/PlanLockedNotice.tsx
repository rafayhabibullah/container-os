import Link from 'next/link';

export default function PlanLockedNotice({
  title,
  body,
  requiredPlan = 'Professional',
}: {
  title: string;
  body: string;
  requiredPlan?: string;
}) {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
      padding: '28px',
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: '20px',
      alignItems: 'center',
    }}>
      <div>
        <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#64748b', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {requiredPlan} feature
        </p>
        <h2 style={{ margin: '0 0 8px', fontSize: '20px', color: '#0f172a', fontWeight: 800, letterSpacing: '-0.01em' }}>
          {title}
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: 1.6, maxWidth: '680px' }}>
          {body}
        </p>
      </div>
      <Link href="/billing?plan=professional&interval=monthly" style={{
        background: '#0f172a',
        color: '#ffffff',
        borderRadius: '8px',
        padding: '10px 16px',
        fontSize: '13px',
        fontWeight: 800,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}>
        Upgrade plan
      </Link>
    </div>
  );
}

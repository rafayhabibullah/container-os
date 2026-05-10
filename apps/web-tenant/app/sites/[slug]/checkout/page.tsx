'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@container-os/ui';

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h3 className="font-semibold mb-3">{title}</h3>{children}</div>;
}

export default function CheckoutPage({ params }: { params: { slug: string } }) {
  const searchParams = useSearchParams();
  const unitTypeId = searchParams.get('unitTypeId') ?? '';
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const steps = [
    <Step key="size" title="Einheit"><p className="text-gray-600">Einheit {unitTypeId} ausgewählt.</p></Step>,
    <Step key="price" title="Preisübersicht">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span>Monatsmiete</span><span>149,00 €</span></div>
        <div className="flex justify-between"><span>MwSt. 19%</span><span>28,31 €</span></div>
        <div className="flex justify-between"><span>Kaution</span><span>149,00 €</span></div>
        <div className="flex justify-between font-semibold border-t pt-2"><span>Heute fällig</span><span>326,31 €</span></div>
      </div>
    </Step>,
    <Step key="customer" title="Ihre Daten">
      <div className="space-y-3">
        <div><label className="block text-sm font-medium mb-1">Name</label><input className="w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className="block text-sm font-medium mb-1">E-Mail</label><input type="email" className="w-full border rounded px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      </div>
    </Step>,
    <Step key="payment" title="Zahlung"><p className="text-gray-600">SEPA-Lastschrift oder Kreditkarte. Stripe-Integration folgt.</p></Step>,
    <Step key="confirm" title="Bestätigung">
      <div className="text-center py-4">
        <div className="text-4xl mb-2">✓</div>
        <h3 className="text-lg font-semibold">Buchung bestätigt!</h3>
        <p className="text-gray-600 mt-2">Sie erhalten in Kürze eine E-Mail mit Ihrem Mietvertrag.</p>
      </div>
    </Step>,
  ];

  const stepLabels = ['Einheit', 'Preisübersicht', 'Ihre Daten', 'Zahlung', 'Bestätigung'];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Online einmieten</h1>
      <div className="flex items-center mb-8">
        {stepLabels.map((label, i) => (
          <div key={i} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${i <= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{i + 1}</div>
            <span className="ml-2 text-sm text-gray-600 hidden sm:inline">{label}</span>
            {i < stepLabels.length - 1 && <div className="mx-3 h-px w-8 bg-gray-300" />}
          </div>
        ))}
      </div>
      <Card className="max-w-xl">
        <CardHeader><CardTitle>{stepLabels[step]}</CardTitle></CardHeader>
        <CardContent>
          {steps[step]}
          <div className="flex justify-between mt-6">
            {step > 0 && <Button variant="outline" onClick={() => setStep((s) => s - 1)}>Zurück</Button>}
            {step < steps.length - 1 && <Button className="ml-auto" onClick={() => setStep((s) => s + 1)}>Weiter</Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

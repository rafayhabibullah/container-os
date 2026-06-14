'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/lib/i18n';

export default function TenantRegisterPage() {
  const router = useRouter();
  const t = useT();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const password = form.get('password') as string;
    const confirm = form.get('confirmPassword') as string;
    if (password !== confirm) {
      setError(t('myStorage.register.errorPasswordsDontMatch'));
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? t('myStorage.register.errorRegistrationFailed'));
      router.push('/my-storage');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('myStorage.register.errorRegistrationFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
            <span className="text-white font-bold text-base">S</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{t('myStorage.register.title')}</h1>
          <p className="text-sm text-slate-400 mt-1">{t('myStorage.register.subtitle')}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('myStorage.register.fullNameLabel')}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                maxLength={100}
                autoComplete="name"
                placeholder="Max Mustermann"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('myStorage.register.emailLabel')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                maxLength={255}
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('myStorage.register.passwordLabel')}{' '}
                <span className="text-slate-400 font-normal">{t('myStorage.register.passwordHint')}</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('myStorage.register.confirmPasswordLabel')}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>

            {error && (
              <p role="alert" className="text-red-600 text-sm">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg disabled:opacity-50 transition-colors text-sm"
            >
              {loading ? t('myStorage.register.creatingAccount') : t('myStorage.register.createAccount')}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-400 mt-6">
          {t('myStorage.register.alreadyHaveAccount')}{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            {t('myStorage.register.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}

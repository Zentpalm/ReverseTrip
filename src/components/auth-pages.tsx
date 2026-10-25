'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ArrowRight, Compass, CalendarDays, Ticket } from 'lucide-react';
import { api, useApp } from './providers';
import { ErrorBox, PageTitle, Guard } from './ui';
import { registerSchema, loginSchema } from '@/lib/validation';
import type { User } from '@/lib/types';
export function AuthPage({ register = false }: { register?: boolean }) {
  const { t, l, error, authenticate } = useApp(),
    router = useRouter(),
    params = useSearchParams(),
    [err, setErr] = useState(''),
    [busy, setBusy] = useState(false);
  const requested = params.get('next') || '/my-trip',
    next = /^\/(?!\/)/.test(requested) && !requested.includes('\\') ? requested : '/my-trip';
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    const d = new FormData(e.currentTarget),
      payload = {
        name: d.get('name'),
        email: d.get('email'),
        password: d.get('password'),
        consent: d.get('consent') === 'on',
      };
    if (register && d.get('confirmPassword') !== payload.password) {
      setErr(t('passwordMismatch'));
      return;
    }
    if (!(register ? registerSchema : loginSchema).safeParse(payload).success) {
      setErr(t('invalid_input'));
      return;
    }
    setBusy(true);
    try {
      const { user } = await api<{ user: User }>(
        register ? 'auth/register' : 'auth/login',
        'POST',
        payload,
      );
      await authenticate(user);
      router.push(next);
    } catch (e) {
      setErr(error(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container auth-page">
      <section className="auth-story">
        <img src="/images/login-scene.webp" alt="" />
        <div>
          <div className="eyebrow">EXPERIENCES WORTH FINDING</div>
          <h1>
            Discover Local.
            <br />
            Plan Smarter.
            <br />
            <em>Experience More.</em>
          </h1>
          <p>{t('authCopy')}</p>
          <div className="auth-benefits">
            <span>
              <Compass />
              {t('how1')}
            </span>
            <span>
              <CalendarDays />
              {t('how2')}
            </span>
            <span>
              <Ticket />
              {t('how3')}
            </span>
          </div>
        </div>
      </section>
      <section className="auth-form">
        <div className="auth-tabs">
          <Link
            className={!register ? 'active' : ''}
            href={'/login?next=' + encodeURIComponent(next)}
          >
            {t('login')}
          </Link>
          <Link
            className={register ? 'active' : ''}
            href={'/register?next=' + encodeURIComponent(next)}
          >
            {t('register')}
          </Link>
        </div>
        <h2>{t(register ? 'registerTitle' : 'authTitle')}</h2>
        <form noValidate onSubmit={submit}>
          <ErrorBox message={err} />
          {register && (
            <label className="field">
              {t('name')}
              <input name="name" autoComplete="name" required minLength={2} maxLength={100} />
            </label>
          )}
          <label className="field">
            {t('email')}
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="you@example.com"
            />
          </label>
          <label className="field">
            {t('password')}
            <input
              name="password"
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              required
              minLength={register ? 10 : 1}
              maxLength={128}
              placeholder={register ? t('passwordHint') : ''}
            />
          </label>
          {register && (
            <>
              <label className="field">
                {t('confirmPassword')}
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  maxLength={128}
                />
              </label>
              <label className="check-line long">
                <input type="checkbox" name="consent" required />
                <span>
                  {t('signupConsent')}{' '}
                  <Link className="text-link" href="/privacy">
                    {t('privacy')}
                  </Link>
                </span>
              </label>
            </>
          )}
          <button className="btn full" disabled={busy}>
            {t(busy ? 'working' : register ? 'register' : 'login')}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="auth-note">{!register && t('forgotNote')}</p>
        <p className="small">
          {l('เป็นผู้จัดกิจกรรม? สมัครบัญชีแล้ว', 'An organizer? Create an account, then')}{' '}
          <Link className="text-link" href="/community/register">
            {t('join')}
          </Link>
        </p>
      </section>
    </div>
  );
}
export function Profile() {
  const { user, t, authenticate, error } = useApp(),
    [err, setErr] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <div className="container page">
      <PageTitle title={t('profile')} />
      <Guard>
        <form
          noValidate
          className="panel profile-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const name = new FormData(e.currentTarget).get('name');
            try {
              const { user: u } = await api<{ user: User }>('profile', 'PATCH', { name });
              await authenticate(u);
              setErr('');
            } catch (e) {
              setErr(error(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <ErrorBox message={err} />
          <label className="field">
            {t('name')}
            <input
              name="name"
              key={user?.id}
              defaultValue={user?.name}
              required
              minLength={2}
              maxLength={100}
            />
          </label>
          <label className="field">
            {t('email')}
            <input value={user?.email || ''} readOnly />
          </label>
          <p className="small muted">{t('forgotNote')}</p>
          <button className="btn" disabled={busy} style={{ marginTop: 20 }}>
            {t(busy ? 'working' : 'save')}
          </button>
        </form>
      </Guard>
    </div>
  );
}

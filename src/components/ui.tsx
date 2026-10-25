'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Clock, MapPin, Compass, LoaderCircle } from 'lucide-react';
import type { Activity } from '@/lib/types';
import { localized } from '@/lib/i18n';
import { money, tripTotals } from '@/lib/pricing';
import { useApp } from './providers';
import type { ReactNode } from 'react';
export function PageTitle({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow?: string;
  title: string;
  copy?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {copy && <p>{copy}</p>}
      </div>
      {action}
    </div>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow?: string;
  title: string;
  copy?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
        {copy && <p>{copy}</p>}
      </div>
      {action}
    </div>
  );
}
export function ActivityCard({
  activity: a,
  group = false,
}: {
  activity: Activity;
  group?: boolean;
}) {
  const { t, locale } = useApp();
  return (
    <article className="activity-card">
      <Link
        href={`/activities/${a.id}${group ? '?group=1' : ''}`}
        className="card-photo"
        tabIndex={-1}
        aria-hidden="true"
      >
        <img src={a.image} alt="" loading="lazy" />
        <span className="location-chip">
          <MapPin size={13} />
          {a.province}
        </span>
        {a.demo === 1 && <span className="sample-chip">{t('sample')}</span>}
      </Link>
      <div className="card-body">
        <div className="card-meta">
          <span>{t(a.category)}</span>
          <span>
            <Clock size={13} />
            {a.duration_minutes / 60} {t('hours')}
          </span>
        </div>
        <h3>
          <Link href={`/activities/${a.id}${group ? '?group=1' : ''}`}>{localized(a, locale)}</Link>
        </h3>
        <p className="host-line">
          <span className="avatar">{a.host_name.charAt(0)}</span>
          {a.host_name}
        </p>
        <div className="card-bottom">
          <div>
            <span className="small muted">{t('from')} </span>
            <strong className="price">{money(a.price_satang, locale)}</strong>
            <span className="small muted"> {t('perPerson')}</span>
          </div>
          <Link className="btn btn-small" href={`/activities/${a.id}${group ? '?group=1' : ''}`}>
            {t(group ? 'joinGroup' : 'details')}
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function Empty({
  title,
  copy,
  action,
}: {
  title: string;
  copy?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty panel">
      <span className="empty-icon">
        <Compass size={36} />
      </span>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
      {action}
    </div>
  );
}
export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div className="error-box" role="alert">
      {message}
    </div>
  ) : null;
}
export function Loading() {
  const { t } = useApp();
  return (
    <div className="loading">
      <LoaderCircle className="spin" />
      {t('loading')}
    </div>
  );
}
export function PriceSummary({ children }: { children?: ReactNode }) {
  const { trip, catalog, locale, t } = useApp(),
    total = tripTotals(trip, catalog.activities, catalog.discounts);
  return (
    <aside className="panel price-summary">
      <h3>{t('summary')}</h3>
      <p className="muted small">
        {trip.items.length} {t('activityCount')} · {t('noPayments')}
      </p>
      <div className="price-row">
        <span>{t('subtotal')}</span>
        <b>{money(total.subtotalSatang, locale)}</b>
      </div>
      <div className="price-row discount">
        <span>
          {t('bundle')} ({total.rateBps / 100}%)
        </span>
        <b>−{money(total.discountSatang, locale)}</b>
      </div>
      <div className="total-row">
        <span>{t('total')}</span>
        <strong>{money(total.totalSatang, locale)}</strong>
      </div>
      <p className="small muted">
        {t(catalog.discounts.enabled ? 'discountTerms' : 'promotionsOff')}
      </p>
      {children}
      <div className="notice-box small">{t('bundleCopy')}</div>
    </aside>
  );
}
export function Guard({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user, authReady, t } = useApp(),
    path = usePathname();
  if (!authReady) return <Loading />;
  if (!user)
    return (
      <Empty
        title={t('unauthorized')}
        action={
          <Link className="btn" href={'/login?next=' + encodeURIComponent(path)}>
            {t('login')}
            <ArrowRight size={16} />
          </Link>
        }
      />
    );
  if (roles && !roles.includes(user.role)) return <Empty title={t('forbidden')} />;
  return children;
}

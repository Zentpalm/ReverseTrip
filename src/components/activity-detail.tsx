'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Clock,
  Users,
  ShieldCheck,
  Check,
  CalendarDays,
} from 'lucide-react';
import { useApp } from './providers';
import { Empty, ErrorBox } from './ui';
import { money } from '@/lib/pricing';
import { dateLabel, localized, timeLabel } from '@/lib/i18n';
export function ActivityDetail({ id }: { id: string }) {
  const { catalog, t, l, locale, trip, add } = useApp(),
    router = useRouter(),
    params = useSearchParams(),
    group = params.get('group') === '1';
  const [now] = useState(Date.now);
  const a = catalog.activities.find((a) => a.id === id);
  const available =
    a?.sessions.filter(
      (s) =>
        s.status === 'open' &&
        Date.parse(s.starts_at) > now &&
        s.capacity - s.reserved > 0 &&
        (!group || s.group_mode),
    ) || [];
  const [sessionId, setSessionId] = useState(
      available.find(
        (s) =>
          s.starts_at.slice(0, 10) >= trip.startDate && s.starts_at.slice(0, 10) <= trip.endDate,
      )?.id ||
        available[0]?.id ||
        '',
    ),
    [participants, setParticipants] = useState(trip.travelers),
    [error, setError] = useState('');
  if (!a)
    return (
      <div className="container page">
        <Empty
          title={t('not_found')}
          action={
            <Link className="btn" href="/activities">
              {t('explore')}
            </Link>
          }
        />
      </div>
    );
  const session = available.find((s) => s.id === sessionId),
    inTrip = trip.items.some((i) => i.activityId === a.id),
    gallery = a.images.length > 1 ? a.images : [a.image];
  function submit() {
    if (
      !session ||
      participants < a!.min_participants ||
      participants > a!.max_participants ||
      participants > session.capacity - session.reserved
    ) {
      setError(t('invalid_participants'));
      return;
    }
    setError('');
    if (group) {
      router.push(`/booking/summary?group=${a!.id}&session=${sessionId}&people=${participants}`);
    } else {
      add(a!.id, sessionId, participants);
    }
  }
  return (
    <div className="container page detail-page">
      <Link className="back-link" href={group ? '/group-activities' : '/activities'}>
        <ArrowLeft size={15} />
        {t('explore')}
      </Link>
      <div className="detail-heading">
        <div>
          <div className="eyebrow">{t(a.category)}</div>
          <h1>{localized(a, locale)}</h1>
          <p className="inline-meta">
            <span>
              <MapPin size={16} />
              {a.province}
            </span>
            <span>
              {t('hostedBy')} {a.host_name}
            </span>
            {a.demo === 1 && <span className="badge">{t('sample')}</span>}
          </p>
        </div>
      </div>
      <div className={`detail-gallery ${gallery.length === 1 ? 'single' : ''}`}>
        {gallery.slice(0, 5).map((src, i) => (
          <img
            key={src}
            src={src}
            alt={i === 0 ? localized(a, locale) : l('บรรยากาศกิจกรรม', 'Experience setting')}
            loading={i ? 'lazy' : 'eager'}
          />
        ))}
      </div>
      <div className="detail-layout">
        <div className="detail-content">
          <div className="host-profile panel">
            <span className="avatar large">{a.host_name.charAt(0)}</span>
            <div>
              <h3>{a.host_name}</h3>
              <p>
                {a.demo ? t('sample') : t('verified')} · {a.province}
              </p>
            </div>
          </div>
          <div className="facts-grid">
            <div>
              <Clock />
              <strong>
                {a.duration_minutes / 60} {t('hours')}
              </strong>
              <span>{l('ระยะเวลากิจกรรม', 'Activity duration')}</span>
            </div>
            <div>
              <Users />
              <strong>
                {a.min_participants}–{a.max_participants}
              </strong>
              <span>{t('participants')}</span>
            </div>
            <div>
              <ShieldCheck />
              <strong>
                {a.min_age}+ {t('years')}
              </strong>
              <span>{t('minAge')}</span>
            </div>
            <div>
              <CalendarDays />
              <strong>{available.length}</strong>
              <span>{t('sessions')}</span>
            </div>
          </div>
          <section className="content-section">
            <h2>{t('about')}</h2>
            <p>{locale === 'th' ? a.description_th : a.description_en}</p>
          </section>
          <div className="detail-info-grid">
            <section className="panel">
              <h3>
                <Check size={19} />
                {t('included')}
              </h3>
              <p>{locale === 'th' ? a.included_th : a.included_en}</p>
            </section>
            <section className="panel">
              <h3>
                <ShieldCheck size={19} />
                {t('safety')}
              </h3>
              <p>{locale === 'th' ? a.safety_th : a.safety_en}</p>
            </section>
          </div>
          <section className="content-section">
            <h2>{t('cancellation')}</h2>
            <p>{locale === 'th' ? a.cancellation_th : a.cancellation_en}</p>
          </section>
        </div>
        <aside className="panel booking-card">
          <div className="detail-price">
            <strong>{money(a.price_satang, locale)}</strong>
            <span>{t('perPerson')}</span>
          </div>
          <span className="badge">{group ? t('groupSession') : t('noPayments')}</span>
          <label className="field">
            {t('chooseSession')}
            <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
              {!available.length && <option>{t('noSessions')}</option>}
              {available.map((s) => (
                <option value={s.id} key={s.id}>
                  {dateLabel(s.starts_at, locale)} · {timeLabel(s.starts_at)}–{timeLabel(s.ends_at)}{' '}
                  ({s.capacity - s.reserved})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t('participants')}
            <input
              type="number"
              min={a.min_participants}
              max={Math.min(a.max_participants, session ? session.capacity - session.reserved : 0)}
              value={participants}
              onChange={(e) => setParticipants(Number(e.target.value))}
            />
          </label>
          {session && (
            <p className="small cyan">
              {session.capacity - session.reserved} {t('places')}
            </p>
          )}
          <div className="price-row">
            <span>
              {money(a.price_satang, locale)} × {participants}
            </span>
            <b>{money(a.price_satang * participants, locale)}</b>
          </div>
          <ErrorBox message={error} />
          <button className="btn full" disabled={!session || (!group && inTrip)} onClick={submit}>
            {group ? t('joinGroup') : inTrip ? t('added') : t('addTrip')}
            <ArrowRight size={16} />
          </button>
          {inTrip && !group && (
            <Link className="btn btn-outline full" href="/my-trip">
              {t('myTrip')}
            </Link>
          )}
          <p className="small muted">{t('recordedCapacity')}</p>
          <div className="notice-box small">{group ? t('groupSafety') : t('bundleCopy')}</div>
        </aside>
      </div>
    </div>
  );
}

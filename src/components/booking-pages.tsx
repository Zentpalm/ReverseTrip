'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle, LockKeyhole, Ticket } from 'lucide-react';
import { api, useApp } from './providers';
import { Empty, ErrorBox, Loading, PageTitle, Guard } from './ui';
import { money } from '@/lib/pricing';
import { localized, dateLabel, timeLabel } from '@/lib/i18n';
import { emptyTrip } from '@/lib/trip';
import type { Booking, Plan, Totals, Trip } from '@/lib/types';
export function BookingSummary() {
  const { trip, catalog, user, t, l, locale, error } = useApp(),
    params = useSearchParams(),
    group = params.get('group'),
    sessionId = params.get('session'),
    people = Number(params.get('people')) || 1;
  const bookingTrip = useMemo<Trip>(() => {
    if (!group) return trip;
    const a = catalog.activities.find((a) => a.id === group),
      s = a?.sessions.find((s) => s.id === sessionId);
    return {
      ...emptyTrip(),
      name: a ? localized(a, locale) : '',
      destination: a?.province || '',
      startDate: s?.starts_at.slice(0, 10) || '',
      endDate: s?.starts_at.slice(0, 10) || '',
      travelers: people,
      items: [{ activityId: group, sessionId: sessionId || '', participants: people }],
    };
  }, [group, sessionId, people, trip, catalog.activities, locale]);
  const [quoteState, setQuoteState] = useState<{
      key: string;
      value: { totals: Totals; plan: Plan };
    } | null>(null),
    [err, setErr] = useState(''),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(''),
    key = useRef('');
  const encoded = JSON.stringify(bookingTrip),
    quote = quoteState?.key === encoded ? quoteState.value : null;
  useEffect(() => {
    let stale = false;
    if (bookingTrip.items.length)
      api<{ totals: Totals; plan: Plan }>('quote', 'POST', JSON.parse(encoded))
        .then((r) => {
          if (!stale) {
            setQuoteState({ key: encoded, value: r });
            setErr('');
          }
        })
        .catch((e) => {
          if (!stale) setErr(error(e));
        });
    return () => {
      stale = true;
    };
    // One quote for each immutable trip snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encoded]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr('');
    if (!key.current) key.current = crypto.randomUUID();
    const d = new FormData(e.currentTarget);
    try {
      const r = await api<{ id: string }>('bookings', 'POST', {
        trip: bookingTrip,
        contactName: d.get('contactName'),
        contactEmail: d.get('contactEmail'),
        contactPhone: d.get('contactPhone'),
        consent: d.get('consent') === 'on',
        requestKey: key.current,
        kind: group ? 'group' : 'trip',
      });
      setSent(r.id);
    } catch (e) {
      setErr(error(e));
      key.current = '';
    } finally {
      setBusy(false);
    }
  }
  if (sent)
    return (
      <div className="container page success-hero">
        <CheckCircle />
        <h1>{t('requestSent')}</h1>
        <p>{t('noPayments')}</p>
        <p className="small muted">
          {l('หมายเลขคำขอ', 'Request reference')}: {sent}
        </p>
        <Link className="btn" href="/my-bookings">
          {t('bookings')}
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  const next = '/booking/summary' + (params.toString() ? '?' + params.toString() : '');
  return (
    <div className="container page">
      <div className="checkout-steps">
        <span>
          <b>1</b>
          {t('myTrip')}
        </span>
        <ArrowRight size={15} />
        <span>
          <b>2</b>
          {t('planner')}
        </span>
        <ArrowRight size={15} />
        <span className="active">
          <b>3</b>
          {t('summary')}
        </span>
      </div>
      <PageTitle
        eyebrow="YOUR JOURNEY, ONE REQUEST AWAY"
        title={t('bookingTitle')}
        copy={t('noPayments')}
      />
      {!bookingTrip.items.length ? (
        <Empty
          title={t('emptyTrip')}
          action={
            <Link href="/activities" className="btn">
              {t('explore')}
            </Link>
          }
        />
      ) : (
        <form noValidate onSubmit={submit} className="two-column">
          <section>
            <div className="panel">
              <h2 style={{ fontSize: 22 }}>{bookingTrip.name || t('tripDefault')}</h2>
              <p className="small muted">
                {bookingTrip.startDate && dateLabel(bookingTrip.startDate, locale)} –{' '}
                {bookingTrip.endDate && dateLabel(bookingTrip.endDate, locale)}
              </p>
              {bookingTrip.items.map((item) => {
                const a = catalog.activities.find((a) => a.id === item.activityId),
                  s = a?.sessions.find((s) => s.id === item.sessionId);
                return a ? (
                  <article key={a.id} className="booking-list-item">
                    <img src={a.image} alt="" />
                    <div>
                      <h3>{localized(a, locale)}</h3>
                      <p>{a.host_name}</p>
                      <p>
                        {s ? dateLabel(s.starts_at, locale, true) : t('missing_session')} ·{' '}
                        {item.participants} {t('participants')}
                      </p>
                      <div className="row-between">
                        <span className="status status-pending">
                          {l('ยังไม่ได้ส่งคำขอ', 'Not yet requested')}
                        </span>
                        <b>{money(a.price_satang * item.participants, locale)}</b>
                      </div>
                    </div>
                  </article>
                ) : (
                  <ErrorBox key={item.activityId} message={t('activity_unavailable')} />
                );
              })}
            </div>
            <div className="panel contact-form">
              <h2>{t('contact')}</h2>
              <div className="form-grid" key={user?.id || 'guest'}>
                <label className="field span-two">
                  {t('name')}
                  <input
                    required
                    name="contactName"
                    defaultValue={user?.name}
                    autoComplete="name"
                    minLength={2}
                    maxLength={100}
                  />
                </label>
                <label className="field">
                  {t('phone')}
                  <input
                    name="contactPhone"
                    type="tel"
                    autoComplete="tel"
                    required
                    pattern="[+0-9 ()\-]{8,20}"
                    placeholder="08x xxx xxxx"
                  />
                </label>
                <label className="field">
                  {t('email')}
                  <input
                    name="contactEmail"
                    type="email"
                    autoComplete="email"
                    defaultValue={user?.email}
                    required
                    maxLength={254}
                  />
                </label>
              </div>
              <label className="check-line long">
                <input name="consent" type="checkbox" required />
                <span>{t('bookingConsent')}</span>
              </label>
              <p className="small muted" style={{ marginTop: 12 }}>
                {t('groupSafety')}
              </p>
            </div>
          </section>
          <aside className="panel price-summary">
            <h3>{t('summary')}</h3>
            <ErrorBox message={err} />
            {quote ? (
              <>
                <div className="price-row">
                  <span>{t('subtotal')}</span>
                  <b>{money(quote.totals.subtotalSatang, locale)}</b>
                </div>
                <div className="price-row discount">
                  <span>
                    {t('bundle')} ({quote.totals.rateBps / 100}%)
                  </span>
                  <b>−{money(quote.totals.discountSatang, locale)}</b>
                </div>
                <div className="total-row">
                  <span>{t('total')}</span>
                  <strong>{money(quote.totals.totalSatang, locale)}</strong>
                </div>
                {quote.plan.issues.map((i) => (
                  <ErrorBox key={i.activityId} message={t(i.code)} />
                ))}
                <details className="finance-breakdown">
                  <summary>{l('ที่มาของราคาและส่วนแบ่ง', 'Pricing & revenue breakdown')}</summary>
                  <div className="price-row">
                    <span>{l('คอมมิชชัน 12%', '12% commission')}</span>
                    <b>{money(quote.totals.commissionSatang, locale)}</b>
                  </div>
                  <div className="price-row">
                    <span>{l('ส่วนแบ่งชุมชน 88%', '88% host share')}</span>
                    <b>{money(quote.totals.hostPayoutSatang, locale)}</b>
                  </div>
                  <div className="price-row">
                    <span>{l('แพลตฟอร์มก่อนต้นทุนอื่น', 'Platform before other costs')}</span>
                    <b>{money(quote.totals.contributionSatang, locale)}</b>
                  </div>
                  <p>{t('discountNote')}</p>
                  <p>
                    {l(
                      'ยังไม่รวมค่ารับชำระเงินหรือค่าใช้จ่ายดำเนินงาน',
                      'Payment processing and operating costs are not included.',
                    )}
                  </p>
                </details>
              </>
            ) : (
              !err && <Loading />
            )}
            <div className="notice-box small">
              <LockKeyhole size={15} />
              {t('noPayments')}
            </div>
            {user ? (
              <button
                className="btn full"
                type="submit"
                disabled={busy || !quote || !!quote.plan.issues.length}
              >
                {t(busy ? 'working' : 'submitBooking')}
                <ArrowRight size={16} />
              </button>
            ) : (
              <Link href={'/login?next=' + encodeURIComponent(next)} className="btn full">
                {t('loginToBook')}
              </Link>
            )}
            <Link className="text-link" style={{ marginTop: 16 }} href="/my-trip">
              {t('backTrip')}
            </Link>
          </aside>
        </form>
      )}
    </div>
  );
}
export function BookingHistory() {
  const { t, locale, error, user, reloadCatalog } = useApp(),
    [rows, setRows] = useState<Booking[] | null>(null),
    [err, setErr] = useState(''),
    [busy, setBusy] = useState(''),
    [confirm, setConfirm] = useState(''),
    [now] = useState(Date.now);
  useEffect(() => {
    if (user)
      api<Booking[]>('bookings')
        .then(setRows)
        .catch((e) => setErr(error(e)));
  }, [user, error]);
  async function cancel(id: string) {
    setBusy(id);
    try {
      await api('bookings/items', 'PATCH', { itemId: id, status: 'cancelled' });
      setRows(await api<Booking[]>('bookings'));
      await reloadCatalog();
      setConfirm('');
    } catch (e) {
      setErr(error(e));
    } finally {
      setBusy('');
    }
  }
  return (
    <div className="container page">
      <PageTitle eyebrow="ALL YOUR LOCAL STORIES" title={t('bookings')} copy={t('noPayments')} />
      <Guard>
        <ErrorBox message={err} />
        {rows === null ? (
          <Loading />
        ) : !rows.length ? (
          <Empty
            title={t('noBookings')}
            action={
              <Link className="btn" href="/activities">
                {t('explore')}
              </Link>
            }
          />
        ) : (
          rows.map((b) => (
            <article className="panel booking-history" key={b.id}>
              <div className="row-between">
                <div>
                  <h3>
                    <Ticket size={18} style={{ display: 'inline', marginRight: 8 }} />
                    {b.trip_name}
                  </h3>
                  <span className="small muted">
                    {dateLabel(b.created_at, locale, true)} · {b.id.slice(0, 8)}
                  </span>
                </div>
                <div>
                  <span className={'status status-' + b.status}>{t(b.status)}</span>{' '}
                  <span className="badge">{t('not_collected')}</span>
                </div>
              </div>
              {b.items.map((i) => (
                <div className="booking-list-item" key={i.id}>
                  <img src={i.image} alt="" />
                  <div>
                    <h3>{localized(i, locale)}</h3>
                    <p>
                      {dateLabel(i.starts_at, locale)} · {timeLabel(i.starts_at)} · {i.participants}{' '}
                      {t('participants')}
                    </p>
                    <div className="row-between">
                      <span className={'status status-' + i.status}>{t(i.status)}</span>
                      {['pending', 'confirmed'].includes(i.status) &&
                        Date.parse(i.starts_at) > now &&
                        (confirm === i.id ? (
                          <div className="request-actions">
                            <button
                              className="btn btn-small"
                              disabled={busy === i.id}
                              onClick={() => void cancel(i.id)}
                            >
                              {t('cancelRequest')}
                            </button>
                            <button
                              className="btn btn-small btn-outline"
                              onClick={() => setConfirm('')}
                            >
                              {t('back')}
                            </button>
                          </div>
                        ) : (
                          <button className="text-btn danger" onClick={() => setConfirm(i.id)}>
                            {t('cancelRequest')}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              ))}
              <div className="total-row">
                <span>{t('total')}</span>
                <strong>{money(b.totals.totalSatang, locale)}</strong>
              </div>
              <p className="small muted">{t('discountTerms')}</p>
            </article>
          ))
        )}
      </Guard>
    </div>
  );
}

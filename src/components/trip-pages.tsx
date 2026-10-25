'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Save,
  Route,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  CalendarDays,
} from 'lucide-react';
import { useApp } from './providers';
import { Empty, ErrorBox, PageTitle, PriceSummary } from './ui';
import { reorderTrip } from '@/lib/trip';
import { createPlan, basicPlanner } from '@/lib/planner';
import { money } from '@/lib/pricing';
import { localized, dateLabel, timeLabel } from '@/lib/i18n';
function EmptyTrip() {
  const { t } = useApp();
  return (
    <Empty
      title={t('emptyTrip')}
      copy={t('emptyTripCopy')}
      action={
        <Link className="btn" href="/activities">
          {t('explore')}
          <ArrowRight size={16} />
        </Link>
      }
    />
  );
}
export function TripSettings() {
  const { trip, setTrip, t } = useApp();
  return (
    <div className="panel trip-settings">
      <label className="field trip-name">
        {t('tripName')}
        <input
          maxLength={120}
          value={trip.name}
          placeholder={t('tripDefault')}
          onChange={(e) => setTrip({ ...trip, name: e.target.value })}
        />
      </label>
      <label className="field">
        {t('destination')}
        <input
          value={trip.destination}
          placeholder={t('anywhere')}
          maxLength={80}
          onChange={(e) => setTrip({ ...trip, destination: e.target.value })}
        />
      </label>
      <label className="field">
        {t('startDate')}
        <input
          type="date"
          value={trip.startDate}
          onChange={(e) => setTrip({ ...trip, startDate: e.target.value })}
        />
      </label>
      <label className="field">
        {t('endDate')}
        <input
          type="date"
          min={trip.startDate}
          value={trip.endDate}
          onChange={(e) => setTrip({ ...trip, endDate: e.target.value })}
        />
      </label>
      <label className="field">
        {t('travelers')}
        <input
          type="number"
          min={1}
          max={50}
          value={trip.travelers}
          onChange={(e) => {
            const travelers = Math.max(1, Math.min(50, Number(e.target.value)));
            setTrip({
              ...trip,
              travelers,
              items: trip.items.map((i) => ({ ...i, participants: travelers })),
            });
          }}
        />
      </label>
    </div>
  );
}
export function MyTrip() {
  const { trip, setTrip, t, l, catalog, locale, user, save, error } = useApp(),
    [err, setErr] = useState(''),
    [busy, setBusy] = useState(false),
    [now] = useState(Date.now);
  return (
    <div className="container page">
      <PageTitle
        eyebrow="YOUR NEXT CHAPTER"
        title={t('tripTitle')}
        copy={t('localDraft')}
        action={
          user && (
            <button
              className="btn btn-outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await save();
                  setErr('');
                } catch (e) {
                  setErr(error(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Save size={16} />
              {t('saveTrip')}
            </button>
          )
        }
      />
      <ErrorBox message={err} />
      <TripSettings />
      {!trip.items.length ? (
        <EmptyTrip />
      ) : (
        <div className="two-column">
          <section>
            <div className="section-heading">
              <h2>
                {t('selectedActivities')} <span className="count-pill">{trip.items.length}</span>
              </h2>
              <Link href="/activities" className="text-link">
                <Plus size={15} />
                {t('explore')}
              </Link>
            </div>
            {trip.items.map((item, index) => {
              const a = catalog.activities.find((a) => a.id === item.activityId);
              if (!a)
                return (
                  <div className="panel" key={item.activityId}>
                    <ErrorBox message={t('activity_unavailable')} />
                    <button
                      className="btn"
                      onClick={() =>
                        setTrip({
                          ...trip,
                          items: trip.items.filter((i) => i.activityId !== item.activityId),
                        })
                      }
                    >
                      {t('remove')}
                    </button>
                  </div>
                );
              const sessions = a.sessions.filter(
                (s) => s.status === 'open' && Date.parse(s.starts_at) > now,
              );
              return (
                <article className="trip-item panel" key={a.id}>
                  <div className="trip-order">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <button
                      className="icon-btn"
                      aria-label={t('moveUp')}
                      disabled={index === 0}
                      onClick={() => setTrip(reorderTrip(trip, index, -1))}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      className="icon-btn"
                      aria-label={t('moveDown')}
                      disabled={index === trip.items.length - 1}
                      onClick={() => setTrip(reorderTrip(trip, index, 1))}
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>
                  <img src={a.image} alt="" />
                  <div className="trip-item-content">
                    <span className="eyebrow">{a.province}</span>
                    <h3>
                      <Link href={'/activities/' + a.id}>{localized(a, locale)}</Link>
                    </h3>
                    <p className="small muted">
                      {a.host_name} · {a.duration_minutes / 60} {t('hours')}
                    </p>
                    <div className="trip-item-fields">
                      <label className="field">
                        {t('sessions')}
                        <select
                          value={item.sessionId}
                          onChange={(e) =>
                            setTrip({
                              ...trip,
                              items: trip.items.map((i) =>
                                i.activityId === a.id ? { ...i, sessionId: e.target.value } : i,
                              ),
                            })
                          }
                        >
                          <option value="">{t('chooseSession')}</option>
                          {sessions.map((s) => (
                            <option value={s.id} key={s.id}>
                              {dateLabel(s.starts_at, locale)} · {timeLabel(s.starts_at)} (
                              {s.capacity - s.reserved})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        {t('participants')}
                        <input
                          type="number"
                          min={a.min_participants}
                          max={a.max_participants}
                          value={item.participants}
                          onChange={(e) =>
                            setTrip({
                              ...trip,
                              items: trip.items.map((i) =>
                                i.activityId === a.id
                                  ? {
                                      ...i,
                                      participants: Math.max(
                                        1,
                                        Math.min(50, Number(e.target.value)),
                                      ),
                                    }
                                  : i,
                              ),
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className="row-between">
                      <strong className="cyan">
                        {money(a.price_satang * item.participants, locale)}
                      </strong>
                      <button
                        className="text-btn danger"
                        onClick={() =>
                          setTrip({
                            ...trip,
                            items: trip.items.filter((i) => i.activityId !== a.id),
                          })
                        }
                      >
                        <Trash2 size={14} />
                        {t('remove')}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            <p className="small muted">
              {l(
                'ลำดับนี้เป็นความต้องการของคุณ กดจัดตารางอัตโนมัติในหน้าวางแผนเพื่อเลือกรอบที่เรียงตามลำดับ',
                'This is your preferred order. Use Arrange available sessions in the planner to apply it to actual session times.',
              )}
            </p>
            <Link href="/activities" className="add-more">
              <Plus size={20} />
              {t('explore')}
            </Link>
          </section>
          <PriceSummary>
            <Link href="/trip-planner" className="btn full">
              <Route size={17} />
              {t('planner')}
              <ArrowRight size={16} />
            </Link>
            <Link href="/booking/summary" className="btn btn-outline full">
              {t('continueBooking')}
            </Link>
          </PriceSummary>
        </div>
      )}
    </div>
  );
}
export function Planner() {
  const { trip, setTrip, t, l, catalog, locale } = useApp(),
    [busy, setBusy] = useState(false);
  const plan = createPlan(trip, catalog.activities);
  const days = [
    ...new Set(
      plan.rows.map((r) =>
        new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Bangkok',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(r.start)),
      ),
    ),
  ];
  return (
    <div className="container page">
      <PageTitle
        eyebrow="A LITTLE PLANNING. A LOT TO DISCOVER."
        title={t('itinerary')}
        copy={t('basicPlannerNote')}
        action={
          <span className="badge">
            <Sparkles size={14} />
            {t('basicPlanner')}
          </span>
        }
      />
      <TripSettings />
      {!trip.items.length ? (
        <EmptyTrip />
      ) : (
        <>
          <div className="panel planner-controls">
            <label className="field">
              {t('travelBuffer')} ({t('minutes')})
              <input
                type="number"
                min={0}
                max={480}
                value={trip.bufferMinutes}
                onChange={(e) =>
                  setTrip({
                    ...trip,
                    bufferMinutes: Math.max(0, Math.min(480, Number(e.target.value))),
                  })
                }
              />
            </label>
            <label className="field">
              {t('restBuffer')} ({t('minutes')})
              <input
                type="number"
                min={0}
                max={240}
                value={trip.restMinutes}
                onChange={(e) =>
                  setTrip({
                    ...trip,
                    restMinutes: Math.max(0, Math.min(240, Number(e.target.value))),
                  })
                }
              />
            </label>
            <button
              className="btn"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  setTrip(await basicPlanner.suggest(trip, catalog.activities));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Sparkles size={16} />
              {t('autoArrange')}
            </button>
            <Link className="text-link" href="/my-trip">
              {t('backTrip')}
            </Link>
          </div>
          <div className={plan.issues.length ? 'error-box' : 'success-box'}>
            {plan.issues.length ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span>{t(plan.issues.length ? 'planIssues' : 'planReady')}</span>
          </div>
          <div className="two-column">
            <section className="timeline">
              {days.map((day, index) => (
                <div className="timeline-day" key={day}>
                  <h2>
                    <span>{index + 1}</span>
                    {dateLabel(day, locale)}
                    <CalendarDays size={18} />
                  </h2>
                  {plan.rows
                    .filter(
                      (r) =>
                        new Intl.DateTimeFormat('en-CA', {
                          timeZone: 'Asia/Bangkok',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        }).format(new Date(r.start)) === day,
                    )
                    .map((row, i) => {
                      const a = catalog.activities.find((a) => a.id === row.activityId);
                      return (
                        <div className={'timeline-row ' + row.type} key={i}>
                          <div className="timeline-time">
                            {timeLabel(row.start)}
                            <span>{timeLabel(row.end)}</span>
                          </div>
                          {a ? (
                            <div className="timeline-card panel">
                              <img src={a.image} alt="" />
                              <div>
                                <span className="eyebrow">{a.province}</span>
                                <h3>{localized(a, locale)}</h3>
                                <p>{a.host_name}</p>
                                <Link className="text-link" href="/my-trip">
                                  {t('edit')}
                                  <ArrowRight size={13} />
                                </Link>
                              </div>
                            </div>
                          ) : (
                            <div className="buffer-card">
                              {row.type === 'rest' ? <Clock size={17} /> : <Route size={17} />}
                              <span>{t(row.type === 'rest' ? 'rest' : 'travelEstimate')}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ))}
              {plan.issues.length > 0 && (
                <div className="panel unscheduled">
                  <h3>{t('unscheduled')}</h3>
                  {plan.issues.map((issue) => (
                    <p key={issue.activityId}>
                      <b>
                        {catalog.activities.find((a) => a.id === issue.activityId)
                          ? localized(
                              catalog.activities.find((a) => a.id === issue.activityId)!,
                              locale,
                            )
                          : issue.activityId}
                      </b>
                      <br />
                      <span className="danger">{t(issue.code)}</span>
                    </p>
                  ))}
                  <Link href="/my-trip" className="btn btn-outline">
                    {t('backTrip')}
                  </Link>
                </div>
              )}
              <p className="small muted">
                {l(
                  'เวลาเดินทางเป็นค่าที่คุณกำหนด ไม่ใช่ข้อมูลจราจรจริง ระบบไม่วางกิจกรรมต่างจังหวัดไว้วันเดียวกัน',
                  'Travel buffers are your estimates, not live traffic data. Activities in different provinces are not scheduled on the same day.',
                )}
              </p>
            </section>
            <PriceSummary>
              {plan.issues.length ? (
                <button className="btn full" disabled>
                  {t('planIssues')}
                </button>
              ) : (
                <Link href="/booking/summary" className="btn full">
                  {t('continueBooking')}
                  <ArrowRight size={16} />
                </Link>
              )}
            </PriceSummary>
          </div>
        </>
      )}
    </div>
  );
}

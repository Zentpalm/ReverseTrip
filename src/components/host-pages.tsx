'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Plus, CheckCircle, Handshake, CalendarDays } from 'lucide-react';
import { api, useApp } from './providers';
import { Empty, ErrorBox, Guard, Loading, PageTitle } from './ui';
import type { Activity, BookingItem, Community, Verification } from '@/lib/types';
import { localized, dateLabel, timeLabel } from '@/lib/i18n';
import { money } from '@/lib/pricing';
import { bangkokDate } from '@/lib/trip';
import type { MessageKey } from '@/lib/i18n';
interface HostData {
  community: (Community & { verification_info: string }) | null;
  activities: Activity[];
  bookings: (BookingItem & {
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    kind: string;
  })[];
  expectedPayout: number;
}
function HostNav() {
  const { t } = useApp(),
    path = usePathname();
  return (
    <nav className="host-nav">
      {[
        { path: '/community/dashboard', key: 'dashboard' },
        { path: '/community/activities', key: 'manageActivities' },
        { path: '/community/bookings', key: 'hostBookings' },
      ].map((item) => (
        <Link className={path === item.path ? 'active' : ''} key={item.path} href={item.path}>
          {t(item.key as MessageKey)}
        </Link>
      ))}
    </nav>
  );
}
export function CommunityRegister() {
  const { t, l, error, user, authenticate } = useApp(),
    router = useRouter(),
    [err, setErr] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api('community', 'POST', {
        name: d.get('name'),
        province: d.get('province'),
        description: d.get('description'),
        verificationInfo: d.get('verificationInfo'),
        consent: d.get('consent') === 'on',
      });
      if (user) await authenticate({ ...user, role: user.role === 'admin' ? 'admin' : 'host' });
      router.push('/community/dashboard');
    } catch (e) {
      setErr(error(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page community-register">
      <PageTitle
        eyebrow="LOCAL KNOWLEDGE. SHARED WITH THE WORLD."
        title={t('join')}
        copy={t('joinCopy')}
      />
      <div className="notice-box">
        <Handshake size={22} />
        <p>{t('discountNote')}</p>
      </div>
      <Guard>
        {user?.role === 'host' ? (
          <Empty
            title={t('community_exists')}
            action={
              <Link href="/community/dashboard" className="btn">
                {t('dashboard')}
              </Link>
            }
          />
        ) : (
          <form noValidate className="panel" onSubmit={submit}>
            <ErrorBox message={err} />
            <label className="field">
              {t('communityName')}
              <input name="name" required minLength={3} maxLength={150} />
            </label>
            <label className="field">
              {t('destination')}
              <input
                name="province"
                required
                minLength={2}
                maxLength={80}
                placeholder={l('เช่น เชียงใหม่', 'For example: เชียงใหม่')}
              />
            </label>
            <label className="field">
              {t('description')}
              <textarea name="description" required minLength={20} maxLength={2000} />
            </label>
            <label className="field">
              {t('verificationInfo')}
              <textarea
                name="verificationInfo"
                required
                minLength={10}
                maxLength={2000}
                placeholder={t('verificationHint')}
              />
            </label>
            <p className="small muted">{t('verificationHint')}</p>
            <label className="check-line long" style={{ marginTop: 20 }}>
              <input name="consent" type="checkbox" required />
              <span>{t('communityConsent')}</span>
            </label>
            <button disabled={busy} className="btn full" style={{ marginTop: 20 }}>
              {t(busy ? 'working' : 'submitCommunity')}
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </Guard>
    </div>
  );
}
export function HostPage({
  section = 'dashboard',
}: {
  section?: 'dashboard' | 'activities' | 'bookings';
}) {
  const { t, user, error, l, locale, reloadCatalog } = useApp(),
    [data, setData] = useState<HostData | null>(null),
    [err, setErr] = useState(''),
    [editing, setEditing] = useState<Activity | 'new' | null>(null),
    [busy, setBusy] = useState(''),
    [now] = useState(Date.now);
  async function refresh() {
    setData(await api<HostData>('host'));
  }
  useEffect(() => {
    if (user && ['host', 'admin'].includes(user.role))
      api<HostData>('host')
        .then(setData)
        .catch((e) => setErr(error(e)));
  }, [user, error]);
  async function transition(id: string, status: string) {
    setBusy(id);
    setErr('');
    try {
      await api('bookings/items', 'PATCH', { itemId: id, status });
      await refresh();
      await reloadCatalog();
    } catch (e) {
      setErr(error(e));
    } finally {
      setBusy('');
    }
  }
  return (
    <div className="container page">
      <PageTitle
        eyebrow="YOUR COMMUNITY, AT A GLANCE"
        title={t(
          section === 'dashboard'
            ? 'dashboard'
            : section === 'activities'
              ? 'manageActivities'
              : 'hostBookings',
        )}
        copy={data?.community?.name}
      />
      <Guard roles={['host', 'admin']}>
        <HostNav />
        <ErrorBox message={err} />
        {!data ? (
          <Loading />
        ) : !data.community ? (
          <Empty
            title={t('no_community')}
            action={
              <Link href="/community/register" className="btn">
                {t('join')}
              </Link>
            }
          />
        ) : (
          <>
            <div className="row-between">
              <span className={'status status-' + data.community.verification}>
                {t(('verification_' + data.community.verification) as MessageKey)}
              </span>
              {section === 'activities' && !editing && (
                <button className="btn" onClick={() => setEditing('new')}>
                  <Plus size={16} />
                  {t('newActivity')}
                </button>
              )}
            </div>
            {data.community.verification !== 'verified' && (
              <div className="notice-box">{t('verificationNeeded')}</div>
            )}
            {section === 'dashboard' && (
              <>
                <div className="stats-grid">
                  <div className="panel stat">
                    <h3>{t('manageActivities')}</h3>
                    <strong>{data.activities.length}</strong>
                    <Link className="text-link" href="/community/activities">
                      {t('manageActivities')}
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                  <div className="panel stat">
                    <h3>{t('pending')}</h3>
                    <strong>{data.bookings.filter((b) => b.status === 'pending').length}</strong>
                    <Link className="text-link" href="/community/bookings">
                      {t('hostBookings')}
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                  <div className="panel stat">
                    <h3>{t('expectedPayout')}</h3>
                    <strong>{money(data.expectedPayout, locale)}</strong>
                    <p>{t('unpaidNote')}</p>
                  </div>
                </div>
                <div className="panel">
                  <h2 style={{ fontSize: 22 }}>{data.community.name}</h2>
                  <p style={{ marginTop: 12 }}>{data.community.description}</p>
                  <p className="small muted" style={{ marginTop: 18 }}>
                    {t('discountNote')}
                  </p>
                </div>
              </>
            )}
            {section === 'activities' &&
              (editing ? (
                <ActivityEditor
                  initial={editing === 'new' ? undefined : editing}
                  onClose={() => setEditing(null)}
                  onSaved={async () => {
                    await refresh();
                    await reloadCatalog();
                    setEditing(null);
                  }}
                />
              ) : data.activities.length ? (
                data.activities.map((a) => (
                  <div className="panel host-item" key={a.id}>
                    <img src={a.image} alt="" />
                    <div>
                      <h3>{localized(a, locale)}</h3>
                      <p>
                        {money(a.price_satang, locale)} {t('perPerson')} · {a.sessions.length}{' '}
                        {t('sessions')}
                      </p>
                      <span className="badge">{t(a.status)}</span>
                    </div>
                    <button className="btn btn-outline btn-small" onClick={() => setEditing(a)}>
                      {t('edit')}
                    </button>
                  </div>
                ))
              ) : (
                <Empty title={t('newActivity')} copy={t('verificationNeeded')} />
              ))}
            {section === 'bookings' &&
              (data.bookings.length ? (
                data.bookings.map((b) => (
                  <article className="panel request-card" key={b.id}>
                    <div className="row-between">
                      <h3>{localized(b, locale)}</h3>
                      <span className={'status status-' + b.status}>{t(b.status)}</span>
                    </div>
                    <p style={{ marginTop: 10 }}>
                      <CalendarDays size={14} style={{ display: 'inline' }} />{' '}
                      {dateLabel(b.starts_at, locale, true)} · {b.participants} {t('participants')}
                    </p>
                    <p className="small">
                      {t('contact')}: {b.contact_name} · {b.contact_email} · {b.contact_phone}
                    </p>
                    <p className="small muted">
                      {t('not_collected')} · {money(b.price_satang * b.participants, locale)}
                    </p>
                    <div className="request-actions">
                      {b.status === 'pending' && (
                        <>
                          <button
                            className="btn btn-small"
                            disabled={busy === b.id}
                            onClick={() => void transition(b.id, 'confirmed')}
                          >
                            {t('approve')}
                          </button>
                          <button
                            className="btn btn-small btn-outline"
                            disabled={busy === b.id}
                            onClick={() => void transition(b.id, 'rejected')}
                          >
                            {t('reject')}
                          </button>
                        </>
                      )}
                      {b.status === 'confirmed' && Date.parse(b.ends_at) <= now && (
                        <button
                          className="btn btn-small"
                          disabled={busy === b.id}
                          onClick={() => void transition(b.id, 'completed')}
                        >
                          {t('markComplete')}
                        </button>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <Empty
                  title={t('noBookings')}
                  copy={l(
                    'คำขอจากนักท่องเที่ยวจะแสดงที่นี่',
                    'Traveler requests will appear here.',
                  )}
                />
              ))}
          </>
        )}
      </Guard>
    </div>
  );
}
function ActivityEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Activity;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t, l, locale, error, notify } = useApp(),
    [err, setErr] = useState(''),
    [busy, setBusy] = useState(false),
    [sessions, setSessions] = useState(initial?.sessions || []);
  const basicFields: [string, MessageKey][] = [
    ['title_th', 'titleTh'],
    ['title_en', 'titleEn'],
    ['province', 'destination'],
  ];
  const copyFields: [string, MessageKey][] = [
    ['description_th', 'descriptionTh'],
    ['description_en', 'descriptionEn'],
    ['included_th', 'included'],
    ['included_en', 'included'],
    ['safety_th', 'safety'],
    ['safety_en', 'safety'],
    ['cancellation_th', 'cancellation'],
    ['cancellation_en', 'cancellation'],
  ];
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const d = new FormData(e.currentTarget),
      payload: Record<string, unknown> = { id: initial?.id };
    for (const [k, v] of d) payload[k] = v;
    for (const k of ['duration_minutes', 'min_participants', 'max_participants', 'min_age'])
      payload[k] = Number(d.get(k));
    payload.price_satang = Math.round(Number(d.get('price')) * 100);
    delete payload.price;
    try {
      await api('host/activities', 'POST', payload);
      notify(t('saved'));
      await onSaved();
    } catch (e) {
      setErr(error(e));
    } finally {
      setBusy(false);
    }
  }
  async function addSession(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      d = new FormData(form);
    setBusy(true);
    setErr('');
    try {
      await api('host/sessions', 'POST', {
        activityId: initial!.id,
        date: d.get('date'),
        time: d.get('time'),
        capacity: Number(d.get('capacity')),
        group: d.get('group') === 'on',
      });
      const fresh = await api<HostData>('host');
      setSessions(fresh.activities.find((a) => a.id === initial!.id)?.sessions || []);
      notify(t('saved'));
      form.reset();
    } catch (e) {
      setErr(error(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="host-editor">
      <div className="row-between">
        <h2>{t(initial ? 'edit' : 'newActivity')}</h2>
        <button className="text-btn" onClick={onClose}>
          {t('back')}
        </button>
      </div>
      <ErrorBox message={err} />
      <form noValidate className="panel" onSubmit={submit}>
        <div className="form-grid">
          {basicFields.map(([key, label]) => (
            <label className="field" key={key}>
              {t(label)}
              <input
                name={key}
                defaultValue={String(initial?.[key as keyof Activity] || '')}
                required
                minLength={key === 'province' ? 2 : 5}
                maxLength={key === 'province' ? 80 : 150}
              />
            </label>
          ))}
          <label className="field">
            {t('interests')}
            <select name="category" defaultValue={initial?.category || 'food'}>
              {(['food', 'craft', 'culture', 'nature', 'community', 'workshop'] as const).map(
                (c) => (
                  <option key={c} value={c}>
                    {t(c)}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="field">
            {t('price')}
            <input
              name="price"
              type="number"
              step="0.01"
              min={1}
              max={100000}
              defaultValue={initial ? initial.price_satang / 100 : 500}
              required
            />
          </label>
          {(
            [
              ['duration_minutes', 'duration', 30, 720, 180],
              ['min_participants', 'minPeople', 1, 50, 1],
              ['max_participants', 'maxPeople', 1, 50, 10],
              ['min_age', 'minAge', 0, 21, 8],
            ] as const
          ).map(([key, label, min, max, fallback]) => (
            <label className="field" key={key}>
              {t(label)}
              <input
                name={key}
                type="number"
                min={min}
                max={max}
                required
                defaultValue={initial?.[key] ?? fallback}
              />
            </label>
          ))}
          <label className="field">
            {t('photo')}
            <select name="image" defaultValue={initial?.image || '/images/cooking.webp'}>
              {[
                ['cooking', 'food'],
                ['pottery', 'craft'],
                ['indigo', 'craft'],
                ['cacao', 'community'],
                ['paddleboard', 'nature'],
                ['amphawa', 'culture'],
              ].map(([image, key]) => (
                <option key={image} value={'/images/' + image + '.webp'}>
                  {t(key as MessageKey)} · {image}
                </option>
              ))}
            </select>
          </label>
          {copyFields.map(([key, label]) => (
            <label className="field" key={key}>
              {t(label)} ({key.endsWith('_en') ? 'EN' : 'TH'})
              <textarea
                name={key}
                defaultValue={String(initial?.[key as keyof Activity] || '')}
                required
                minLength={key.startsWith('description') ? 20 : key.startsWith('included') ? 5 : 10}
                maxLength={key.startsWith('description') ? 5000 : 1000}
              />
            </label>
          ))}
          <label className="field">
            {t('publishStatus')}
            <select name="status" defaultValue={initial?.status || 'draft'}>
              {(['draft', 'published', 'inactive'] as const).map((s) => (
                <option key={s} value={s}>
                  {t(s)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="notice-box small">
          {l(
            'ใช้ภาพตัวอย่างที่จัดเตรียมไว้ก่อน ระบบอัปโหลดภาพผู้จัดยังไม่เปิดใช้งาน',
            'Choose a bundled sample image for now. Organizer image uploads are not enabled.',
          )}
        </div>
        <button className="btn" disabled={busy} style={{ marginTop: 22 }}>
          {t(busy ? 'working' : 'save')}
        </button>
      </form>
      {initial && (
        <section className="panel" style={{ marginTop: 25 }}>
          <h2>{t('sessions')}</h2>
          <form noValidate onSubmit={addSession}>
            <div className="host-session-form">
              <label className="field">
                {t('date')}
                <input name="date" type="date" min={bangkokDate()} required />
              </label>
              <label className="field">
                {l('เวลาเริ่ม', 'Start time')}
                <input name="time" type="time" required />
              </label>
              <label className="field">
                {t('maxPeople')}
                <input
                  name="capacity"
                  type="number"
                  min={1}
                  max={initial.max_participants}
                  defaultValue={initial.max_participants}
                  required
                />
              </label>
              <button className="btn" disabled={busy}>
                {t('addSession')}
              </button>
            </div>
            <label className="check-line" style={{ marginTop: 15 }}>
              <input name="group" type="checkbox" />
              {t('groupSession')}
            </label>
          </form>
          <div className="session-list">
            {sessions.map((s) => (
              <div key={s.id}>
                <span>
                  {dateLabel(s.starts_at, locale)} · {timeLabel(s.starts_at)}–{timeLabel(s.ends_at)}
                  <br />
                  {s.capacity - s.reserved}/{s.capacity} {t('places')} ·{' '}
                  {s.group_mode ? t('groupSession') : t('sessions')}
                </span>
                {s.status === 'open' ? (
                  <button
                    className="btn btn-small btn-outline"
                    disabled={busy || s.reserved > 0}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await api('host/sessions', 'DELETE', { id: s.id });
                        setSessions(
                          sessions.map((row) =>
                            row.id === s.id ? { ...row, status: 'closed' } : row,
                          ),
                        );
                      } catch (e) {
                        setErr(error(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {t('closeSession')}
                  </button>
                ) : (
                  <span className="badge">{t('inactive')}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
export function Admin() {
  const { t, l, user, error, notify } = useApp(),
    [rows, setRows] = useState<(Community & { verification_info: string })[] | null>(null),
    [err, setErr] = useState(''),
    [busy, setBusy] = useState('');
  useEffect(() => {
    if (user?.role === 'admin')
      api<{ communities: (Community & { verification_info: string })[] }>('admin')
        .then((r) => setRows(r.communities))
        .catch((e) => setErr(error(e)));
  }, [user, error]);
  async function change(id: string, status: Verification) {
    setBusy(id);
    try {
      await api('admin/verify', 'PATCH', { id, status });
      setRows(rows?.map((c) => (c.id === id ? { ...c, verification: status } : c)) || []);
      notify(t('success'));
    } catch (e) {
      setErr(error(e));
    } finally {
      setBusy('');
    }
  }
  return (
    <div className="container page">
      <PageTitle
        eyebrow="COMMUNITY REVIEW"
        title={t('admin')}
        copy={l(
          'ตรวจสอบหลักฐานของผู้จัดก่อนอนุมัติ ไม่มีการยืนยันอัตโนมัติ',
          'Review organizer evidence before approval. Verification is not automatic.',
        )}
      />
      <Guard roles={['admin']}>
        <ErrorBox message={err} />
        {!rows ? (
          <Loading />
        ) : !rows.length ? (
          <Empty title={l('ไม่มีชุมชนรอตรวจสอบ', 'No community profiles to review')} />
        ) : (
          rows.map((c) => (
            <article className="panel request-card" key={c.id}>
              <div className="row-between">
                <h3>{c.name}</h3>
                <span className={'status status-' + c.verification}>
                  {t(('verification_' + c.verification) as MessageKey)}
                </span>
              </div>
              <p>
                {c.province} · {c.description}
              </p>
              <div className="notice-box">{c.verification_info}</div>
              <div className="request-actions">
                {(['verified', 'rejected', 'suspended', 'pending'] as const)
                  .filter((s) => s !== c.verification)
                  .map((s) => (
                    <button
                      className="btn btn-small btn-outline"
                      key={s}
                      disabled={busy === c.id}
                      onClick={() => void change(c.id, s)}
                    >
                      {s === 'verified' && <CheckCircle size={13} />}{' '}
                      {t(('verification_' + s) as MessageKey)}
                    </button>
                  ))}
              </div>
            </article>
          ))
        )}
      </Guard>
    </div>
  );
}

/* eslint-disable react-hooks/set-state-in-effect -- Browser storage is read once after server hydration; no render-time storage access. */
'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Catalog, Locale, Trip, User } from '@/lib/types';
import { emptyTrip, addTripItem } from '@/lib/trip';
import { tripSchema } from '@/lib/validation';
import { translate, errorMessage, type MessageKey } from '@/lib/i18n';
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api/' + path, {
      method,
      headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error('network_error');
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'server_error');
  return data as T;
}
interface AppContext {
  catalog: Catalog;
  reloadCatalog: () => Promise<void>;
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: string;
  toggleTheme: () => void;
  t: (k: MessageKey) => string;
  l: (th: string, en: string) => string;
  user: User | null;
  authReady: boolean;
  authenticate: (u: User) => Promise<void>;
  logout: () => Promise<void>;
  trip: Trip;
  setTrip: (t: Trip) => void;
  add: (activityId: string, sessionId: string, participants: number) => void;
  save: () => Promise<void>;
  notice: string;
  notify: (s: string) => void;
  error: (e: unknown) => string;
}
const Context = createContext<AppContext | null>(null);
export function AppProvider({
  children,
  initialCatalog,
}: {
  children: ReactNode;
  initialCatalog: Catalog;
}) {
  const router = useRouter(),
    [catalog, setCatalog] = useState(initialCatalog),
    [locale, setLang] = useState<Locale>('th'),
    [theme, setTheme] = useState('dark'),
    [trip, updateTrip] = useState<Trip>(emptyTrip),
    [user, setUser] = useState<User | null>(null),
    [authReady, setAuthReady] = useState(false),
    [notice, notify] = useState('');
  const revision = useRef(0),
    tripRef = useRef(trip),
    localeRef = useRef(locale);
  const persistTrip = (next: Trip) => {
    tripRef.current = next;
    updateTrip(next);
    try {
      localStorage.setItem('reversetrip-trip', JSON.stringify(next));
    } catch {}
  };
  const loadAccount = async (u: User) => {
    setUser(u);
    const saved = await api<{ trip: Trip; revision: number } | null>('trip');
    revision.current = saved?.revision || 0;
    if (saved && !tripRef.current.items.length) persistTrip(saved.trip);
    else if (saved?.trip.items.length && tripRef.current.items.length)
      notify(translate(localeRef.current, 'cloudConflict'));
  };
  useEffect(() => {
    let cancelled = false;
    const storedLang = localStorage.getItem('reversetrip-lang') === 'en' ? 'en' : 'th';
    setLang(storedLang);
    localeRef.current = storedLang;
    document.documentElement.lang = storedLang;
    setTheme(localStorage.getItem('reversetrip-theme') === 'light' ? 'light' : 'dark');
    try {
      const stored = tripSchema.safeParse(
        JSON.parse(localStorage.getItem('reversetrip-trip') || 'null'),
      );
      if (stored.success) {
        tripRef.current = stored.data;
        updateTrip(stored.data);
      }
    } catch {}
    api<{ user: User | null }>('auth/me')
      .then(async (result) => {
        if (cancelled) return;
        if (result.user) await loadAccount(result.user);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAuthReady(true);
      });
    return () => {
      cancelled = true;
    };
    // Initial hydration reads external browser storage exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => notify(''), 6500);
    return () => clearTimeout(id);
  }, [notice]);
  const setLocale = (v: Locale) => {
    setLang(v);
    localeRef.current = v;
    localStorage.setItem('reversetrip-lang', v);
    document.documentElement.lang = v;
  };
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem('reversetrip-theme', next);
  };
  const error = (e: unknown) =>
    errorMessage(locale, e instanceof Error ? e.message : 'server_error');
  return (
    <Context.Provider
      value={{
        catalog,
        reloadCatalog: async () => setCatalog(await api<Catalog>('catalog')),
        locale,
        setLocale,
        theme,
        toggleTheme,
        t: (k) => translate(locale, k),
        l: (th, en) => (locale === 'th' ? th : en),
        user,
        authReady,
        authenticate: loadAccount,
        logout: async () => {
          await api('auth/logout', 'POST', {});
          setUser(null);
          revision.current = 0;
          persistTrip(emptyTrip());
          router.push('/');
        },
        trip,
        setTrip: persistTrip,
        add: (activityId, sessionId, participants) => {
          persistTrip(addTripItem(tripRef.current, { activityId, sessionId, participants }));
          notify(translate(locale, 'added'));
        },
        save: async () => {
          const r = await api<{ revision: number }>('trip', 'PUT', {
            trip: tripRef.current,
            revision: revision.current,
          });
          revision.current = r.revision;
          notify(translate(locale, 'saved'));
        },
        notice,
        notify,
        error,
      }}
    >
      {children}
      <div className={`toast ${notice ? 'visible' : ''}`} role="status" aria-live="polite">
        {notice}
      </div>
    </Context.Provider>
  );
}
export function useApp() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('Missing AppProvider');
  return ctx;
}

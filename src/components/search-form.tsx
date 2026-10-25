'use client';
import { useRouter } from 'next/navigation';
import { MapPin, Wallet, Users, Shapes, Search, CalendarDays } from 'lucide-react';
import { useApp } from './providers';
import type { FormEvent } from 'react';
export function SearchForm() {
  const { catalog, t } = useApp(),
    router = useRouter();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget),
      params = new URLSearchParams();
    for (const [key, v] of d.entries()) if (v) params.set(key, String(v));
    router.push('/activities?' + params.toString());
  }
  return (
    <form className="hero-search" onSubmit={submit}>
      <label>
        <span>
          <MapPin />
          {t('destination')}
        </span>
        <select name="province" defaultValue="">
          <option value="">{t('anywhere')}</option>
          {[...new Set(catalog.activities.map((a) => a.province))].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </label>
      <label>
        <span>
          <Wallet />
          {t('budget')}
        </span>
        <select name="budget" defaultValue="">
          <option value="">{t('anyBudget')}</option>
          {[750, 1000, 1500, 3000].map((v) => (
            <option key={v} value={v}>
              ≤ ฿{v.toLocaleString()}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>
          <Users />
          {t('travelers')}
        </span>
        <input type="number" name="travelers" min={1} max={50} defaultValue={1} />
      </label>
      <label>
        <span>
          <Shapes />
          {t('interests')}
        </span>
        <select name="category" defaultValue="">
          <option value="">{t('allCategories')}</option>
          {(['food', 'craft', 'culture', 'nature', 'community', 'workshop'] as const).map((c) => (
            <option key={c} value={c}>
              {t(c)}
            </option>
          ))}
        </select>
      </label>
      <label className="search-date">
        <span>
          <CalendarDays />
          {t('date')}
        </span>
        <input type="date" name="date" />
      </label>
      <button className="btn" type="submit">
        <Search size={18} />
        {t('search')}
      </button>
    </form>
  );
}

'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { SlidersHorizontal, Search, ShieldCheck } from 'lucide-react';
import { useApp } from './providers';
import { ActivityCard, Empty, PageTitle } from './ui';
import { filterActivities, type Filters } from '@/lib/search';
import type { Category } from '@/lib/types';
export function Explore({ group = false }: { group?: boolean }) {
  const { t, catalog, l } = useApp(),
    params = useSearchParams(),
    router = useRouter(),
    [filtersOpen, setFiltersOpen] = useState(false);
  const f: Filters = {
    q: params.get('q') || '',
    province: params.get('province') || '',
    category: (params.get('category') || '') as Category,
    budget: Number(params.get('budget')) || undefined,
    travelers: Number(params.get('travelers')) || 1,
    date: params.get('date') || '',
    sort: params.get('sort') || '',
    groupOnly: group,
  };
  const rows = filterActivities(catalog.activities, f);
  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace((group ? '/group-activities' : '/activities') + '?' + next.toString(), {
      scroll: false,
    });
  }
  return (
    <div className="container page">
      <PageTitle
        eyebrow={group ? 'GO TOGETHER, DISCOVER MORE' : 'FIND YOUR NEXT LOCAL STORY'}
        title={t(group ? 'groupTitle' : 'searchPrompt')}
        copy={t(group ? 'groupCopy' : 'popularCopy')}
      />
      <div className="explore-search panel">
        <label className="search-input">
          <Search size={18} />
          <input
            aria-label={t('search')}
            placeholder={t('searchPlaceholder')}
            value={f.q}
            onChange={(e) => update('q', e.target.value)}
          />
        </label>
        <label className="inline-label">
          {t('destination')}
          <select value={f.province} onChange={(e) => update('province', e.target.value)}>
            <option value="">{t('anywhere')}</option>
            {[...new Set(catalog.activities.map((a) => a.province))].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <button
          className="btn btn-outline filter-toggle"
          onClick={() => setFiltersOpen(!filtersOpen)}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal size={16} />
          {t('filter')}
        </button>
      </div>
      <div className="explore-layout">
        <aside className={`filter-panel panel ${filtersOpen ? 'show' : ''}`}>
          <div className="row-between">
            <h3>
              <SlidersHorizontal size={16} />
              {t('filter')}
            </h3>
            <button
              className="text-btn"
              onClick={() => router.replace(group ? '/group-activities' : '/activities')}
            >
              {t('reset')}
            </button>
          </div>
          <fieldset>
            <legend>{t('budget')}</legend>
            <input
              type="range"
              min={0}
              max={3000}
              step={50}
              value={f.budget || 3000}
              aria-label={t('budget')}
              onChange={(e) => update('budget', e.target.value)}
            />
            <div className="row-between small">
              <span>฿0</span>
              <b>฿{f.budget || 3000}</b>
            </div>
          </fieldset>
          <fieldset>
            <legend>{t('interests')}</legend>
            {(['', 'food', 'craft', 'culture', 'nature', 'community', 'workshop'] as const).map(
              (c) => (
                <label className="check-line" key={c}>
                  <input
                    type="radio"
                    name="category"
                    value={c}
                    checked={f.category === c}
                    onChange={() => update('category', c)}
                  />
                  {t(c || 'allCategories')}
                  <span className="muted">
                    {catalog.activities.filter((a) => !c || a.category === c).length}
                  </span>
                </label>
              ),
            )}
          </fieldset>
          <label className="field">
            {t('travelers')}
            <input
              type="number"
              min={1}
              max={50}
              value={f.travelers}
              onChange={(e) => update('travelers', e.target.value)}
            />
          </label>
          <label className="field">
            {t('date')}
            <input type="date" value={f.date} onChange={(e) => update('date', e.target.value)} />
          </label>
          <div className="notice-box small">
            {l('ราคาที่แสดงเป็นราคาต่อคนต่อกิจกรรม', 'Prices are per person, per activity.')}
          </div>
        </aside>
        <section>
          <div className="results-bar">
            <span>
              <strong>{rows.length}</strong> {t('results')}
            </span>
            <label>
              {t('sort')}
              <select value={f.sort} onChange={(e) => update('sort', e.target.value)}>
                <option value="">{t('recommended')}</option>
                <option value="price-asc">{t('priceAsc')}</option>
                <option value="price-desc">{t('priceDesc')}</option>
                <option value="duration">{t('durationSort')}</option>
              </select>
            </label>
          </div>
          {rows.length ? (
            <div className="cards-grid explore-cards">
              {rows.map((a) => (
                <ActivityCard key={a.id} activity={a} group={group} />
              ))}
            </div>
          ) : (
            <Empty
              title={t('emptyResults')}
              copy={t('emptyHint')}
              action={
                <button
                  className="btn"
                  onClick={() => router.replace(group ? '/group-activities' : '/activities')}
                >
                  {t('reset')}
                </button>
              }
            />
          )}
        </section>
      </div>
      {group && (
        <div className="panel safety-panel">
          <ShieldCheck size={28} />
          <div>
            <h2>{t('safety')}</h2>
            <p>{t('groupSafety')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

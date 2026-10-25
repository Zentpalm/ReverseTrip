'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRight,
  Utensils,
  Palette,
  Landmark,
  Trees,
  House,
  Lightbulb,
  Route,
  CalendarDays,
  Ticket,
  Handshake,
  Compass,
  Sparkles,
  Check,
} from 'lucide-react';
import { useApp } from './providers';
import { ActivityCard, SectionTitle } from './ui';
import { SearchForm } from './search-form';
import type { Category } from '@/lib/types';
const categories = [
  { id: 'food', icon: Utensils },
  { id: 'craft', icon: Palette },
  { id: 'culture', icon: Landmark },
  { id: 'nature', icon: Trees },
  { id: 'community', icon: House },
  { id: 'workshop', icon: Lightbulb },
] as const;
export function Home() {
  const { t, l, catalog } = useApp(),
    [category, setCategory] = useState<Category | ''>('');
  return (
    <>
      <section className="hero">
        <img className="hero-image" src="/images/hero.webp" alt="" />
        <div className="hero-shade" />
        <div className="container hero-content">
          <div className="hero-tag">
            <span />
            {t('heroTag')}
          </div>
          <h1>
            {t('heroTitle')}
            <br />
            <em>{t('heroAccent')}</em>
          </h1>
          <p>{t('heroCopy')}</p>
          <SearchForm />
          <div className="hero-suggestions">
            <span>{l('ลองค้นหา:', 'Try exploring:')}</span>
            {['เชียงใหม่', 'สกลนคร', 'น่าน', 'พังงา'].map((p) => (
              <Link key={p} href={'/activities?province=' + encodeURIComponent(p)}>
                #{p}
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="container section" id="experiences">
        <SectionTitle
          eyebrow="CURATED LOCAL EXPERIENCES"
          title={t('popular')}
          copy={t('popularCopy')}
        />
        <div className="tabs">
          <button className={!category ? 'active' : ''} onClick={() => setCategory('')}>
            {t('allCategories')}
          </button>
          {categories.slice(0, 4).map((c) => (
            <button
              key={c.id}
              className={category === c.id ? 'active' : ''}
              onClick={() => setCategory(c.id)}
            >
              {t(c.id)}
            </button>
          ))}
        </div>
        <div className="cards-grid">
          {catalog.activities
            .filter((a) => !category || a.category === category)
            .slice(0, 6)
            .map((a) => (
              <ActivityCard activity={a} key={a.id} />
            ))}
        </div>
        <div className="center">
          <Link className="btn btn-outline" href="/activities">
            {t('allExperiences')}
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      <section className="section band">
        <div className="container">
          <div className="center-heading">
            <div className="eyebrow amber">DIVERSE THAI SPECIALTIES</div>
            <h2>{t('categoriesTitle')}</h2>
            <p>{t('categoriesCopy')}</p>
          </div>
          <div className="category-grid">
            {categories.map(({ id, icon: Icon }, i) => (
              <Link
                key={id}
                href={'/activities?category=' + id}
                className={`category-tile tone-${i % 3}`}
              >
                <span>
                  <Icon size={26} />
                </span>
                <h3>{t(id)}</h3>
                <small>
                  {catalog.activities.filter((a) => a.category === id).length} {t('activityCount')}
                </small>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="container section planner-promo">
        <div>
          <div className="eyebrow">SMART ROUTE & SCHEDULE</div>
          <h2>{t('plannerTitle')}</h2>
          <p className="intro-copy">{t('plannerCopy')}</p>
          <ul className="feature-list">
            {[
              {
                icon: Route,
                title: l('เผื่อเวลาเดินทางและช่วงพัก', 'Room to travel and breathe'),
                copy: l(
                  'ปรับเวลาประมาณได้ตามการเดินทางจริงของคุณ',
                  'Adjust estimates to suit your actual transport.',
                ),
              },
              {
                icon: Ticket,
                title: l('ส่งคำขอหลายกิจกรรมในครั้งเดียว', 'One request, multiple experiences'),
                copy: l(
                  'ติดตามการตอบรับของผู้จัดแต่ละรายได้',
                  'Track each organizer’s response separately.',
                ),
              },
              { icon: Handshake, title: t('bundle'), copy: t('bundleCopy') },
            ].map(({ icon: Icon, title, copy }) => (
              <li key={title}>
                <Icon />
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link className="btn" href="/trip-planner">
            {t('startPlanning')}
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="promo-itinerary panel">
          <div className="row-between">
            <div>
              <span className="eyebrow">YOUR SLOW TRAVEL DAY</span>
              <h3>{l('หนึ่งวัน ที่เชียงใหม่', 'A day in Chiang Mai')}</h3>
            </div>
            <Compass size={28} />
          </div>
          <span className="badge">
            {l('ตัวอย่างตาราง ไม่ใช่การจอง', 'Illustrative schedule · not a booking')}
          </span>
          <div className="mini-timeline">
            <article>
              <time>09:00</time>
              <div>
                <img src="/images/cooking.webp" alt="" />
                <h4>{l('ลงมือทำอาหารล้านนา', 'Cook something local')}</h4>
                <p>{l('พบเรื่องราวผ่านรสชาติ', 'Stories served through flavour')}</p>
              </div>
            </article>
            <div className="mini-buffer">
              <Route size={14} />
              {l('พักและเดินทาง · ปรับเวลาได้', 'Rest & travel · adjustable')}
            </div>
            <article>
              <time>14:00</time>
              <div>
                <img src="/images/pottery.webp" alt="" />
                <h4>{l('ปั้นความทรงจำด้วยมือคุณ', 'Shape a little memory')}</h4>
                <p>{l('เรียนรู้ศิลปะเครื่องปั้นดินเผา', 'Discover the art of pottery')}</p>
              </div>
            </article>
          </div>
          <div className="notice-box">
            <Check size={16} />
            {t('basicPlanner')}
          </div>
        </div>
      </section>
      <section className="section bundle-band">
        <div className="container">
          <div className="center-heading">
            <div className="eyebrow">MULTI-ACTIVITY BENEFITS</div>
            <h2>{t('bundleTitle')}</h2>
            <p>{t('bundleCopy')}</p>
          </div>
          <div className="bundle-grid">
            {catalog.discounts.tiers.map((tier, i) => (
              <div className={'bundle-tier ' + (i === 1 ? 'featured' : '')} key={tier.count}>
                <span>
                  {tier.count}
                  {i === 2 ? '+' : ''} {t('activityCount')}
                </span>
                <strong>
                  {tier.rateBps / 100}
                  <small>%</small>
                </strong>
                <p>
                  {l('เมื่อยอดร่วมรายการถึง', 'From an eligible subtotal of')} ฿
                  {(tier.minimumSatang / 100).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          <div className="transparency">
            <Handshake size={25} />
            <p>{t('discountNote')}</p>
          </div>
        </div>
      </section>
      <section className="container section">
        <SectionTitle eyebrow="MEET THE COMMUNITY HOSTS" title={t('hostsTitle')} />
        <div className="community-grid">
          {catalog.communities
            .filter((c) =>
              ['community-cooking', 'community-indigo', 'community-amphawa'].includes(c.id),
            )
            .map((c) => (
              <Link
                className="community-card panel"
                key={c.id}
                href={'/activities?province=' + encodeURIComponent(c.province)}
              >
                <img src={c.image} alt={c.name} loading="lazy" />
                <div>
                  <span className="eyebrow">{c.province}</span>
                  <h3>{c.name}</h3>
                  <p>
                    {l(
                      'พบภูมิปัญญาและวิถีชีวิตที่ส่งต่อผ่านผู้คน',
                      'Find local knowledge passed from person to person.',
                    )}
                  </p>
                  <span className="small cyan">
                    {t('sample')}
                    <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
        </div>
      </section>
      <section className="section band">
        <div className="container">
          <div className="center-heading">
            <div className="eyebrow amber">A SIMPLE WAY TO GET AWAY</div>
            <h2>{t('howTitle')}</h2>
          </div>
          <div className="steps-grid">
            {[
              { icon: Compass, title: 'how1', copy: 'how1Copy' },
              { icon: CalendarDays, title: 'how2', copy: 'how2Copy' },
              { icon: Ticket, title: 'how3', copy: 'how3Copy' },
            ].map(({ icon: Icon, title, copy }, i) => (
              <div key={title} className="step-card">
                <span className="step-number">0{i + 1}</span>
                <Icon />
                <h3>{t(title as 'how1')}</h3>
                <p>{t(copy as 'how1Copy')}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container section">
        <div className="join-banner">
          <div>
            <div className="eyebrow">
              <Sparkles size={14} /> FOR LOCAL COMMUNITIES
            </div>
            <h2>{t('joinTitle')}</h2>
            <p>{t('joinCopy')}</p>
          </div>
          <Link className="btn" href="/community/register">
            {t('join')}
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </>
  );
}

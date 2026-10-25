'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Sun, Moon, Luggage, Menu, X, ChevronDown, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { useApp } from './providers';
export function Header() {
  const { t, locale, setLocale, theme, toggleTheme, trip, user, logout } = useApp(),
    path = usePathname(),
    [open, setOpen] = useState(false);
  return (
    <>
      <a href="#main" className="skip-link">
        {locale === 'th' ? 'ข้ามไปยังเนื้อหา' : 'Skip to content'}
      </a>
      <header className="header">
        <div className="header-inner">
          <Link className="brand" href="/">
            <span className="brand-mark">
              <Compass size={23} />
            </span>
            Reverse<span>Trip</span>
            <span className="brand-dot">.</span>
          </Link>
          <nav className={`nav ${open ? 'open' : ''}`} aria-label={t('home')}>
            <Link
              aria-current={path === '/activities' ? 'page' : undefined}
              href="/activities"
              onClick={() => setOpen(false)}
            >
              {t('explore')}
            </Link>
            <Link
              aria-current={path === '/group-activities' ? 'page' : undefined}
              href="/group-activities"
              onClick={() => setOpen(false)}
            >
              {t('groups')}
            </Link>
            <Link
              aria-current={path === '/trip-planner' ? 'page' : undefined}
              href="/trip-planner"
              onClick={() => setOpen(false)}
            >
              {t('planner')}
            </Link>
            <Link href="/community/register" onClick={() => setOpen(false)}>
              {t('host')}
            </Link>
            {!user && (
              <Link className="mobile-auth-link" href="/login" onClick={() => setOpen(false)}>
                {t('login')} / {t('register')}
              </Link>
            )}
            {user && (
              <Link className="mobile-auth-link" href="/my-bookings" onClick={() => setOpen(false)}>
                {t('bookings')}
              </Link>
            )}
          </nav>
          <div className="header-tools">
            <div className="lang-switch" aria-label="Language">
              <button className={locale === 'th' ? 'active' : ''} onClick={() => setLocale('th')}>
                TH
              </button>
              <button className={locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')}>
                EN
              </button>
            </div>
            <button
              className="icon-btn theme-btn"
              aria-label={locale === 'th' ? 'สลับธีม' : 'Toggle theme'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link className="trip-nav" href="/my-trip" aria-label={t('myTrip')}>
              <Luggage size={18} />
              <span>{t('myTrip')}</span>
              <b>{trip.items.length}</b>
            </Link>
            {user ? (
              <details className="account-menu">
                <summary>
                  {user.name.split(' ')[0]}
                  <ChevronDown size={13} />
                </summary>
                <div>
                  <Link href="/profile">{t('profile')}</Link>
                  <Link href="/my-bookings">{t('bookings')}</Link>
                  {['host', 'admin'].includes(user.role) && (
                    <Link href="/community/dashboard">{t('dashboard')}</Link>
                  )}
                  {user.role === 'admin' && <Link href="/admin">{t('admin')}</Link>}
                  <button onClick={() => void logout()}>{t('logout')}</button>
                </div>
              </details>
            ) : (
              <>
                <Link className="login-link" href="/login">
                  {t('login')}
                </Link>
                <Link className="btn btn-small signup-link" href="/register">
                  {t('register')}
                </Link>
              </>
            )}
            <button
              className="icon-btn mobile-menu"
              aria-label="Menu"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
export function DemoBanner() {
  const { catalog, t } = useApp();
  return catalog.demo ? (
    <div className="demo-banner">
      <span />
      {t('demo')}
    </div>
  ) : null;
}
export function Footer() {
  const { t, l } = useApp();
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Link className="brand" href="/">
            ReverseTrip<span className="brand-dot">.</span>
          </Link>
          <p>
            Discover Local. Plan Smarter.
            <br />
            Experience More.
          </p>
          <span className="small muted">
            {l('การเดินทางที่เริ่มต้นจากผู้คน', 'Journeys that begin with people.')}
          </span>
        </div>
        <div>
          <h4>{t('explore')}</h4>
          <Link href="/activities">{t('allExperiences')}</Link>
          <Link href="/group-activities">{t('groups')}</Link>
          <Link href="/trip-planner">{t('planner')}</Link>
        </div>
        <div>
          <h4>{t('myTrip')}</h4>
          <Link href="/my-trip">{t('myTrip')}</Link>
          <Link href="/my-bookings">{t('bookings')}</Link>
          <Link href="/profile">{t('profile')}</Link>
        </div>
        <div>
          <h4>{t('host')}</h4>
          <Link href="/community/register">
            {t('join')} <ArrowUpRight size={12} />
          </Link>
          <Link href="/community/dashboard">{t('dashboard')}</Link>
          <Link href="/privacy">{t('privacy')}</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} ReverseTrip · MVP</span>
        <span>{t('noPayments')}</span>
      </div>
    </footer>
  );
}

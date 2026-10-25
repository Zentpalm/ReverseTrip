// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { AppProvider, useApp } from '../src/components/providers';
import { SearchForm } from '../src/components/search-form';
import { Home } from '../src/components/home';
import { ActivityDetail } from '../src/components/activity-detail';
import { MyTrip, Planner } from '../src/components/trip-pages';
import { AuthPage } from '../src/components/auth-pages';
import { BookingSummary } from '../src/components/booking-pages';
import { fixtureCatalog } from './fixtures';
import { emptyTrip } from '../src/lib/trip';
const { push, replace } = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => '/my-trip',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));
function Controls() {
  const app = useApp();
  return (
    <>
      <button onClick={() => app.setLocale('en')}>Switch English</button>
      <button onClick={app.toggleTheme}>Change theme</button>
      <output data-testid="trip-state">{JSON.stringify(app.trip)}</output>
      <output data-testid="locale">{app.locale}</output>
      <output data-testid="theme">{app.theme}</output>
    </>
  );
}
function wrapper(children: React.ReactNode) {
  return render(
    <AppProvider initialCatalog={fixtureCatalog}>
      {children}
      <Controls />
    </AppProvider>,
  );
}
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  document.documentElement.dataset.theme = 'dark';
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => json({ user: null })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe('Working UI interactions', () => {
  it('search serializes destination, budget, people, interests and dates', async () => {
    const u = userEvent.setup();
    wrapper(<SearchForm />);
    await u.selectOptions(screen.getByRole('combobox', { name: 'ปลายทาง / จังหวัด' }), 'เชียงใหม่');
    await u.selectOptions(screen.getByRole('combobox', { name: 'งบต่อคน / กิจกรรม' }), '1000');
    await u.clear(screen.getByRole('spinbutton', { name: 'ผู้เดินทาง' }));
    await u.type(screen.getByRole('spinbutton', { name: 'ผู้เดินทาง' }), '2');
    await u.selectOptions(screen.getByRole('combobox', { name: 'หมวดหมู่ที่สนใจ' }), 'food');
    await u.click(screen.getByRole('button', { name: 'ค้นหากิจกรรม' }));
    const url = push.mock.calls[0][0] as string;
    const p = new URL(url, 'http://localhost').searchParams;
    expect(p.get('province')).toBe('เชียงใหม่');
    expect(p.get('travelers')).toBe('2');
    expect(p.get('budget')).toBe('1000');
    expect(p.get('category')).toBe('food');
  });
  it('homepage category tabs actually filter the catalog', async () => {
    const u = userEvent.setup();
    wrapper(<Home />);
    expect(
      screen.getAllByRole('article').filter((x) => x.classList.contains('activity-card')),
    ).toHaveLength(2);
    await u.click(screen.getByRole('button', { name: 'ศิลปะและงานฝีมือ' }));
    expect(
      screen.getAllByRole('article').filter((x) => x.classList.contains('activity-card')),
    ).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'ปั้นเครื่องปั้นดินเผา' })).toBeInTheDocument();
  });
  it('switches language/theme immediately and restores preferences after remount', async () => {
    const u = userEvent.setup();
    let view = wrapper(<SearchForm />);
    await u.click(screen.getByRole('button', { name: 'Switch English' }));
    await u.click(screen.getByRole('button', { name: 'Change theme' }));
    expect(screen.getByRole('button', { name: 'Find experiences' })).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('reversetrip-lang')).toBe('en');
    view.unmount();
    view = wrapper(<SearchForm />);
    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('en'));
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });
  it('adds an activity once and persists the selected session and participant count', async () => {
    const u = userEvent.setup();
    wrapper(<ActivityDetail id="cooking" />);
    await u.clear(screen.getByRole('spinbutton', { name: 'จำนวนผู้เข้าร่วม' }));
    await u.type(screen.getByRole('spinbutton', { name: 'จำนวนผู้เข้าร่วม' }), '2');
    await u.click(screen.getByRole('button', { name: 'เพิ่มลงทริปของฉัน' }));
    expect(screen.getByRole('button', { name: 'อยู่ในทริปแล้ว' })).toBeDisabled();
    expect(JSON.parse(localStorage.getItem('reversetrip-trip')!).items).toEqual([
      { activityId: 'cooking', sessionId: 'cooking-am', participants: 2 },
    ]);
  });
  it('trip removal recalculates totals and removes the bundle discount', async () => {
    const u = userEvent.setup();
    localStorage.setItem(
      'reversetrip-trip',
      JSON.stringify({
        ...emptyTrip(),
        startDate: '2030-01-10',
        endDate: '2030-01-10',
        items: [
          { activityId: 'cooking', sessionId: 'cooking-am', participants: 1 },
          { activityId: 'pottery', sessionId: 'pottery-pm', participants: 1 },
        ],
      }),
    );
    wrapper(<MyTrip />);
    await waitFor(() => expect(screen.getByText('฿1,584')).toBeInTheDocument());
    await u.click(screen.getAllByRole('button', { name: 'นำออก' })[1]);
    expect(screen.queryByText('฿1,584')).not.toBeInTheDocument();
    expect(screen.getByText('ส่วนลด Bundle (0%)')).toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId('trip-state').textContent!).items).toHaveLength(1);
  });
  it('the planner fixes conflicting sessions using real recorded slots', async () => {
    const u = userEvent.setup();
    localStorage.setItem(
      'reversetrip-trip',
      JSON.stringify({
        ...emptyTrip(),
        startDate: '2030-01-10',
        endDate: '2030-01-10',
        items: [
          { activityId: 'cooking', sessionId: 'cooking-am', participants: 1 },
          { activityId: 'pottery', sessionId: 'pottery-am', participants: 1 },
        ],
      }),
    );
    wrapper(<Planner />);
    await waitFor(() =>
      expect(screen.getAllByText('ต้องปรับตารางก่อนส่งคำขอ').length).toBeGreaterThan(0),
    );
    await u.click(screen.getByRole('button', { name: 'จัดตารางให้อัตโนมัติ' }));
    await waitFor(() =>
      expect(screen.getByText('ตารางไม่มีช่วงเวลาทับซ้อนตามข้อมูลที่เลือก')).toBeInTheDocument(),
    );
    expect(JSON.parse(screen.getByTestId('trip-state').textContent!).items[1].sessionId).toBe(
      'pottery-pm',
    );
  });
  it('shows translated validation errors rather than accepting invalid registration', async () => {
    const u = userEvent.setup();
    wrapper(<AuthPage register />);
    await u.click(screen.getByRole('button', { name: 'ลงทะเบียน' }));
    expect(screen.getByRole('alert')).toHaveTextContent('กรุณาตรวจสอบข้อมูล');
    expect(push).not.toHaveBeenCalled();
  });
  it('submits a valid registration through the API and navigates after authentication', async () => {
    const u = userEvent.setup();
    const testUser = {
      id: 'u',
      name: 'Test User',
      email: 'test@example.invalid',
      role: 'traveler',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('auth/register')
          ? json({ user: testUser })
          : url.endsWith('/trip')
            ? json(null)
            : json({ user: null }),
      ),
    );
    wrapper(<AuthPage register />);
    await u.type(screen.getByRole('textbox', { name: 'ชื่อ–นามสกุล' }), 'Test User');
    await u.type(screen.getByRole('textbox', { name: 'อีเมล' }), 'test@example.invalid');
    await u.type(screen.getByLabelText('รหัสผ่าน', { exact: true }), 'Test-only-long-password');
    await u.type(
      screen.getByLabelText('ยืนยันรหัสผ่าน', { exact: true }),
      'Test-only-long-password',
    );
    await u.click(screen.getByRole('checkbox'));
    await u.click(screen.getByRole('button', { name: 'ลงทะเบียน' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/my-trip'));
  });
  it('booking uses the server quote and sends no client-computed totals', async () => {
    const u = userEvent.setup();
    const t = {
      ...emptyTrip(),
      startDate: '2030-01-10',
      endDate: '2030-01-10',
      items: [{ activityId: 'cooking', sessionId: 'cooking-am', participants: 1 }],
    };
    localStorage.setItem('reversetrip-trip', JSON.stringify(t));
    const testUser = {
      id: 'u',
      name: 'Test User',
      email: 'test@example.invalid',
      role: 'traveler',
    };
    const fetcher = vi.fn(async (url: string) =>
      url.endsWith('/quote')
        ? json({
            totals: {
              subtotalSatang: 85000,
              discountSatang: 0,
              totalSatang: 85000,
              rateBps: 0,
              commissionSatang: 10200,
              hostPayoutSatang: 74800,
              contributionSatang: 10200,
            },
            plan: { issues: [], rows: [], unscheduled: [] },
          })
        : url.endsWith('/bookings')
          ? json({ id: 'booking-test-id' })
          : url.endsWith('/trip')
            ? json(null)
            : json({ user: testUser }),
    );
    vi.stubGlobal('fetch', fetcher);
    wrapper(<BookingSummary />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'ส่งคำขอจอง' })).toBeEnabled());
    await u.type(screen.getByRole('textbox', { name: 'เบอร์โทรศัพท์' }), '0800000000');
    await u.click(screen.getByRole('checkbox'));
    await u.click(screen.getByRole('button', { name: 'ส่งคำขอจอง' }));
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'ส่งคำขอแล้ว รอการตอบรับจากผู้จัด' }),
      ).toBeInTheDocument(),
    );
    const calls = vi.mocked(fetch).mock.calls;
    const bookingCall = calls.find(([url]) => String(url).endsWith('/bookings'))!;
    const body = JSON.parse(String((bookingCall[1] as RequestInit).body));
    expect(body).not.toHaveProperty('totalSatang');
    expect(body.trip.items[0].activityId).toBe('cooking');
    expect(body.consent).toBe(true);
  });
});

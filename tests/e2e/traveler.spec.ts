import { test, expect } from '@playwright/test';
test('discovery, responsive layout, draft trip, planner and summary', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'ค้นพบกิจกรรมที่ใช่ ในงบที่คุณเลือก' }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'ปลายทาง / จังหวัด', exact: true })
    .selectOption({ label: 'เชียงใหม่' });
  await page.getByRole('button', { name: 'ค้นหากิจกรรม', exact: true }).click();
  await expect(page).toHaveURL(/activities/);
  await expect(page.locator('.activity-card')).toHaveCount(2);
  await page.getByRole('link', { name: 'เวิร์กช็อปทำอาหารไทยในสวนออร์แกนิก', exact: true }).click();
  await page.getByRole('button', { name: 'เพิ่มลงทริปของฉัน' }).click();
  await expect(page.getByRole('button', { name: 'อยู่ในทริปแล้ว' })).toBeDisabled();
  await page.goto('/activities/pottery');
  await page.getByRole('button', { name: 'เพิ่มลงทริปของฉัน' }).click();
  await page.goto('/my-trip');
  await expect(page.locator('.trip-item')).toHaveCount(2);
  await expect(page.locator('.total-row')).toContainText('1,584');
  await page.goto('/trip-planner');
  await page.getByRole('button', { name: 'จัดตารางให้อัตโนมัติ' }).click();
  await expect(page.getByText('ตารางไม่มีช่วงเวลาทับซ้อนตามข้อมูลที่เลือก')).toBeVisible();
  await page.getByRole('link', { name: 'ตรวจสอบและส่งคำขอ' }).click();
  await expect(page.getByRole('link', { name: 'เข้าสู่ระบบเพื่อส่งคำขอ' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
  expect(errors).toEqual([]);
});
test('language and light theme persist', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Find experiences', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
test('traveler registration, booking request, history and cancellation', async ({ page }) => {
  await page.goto('/activities/cooking');
  await page.getByRole('button', { name: 'เพิ่มลงทริปของฉัน' }).click();
  await page.goto('/booking/summary');
  await page.getByRole('link', { name: 'เข้าสู่ระบบเพื่อส่งคำขอ' }).click();
  await page.locator('.auth-tabs').getByRole('link', { name: 'ลงทะเบียน' }).click();
  await page.getByRole('textbox', { name: 'ชื่อ–นามสกุล' }).fill('Disposable E2E Traveler');
  await page
    .getByRole('textbox', { name: 'อีเมล' })
    .fill(`e2e-${crypto.randomUUID()}@example.invalid`);
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill('Disposable-test-password-2026');
  await page.getByLabel('ยืนยันรหัสผ่าน', { exact: true }).fill('Disposable-test-password-2026');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'ลงทะเบียน', exact: true }).click();
  await expect(page).toHaveURL(/booking\/summary/);
  await page.getByRole('textbox', { name: 'เบอร์โทรศัพท์' }).fill('0800000000');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'ส่งคำขอจอง' }).click();
  await expect(
    page.getByRole('heading', { name: 'ส่งคำขอแล้ว รอการตอบรับจากผู้จัด' }),
  ).toBeVisible();
  await page.locator('.success-hero').getByRole('link', { name: 'การจองของฉัน' }).click();
  await expect(page.locator('.booking-history')).toHaveCount(1);
  await page.getByRole('button', { name: 'ยกเลิกรายการ', exact: true }).click();
  await page.getByRole('button', { name: 'ยกเลิกรายการ', exact: true }).click();
  await expect(page.locator('.booking-history .total-row')).toContainText('฿0');
});

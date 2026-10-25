# ReverseTrip — Local Experience Marketplace MVP

เว็บหลายหน้าที่พัฒนาจาก UX/UI Nocturne Siam ในไฟล์ Stitch ของผู้ใช้ มีฐานข้อมูลจริงในเครื่อง ระบบสมาชิก ทริป คำขอจอง หลังบ้านชุมชน และผู้ดูแล **ยังไม่ใช่ระบบพร้อมรับเงินจริงหรือเปิดสาธารณะ**

## เริ่มใช้งานบน Windows / macOS / Linux

ต้องมี **Node.js 24 ขึ้นไป** และ npm เปิดโฟลเดอร์นี้ด้วย VS Code แล้วรัน:

```bash
npm ci
npm run dev
```

เปิด `http://localhost:3000` ระบบสร้าง SQLite และข้อมูลกิจกรรมสาธิต 6 รายการ พร้อมรอบเวลา 60 วันนับจากวันที่เริ่มฐานข้อมูลครั้งแรกให้เอง ไม่ต้องมี API key

ตั้งค่าเพิ่มเติมได้โดยคัดลอก `.env.example` เป็น `.env.local` ใช้ `Copy-Item .env.example .env.local` ใน PowerShell หรือ `cp .env.example .env.local` ใน macOS/Linux จากนั้นแก้ค่าตามต้องการ คำสั่ง CLI อ่าน `.env.local` เช่นเดียวกับ Next.js

## สิ่งที่ทดลองได้ทันที

1. ค้นหาจังหวัด งบต่อคน หมวดหมู่ จำนวนผู้เดินทาง และวันที่
2. เพิ่มกิจกรรมในทริปโดยไม่ต้องล็อกอิน เปลี่ยนรอบเวลา จำนวนคน และลำดับกิจกรรม
3. เลือกเชียงใหม่ แล้วเพิ่มทำอาหาร + ปั้นดินเผา คนละ 1 คน: รวม 1,600 บาท ลด 16 บาท เหลือ 1,584 บาท
4. กดจัดตารางอัตโนมัติ ระบบเลือกเฉพาะรอบที่มีอยู่และเว้นช่วงพัก/เดินทาง
5. สมัครบัญชี ส่งคำขอจอง และดูสถานะที่ `/my-bookings` ไม่มีการชำระเงิน
6. ลองยกเลิกหนึ่งรายการ ส่วนลดและที่ว่างจะคำนวณใหม่
7. สลับ TH/EN และ Dark/Light การตั้งค่าจะอยู่ต่อเมื่อเปลี่ยนหน้าและเปิดเว็บใหม่

บัญชีที่สมัครเป็นนักท่องเที่ยวเสมอ ไม่มีผู้ดูแลหรือรหัสผ่านสำเร็จรูปในซอร์ส ข้อมูลผู้จัดที่มากับ seed ไม่มีรหัสผ่านที่ล็อกอินได้ จึงต้องสร้างชุมชนของคุณเองเพื่อทดสอบหลังบ้าน

## ทดลองชุมชนและผู้ดูแล

1. สมัครบัญชีใหม่ แล้วเปิด `/community/register` กรอกข้อมูลชุมชนฟรี
2. ชุมชนเริ่มด้วยสถานะรอตรวจสอบ สร้างร่างกิจกรรมได้ทันที แต่ยังเผยแพร่ไม่ได้
3. สมัครบัญชีอีกบัญชีสำหรับผู้ดูแล แล้วสั่งจากเครื่องเจ้าของฐานข้อมูล:

```bash
npm run admin:grant -- your-registered-email@example.com
```

4. เข้าบัญชีผู้ดูแล เปิด `/admin` ตรวจและอนุมัติชุมชน
5. กลับบัญชีชุมชน เปิด `/community/activities` สร้าง/แก้ไขกิจกรรม บันทึก แล้วเปิดแก้ไขอีกครั้งเพื่อเพิ่มรอบเวลา
6. เผยแพร่กิจกรรม จากนั้นใช้อีกบัญชีส่งคำขอจอง โฮสต์ตอบรับ/ปฏิเสธได้ที่ `/community/bookings`

การให้สิทธิ์ผู้ดูแลทำได้เฉพาะ CLI ที่เข้าถึงฐานข้อมูล ไม่มีช่องเลือก Admin จากหน้าเว็บ

## โครงสร้างและเทคโนโลยี

- Next.js 16.4.3 App Router, React 19, TypeScript strict
- Tailwind CSS 4 และ CSS tokens/component styles; Lucide icons
- SQLite ผ่าน `node:sqlite` สำหรับใช้งานในเครื่อง
- PostgreSQL adapter ผ่าน `pg` เมื่อกำหนด `DATABASE_URL` — ยังไม่ทดสอบกับบริการจริง
- Authentication: salted scrypt hashes, opaque server sessions, HttpOnly/SameSite cookies
- Zod validation, server authorization, transactions และการจองแบบ idempotent
- Vitest, React Testing Library และ Playwright scenarios
- รูปและฟอนต์โหลดจากโครงงานโดยตรง ไม่มี Tailwind CDN หรือ image hotlink ตอนใช้งาน

```text
src/app/          Next.js routes และ API handlers
src/components/   หน้าเว็บและองค์ประกอบที่ใช้ร่วมกัน
src/lib/          types, ภาษา, ราคา, ค้นหา, ทริป, planner, validation
src/server/       ฐานข้อมูล, auth, catalog, services และ integration contracts
migrations/       schema และ migration history
scripts/          migrate, seed, ให้สิทธิ์ admin, dev/test launchers
tests/            business, backend, API, UI และ browser scenarios
public/           ภาพและฟอนต์ที่ใช้ในเว็บไซต์
docs/             design audit, architecture, deployment และผลทดสอบ
```

## คำสั่งตรวจสอบ

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

`npm test` ใช้ฐานข้อมูลชั่วคราวแยกจากข้อมูลผู้ใช้ ส่วนการทดสอบเบราว์เซอร์ในเครื่องเจ้าของโครงการ:

```bash
npx playwright install chromium
npm run test:e2e
npm run test:e2e:report
```

Playwright ใช้ฐานข้อมูลชั่วคราวและตรวจ 390 / 768 / 1440 px ห้ามชี้ชุดทดสอบไปยังฐานข้อมูลใช้งานจริง ชุด browser scenarios ถูกจัดเตรียมไว้ แต่ยังไม่ได้รันครบในสภาพแวดล้อมที่จัดส่งนี้ ดู `docs/VALIDATION.md`

## ฐานข้อมูลและการนำไปใช้งานต่อ

ค่าเริ่มต้นเก็บใน `data/reversetrip.sqlite` และใช้ WAL ต้องรักษาทั้งไฟล์ฐานข้อมูลและไฟล์ WAL ที่เกี่ยวข้องขณะสำรองข้อมูล ไม่รวมฐานข้อมูลหรือ `node_modules` ใน ZIP

ใช้ `npm run db:migrate` เพื่อรัน numbered migrations และ `npm run db:seed` สำหรับข้อมูลสาธิต คำสั่ง seed ไม่เขียนทับรายการที่มีอยู่ ถ้ารอบสาธิตหมดอายุ ให้ใช้ `SQLITE_PATH` ใหม่เพื่อสร้างชุดสาธิตใหม่ โดยเก็บฐานข้อมูลเดิมไว้

ดู `docs/DEPLOYMENT.md` ก่อนตั้งค่า PostgreSQL หรือ production ฐานข้อมูลสาธิตกับ production ใช้ร่วมกันไม่ได้ ระบบจะปฏิเสธการสลับโหมดบนฐานข้อมูลเดิม

## ข้อจำกัดที่ต้องทราบ

- ไม่มี AI API ภายนอก: ใช้ planner ตามกติกา พร้อมตรวจรอบเวลาและข้อขัดแย้ง
- ไม่มี payment gateway, การรับเงิน, การโอนเงินให้โฮสต์ หรือ webhook จริง
- ยังไม่มีอีเมลยืนยันบัญชี/รีเซ็ตรหัสผ่าน และยังไม่เชื่อม Supabase Auth/Storage
- ผู้จัดเลือกจากภาพตัวอย่างในโครงงาน การอัปโหลดรูปของผู้จัดยังไม่เปิดใช้
- ยังไม่มีระบบหมดอายุคำขอ pending อัตโนมัติ ผู้จัดต้องตอบรับ/ปฏิเสธ หรือผู้ใช้ยกเลิก
- เวลาเดินทางเป็นค่าประมาณที่ผู้ใช้ปรับได้ ไม่ใช้แผนที่หรือจราจรจริง
- สถานะความพร้อมทั้งหมดอยู่ใน `IMPLEMENTATION_STATUS.md`

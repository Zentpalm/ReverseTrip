import type { Database } from './db';
import { DEFAULT_DISCOUNTS } from '../lib/pricing';
import { addDays, bangkokDate } from '../lib/trip';
export async function seedDatabase(db: Database) {
  await db.run(
    'INSERT INTO discount_rules(id,config_json) VALUES (?,?) ON CONFLICT(id) DO NOTHING',
    ['standard', JSON.stringify(DEFAULT_DISCOUNTS)],
  );
  if (process.env.APP_MODE === 'production') return;
  if ((await db.all('SELECT id FROM activities LIMIT 1')).length) return;
  const now = new Date().toISOString();
  const data = [
    [
      'cooking',
      'food',
      'เชียงใหม่',
      'เวิร์กช็อปทำอาหารไทยในสวนออร์แกนิก',
      'Traditional Lanna cooking in an organic garden',
      'ชุมชนบ้านแม่กำปอง',
      850,
      180,
      12,
      'community-mae-kampong',
    ],
    [
      'pottery',
      'craft',
      'เชียงใหม่',
      'ปั้นดินเผาและลงลายครามสไตล์ล้านนา',
      'Lanna pottery & ceramic painting',
      'สตูดิโอดินเผาสันกำแพง',
      750,
      180,
      10,
      'pottery',
    ],
    [
      'indigo',
      'craft',
      'สกลนคร',
      'ย้อมผ้าครามธรรมชาติและทอผ้าฝ้าย',
      'Natural indigo dyeing & cotton weaving',
      'กลุ่มวิสาหกิจครามสกล',
      690,
      180,
      12,
      'community-indigo',
    ],
    [
      'cacao',
      'community',
      'น่าน',
      'จากสวนโกโก้สู่คราฟต์ช็อกโกแลต',
      'From cacao orchard to craft chocolate',
      'น่านโคโค่คอมมูนิตี้',
      950,
      180,
      10,
      'cacao',
    ],
    [
      'paddleboard',
      'nature',
      'พังงา',
      'พายซับบอร์ดชมหมอกและป่าชายเลน',
      'Morning paddleboarding through mangroves',
      'ชุมชนอ่าวพังงา',
      1200,
      150,
      8,
      'paddleboard',
    ],
    [
      'amphawa',
      'culture',
      'สมุทรสงคราม',
      'ล่องเรือเรียนรู้วิถีทำขนมไทยอัมพวา',
      'Amphawa canals & traditional Thai sweets',
      'กลุ่มอนุรักษ์วิถีคลองอัมพวา',
      600,
      180,
      12,
      'community-amphawa',
    ],
  ] as const;
  for (const [
    id,
    category,
    province,
    titleTh,
    titleEn,
    host,
    price,
    duration,
    capacity,
    hostImage,
  ] of data) {
    const uid = 'demo-owner-' + id,
      cid = 'community-' + id;
    await db.run(
      'INSERT INTO users(id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)',
      [uid, `${id}@example.invalid`, host, 'disabled', 'host', now],
    );
    await db.run(
      'INSERT INTO communities(id,owner_id,name,province,description,verification_info,verification,demo,image,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [
        cid,
        uid,
        host,
        province,
        'ชุมชนตัวอย่างเพื่อทดสอบระบบ ยังไม่ใช่ผู้จัดที่เปิดรับจองจริง',
        'DEMO ONLY',
        'verified',
        1,
        `/images/${hostImage}.webp`,
        now,
      ],
    );
    const descTh = `เรียนรู้${titleTh}กับเจ้าของภูมิปัญญาท้องถิ่น ลงมือทำทีละขั้นในบรรยากาศเป็นกันเอง และค้นพบเรื่องราวของชุมชน${province} กิจกรรมและผู้จัดนี้เป็นข้อมูลสาธิตเท่านั้น`;
    const descEn = `Discover ${titleEn.toLowerCase()} with local knowledge, hands-on learning and time to connect with the community. This activity and organizer are demonstration records, not real listings.`;
    await db.run(
      `INSERT INTO activities(id,community_id,title_th,title_en,description_th,description_en,category,province,duration_minutes,price_satang,min_participants,max_participants,min_age,image,included_th,included_en,safety_th,safety_en,cancellation_th,cancellation_en,eligible,demo,status,created_at) VALUES (${Array(24).fill('?').join(',')})`,
      [
        id,
        cid,
        titleTh,
        titleEn,
        descTh,
        descEn,
        category,
        province,
        duration,
        price * 100,
        1,
        capacity,
        id === 'paddleboard' ? 15 : 8,
        `/images/${id}.webp`,
        'อุปกรณ์สำหรับกิจกรรม • ผู้สอนในพื้นที่ • น้ำดื่ม',
        'Activity equipment • Local instructor • Drinking water',
        'ผู้เยาว์ต้องมีผู้ปกครองร่วมกิจกรรม แจ้งข้อจำกัดด้านสุขภาพกับผู้จัดก่อนจอง และทำตามคำแนะนำผู้สอน',
        'Minors must be accompanied by a guardian. Discuss health or access needs with the organizer before booking and follow instructor guidance.',
        'ยกเลิกคำขอก่อนเริ่มกิจกรรมได้ ไม่มีการเก็บเงินหรือการคืนเงินในระบบสาธิต',
        'Requests can be cancelled before the session starts. No money is collected or refunded in this demo.',
        1,
        1,
        'published',
        now,
      ],
    );
    const images =
      id === 'cooking'
        ? ['cooking-detail', 'detail-herbs', 'detail-curry', 'detail-meal', 'detail-pavilion']
        : [id];
    for (const [pos, image] of images.entries())
      await db.run('INSERT INTO activity_images(id,activity_id,url,position) VALUES (?,?,?,?)', [
        `${id}-img-${pos}`,
        id,
        `/images/${image}.webp`,
        pos,
      ]);
    for (let d = 1; d <= 60; d++)
      for (const time of ['09:00', '14:00']) {
        const date = addDays(bangkokDate(), d),
          start = `${date}T${time}:00+07:00`;
        const endTime = new Date(Date.parse(start) + duration * 60000).toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Bangkok',
          hour: '2-digit',
          minute: '2-digit',
        });
        await db.run(
          'INSERT INTO activity_sessions(id,activity_id,starts_at,ends_at,capacity,reserved,group_mode,status) VALUES (?,?,?,?,?,0,?,?)',
          [
            `${id}-${date}-${time.replace(':', '')}`,
            id,
            start,
            `${date}T${endTime}:00+07:00`,
            capacity,
            1,
            'open',
          ],
        );
      }
  }
}

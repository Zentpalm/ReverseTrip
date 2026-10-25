'use client';
import { useApp } from './providers';
import { PageTitle } from './ui';
export function Privacy() {
  const { t, l } = useApp();
  return (
    <div className="container page privacy-content">
      <PageTitle
        title={t('privacy')}
        copy={l(
          'ข้อชี้แจงสำหรับ MVP สาธิต · ยังไม่ใช่เอกสารกฎหมายฉบับพร้อมใช้งานจริง',
          'Demo MVP disclosures · Not a finalized legal policy',
        )}
      />
      {[
        [
          l('ข้อมูลที่ระบบเก็บ', 'Information stored'),
          l(
            'ชื่อ อีเมล รหัสผ่านที่ผ่านการแฮช ทริปที่บันทึก คำขอจอง และข้อมูลติดต่อที่คุณให้ในคำขอ ระบบใช้คุกกี้จำเป็นสำหรับการเข้าสู่ระบบและเก็บภาษา ธีม และร่างทริปไว้ในอุปกรณ์ ไม่มีการเก็บเลขบัตรชำระเงิน',
            'Your name, email, password hash, saved trip, booking requests and the contact information you provide. Essential session cookies support login; language, theme and draft trips are stored on your device. No payment-card data is collected.',
          ),
        ],
        [
          l('ใครมองเห็นข้อมูล', 'Who can access it'),
          l(
            'คุณเห็นทริปและคำขอของตนเอง ผู้จัดเห็นข้อมูลติดต่อเฉพาะรายการที่จองกับชุมชนของตน ผู้ดูแลตรวจข้อมูลชุมชนเพื่ออนุมัติการเผยแพร่ ผู้ร่วมกิจกรรมคนอื่นจะไม่เห็นข้อมูลติดต่อของคุณ',
            'You see your own trips and requests. Organizers see contact details only for items booked with their community. Administrators review community submissions. Other participants cannot see your contact information.',
          ),
        ],
        [
          l('การจองและส่วนลด', 'Requests and discounts'),
          l(
            'การส่งคำขอยังไม่ใช่การยืนยัน ต้องรอผู้จัดตอบรับแต่ละกิจกรรม ระบบนี้ไม่รับเงินและไม่โอนส่วนแบ่ง ส่วนลดเป็นกติกาทดลองที่ต้องประเมินก่อนใช้งานจริง หากยกเลิกรายการ ระบบจะคำนวณราคาและส่วนลดของรายการที่เหลือใหม่',
            'A request is not a confirmed booking. Each organizer must respond. This system neither collects payments nor transfers payouts. Discounts are proposed rules requiring review before launch. Cancelling an item recalculates the remaining trip subtotal and discount.',
          ),
        ],
        [
          l('ผู้เยาว์และความปลอดภัย', 'Minors and safety'),
          l(
            'ตรวจอายุขั้นต่ำของแต่ละกิจกรรม ผู้เยาว์ต้องเดินทางร่วมกับผู้ปกครอง ติดต่อผู้จัดเรื่องข้อจำกัดก่อนเข้าร่วม ไม่มีการรับประกันประกันภัยหรือการคัดกรองผู้เข้าร่วมทุกคน',
            'Check each activity’s minimum age. Minors must attend with a guardian. Discuss participation needs with the organizer. Insurance or universal participant screening is not promised.',
          ),
        ],
        [
          l('ก่อนเปิดใช้งานสาธารณะ', 'Before public launch'),
          l(
            'เจ้าของโครงการต้องกำหนดผู้ควบคุมข้อมูล ช่องทางติดต่อ ระยะเวลาเก็บข้อมูล และกระบวนการขอเข้าถึงหรือลบข้อมูล จัดทำนโยบายความเป็นส่วนตัวและข้อกำหนดที่ผ่านการตรวจสอบ และตั้งค่าระบบอีเมลก่อนใช้งานจริง ยังไม่มีการรับรองความสอดคล้องกับ PDPA',
            'The project owner must define the data controller, contact channel, retention period, access and deletion process, reviewed privacy policy and terms, and email service before public use. PDPA compliance has not been certified.',
          ),
        ],
      ].map(([title, copy]) => (
        <section key={title}>
          <h2>{title}</h2>
          <p>{copy}</p>
        </section>
      ))}
    </div>
  );
}

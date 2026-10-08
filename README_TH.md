# MT56251 Online V3.3 — Admin User Management

เวอร์ชันนี้พัฒนาต่อจาก V3.2 โดยเก็บ `tasks`, `comments`, `profiles` และบัญชี Supabase เดิมไว้ทั้งหมด ไม่ต้องสร้างโปรเจกต์ใหม่

## ติดตั้ง (ทำตามลำดับครั้งเดียว)

1. **Supabase → SQL Editor → New query**: เปิดไฟล์ `MIGRATION_V3_3.sql` คัดลอกทั้งหมด กด Run (Database mode). SQL ไม่ลบข้อมูลเดิม
2. **Supabase → Edge Functions → Deploy a new function → Via Editor**: ตั้งชื่อ `team-admin` แล้วแทนโค้ดทั้งหมดด้วย `supabase/functions/team-admin/index.ts` และ Deploy. ตรวจสอบให้เปิดการตรวจ JWT (Verify JWT) สำหรับ function นี้ตามการตั้งค่าโครงการ
3. สร้าง Edge Function อีกตัวชื่อ `team-password-changed` โดยใช้ `supabase/functions/team-password-changed/index.ts` และ Deploy. เปิด Verify JWT เช่นเดียวกัน
4. ฟังก์ชันทั้งสองใช้ environment variables ของ Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) **เฉพาะฝั่ง Edge Functions**. ห้ามใส่ service role ใน GitHub, HTML หรือ config.js
5. **GitHub Repository**: อัปโหลด `index.html` และ `app.js` จาก ZIP นี้ไปแทนไฟล์เดิม แล้ว Commit changes. **เก็บ `config.js` เดิมไว้**. รอ Actions ผ่าน และรีเฟรชเว็บไซต์ด้วย Ctrl+F5
6. Login Admin → เมนู Admin → `+ เพิ่มสมาชิก` เพื่อสร้างบัญชีด้วยอีเมลและรหัสผ่านชั่วคราว (อย่างน้อย 12 ตัวอักษร) หรือ `โหลดบัญชี` เพื่อเปลี่ยน Role, ตั้งรหัสใหม่, ระงับ/ปลดระงับ

## ข้อควรระวัง

- ใช้ข้อมูลจำลองจนกว่าบริษัทจะอนุมัติการจัดเก็บข้อมูลจริงบน GitHub Pages / Supabase
- หน้า GitHub Pages เป็นสาธารณะ; RLS และ Edge Function เป็นจุดบังคับสิทธิ์จริง ไม่ใช่การซ่อนปุ่ม
- Admin สร้างบัญชีพร้อมยืนยันอีเมลให้โดยตรง: ต้องตรวจสอบว่าเป็นอีเมลของสมาชิกที่ได้รับอนุญาตก่อนสร้างและส่งรหัสผ่านชั่วคราวผ่านช่องทางส่วนตัว
- ผู้ดูแลเปลี่ยนรหัสผ่านให้ Member โดยไม่ต้องส่งอีเมล; Member ถูกบังคับให้เปลี่ยนรหัสเมื่อ Login ครั้งแรก (ขั้นตอนนี้ขึ้นอยู่กับการโหลด profile และ function team-password-changed)
- Admin เปลี่ยน Role ได้ แต่ระบบป้องกันการลดสิทธิ์ Admin คนสุดท้าย
- บัญชีที่ถูกระงับอาจมี session เดิมค้างอยู่จนกว่าจะหมดอายุ: ทดสอบการเพิกถอน session ตามนโยบายก่อนใช้ข้อมูลจริง
- การบันทึก Activity Logs และนโยบายการจัดการงานของ SQL เวอร์ชันก่อนหน้ายังไม่ผ่านการตรวจสอบความปลอดภัยแบบ Production; ต้องตรวจสอบเพิ่มเติมก่อนใช้ข้อมูลจริง
- ห้ามแชร์ Secret Key, Service Role Key หรือรหัสผ่านกับผู้ใด และห้ามนำไปใส่ใน `config.js`

## ทดสอบก่อนใช้งานจริง

1. Admin เพิ่ม Member ทดลองหนึ่งบัญชี → Login จากเบราว์เซอร์อีกเครื่อง → เปลี่ยนรหัสผ่านชั่วคราว
2. Member ไม่เห็น Admin menu และเรียก `team-admin` โดยตรงต้องได้ 403
3. Admin เพิ่ม Admin ร่วม → Admin ร่วมเข้าใช้งานได้
4. Member ไม่สามารถเปลี่ยน `role` ในฐานข้อมูลผ่าน API
5. ลองระงับบัญชีทดสอบ และตรวจสอบการเข้าใช้งานใหม่
6. ทดสอบ Calendar/Gantt/Tasks เดิมยังทำงาน และข้อมูลเดิมยังอยู่

หมายเหตุ: ยังไม่ได้ Deploy ไปยัง Supabase/GitHub ของคุณโดยอัตโนมัติ; ต้องดำเนินการตามขั้นตอนข้างต้น

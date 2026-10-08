# MT56251 Team Work Management – Online V3 (Supabase)

## สถานะ
เว็บต้นแบบสำหรับทดสอบด้วยข้อมูลจำลอง **ไม่ใช่ระบบ Production ที่ผ่านการทดสอบความปลอดภัยแล้ว** ใช้ GitHub Pages เป็น frontend และ Supabase เป็น backend ไม่มี Server ที่ต้องเปิดเอง

## วิธีติดตั้ง
1. เปิด `config.js` แล้วแทน `PASTE_YOUR_SB_PUBLISHABLE_KEY_HERE` ด้วย Publishable Key (`sb_publishable_...`) จาก Supabase → Settings → API Keys ห้ามใช้ `sb_secret_`, service_role หรือรหัสผ่านฐานข้อมูล
2. อัปโหลด `index.html`, `app.js`, `config.js` ไปยัง root ของ GitHub Repository `MT56251-Team-Work` (ไฟล์ `README_TH.md` เพิ่มได้)
3. ไป GitHub → Settings → Pages → Deploy from a branch → main / (root) → Save
4. ที่ Supabase → Authentication → URL Configuration ตั้ง Site URL เป็น `https://pacharapoltu92280.github.io/MT56251-Team-Work/` และเพิ่ม Redirect URL เดียวกัน (ตรวจสอบชื่อบัญชี GitHub และ URL ที่เผยแพร่จริง)
5. เปิด URL GitHub Pages และเข้าสู่ระบบด้วยบัญชีที่สร้างไว้ใน Supabase Authentication → Users

## ข้อจำกัดและความปลอดภัยสำคัญ
- SQL ชุดเดิมที่สร้างก่อนหน้านี้มี RLS ขั้นต้น แต่ **ยังต้องตรวจสอบและแก้ก่อนใช้งานจริง** โดยเฉพาะการแก้ `created_by`/`assigned_to`, การแต่งตั้ง Admin ร่วม, และ Activity Logs ที่ยังไม่มี trigger บันทึกกิจกรรม
- หน้า Admin ใน V3 เป็นคำแนะนำ ไม่ได้มีระบบเพิ่มบัญชีหรือเปลี่ยน Role ผ่านเว็บ เพราะการสร้าง/รีเซ็ตรหัสผ่านผู้ใช้อื่นต้องทำบน backend ที่ปลอดภัย
- Supabase Realtime สำหรับ Postgres Changes อาจต้องเปิดตาราง `tasks` และ `comments` ใน publication `supabase_realtime` ก่อน; หากไม่เปิด ผู้ใช้กด Refresh หน้าเพื่อดึงข้อมูลล่าสุดได้
- RLS ไม่ใช่ระบบจำกัดคนในองค์กรอัตโนมัติ ต้องจำกัดการสมัครสมาชิกและตั้งค่าสิทธิ์ให้ถูกต้อง
- GitHub Pages เป็นเว็บไซต์สาธารณะ: อย่าใส่รหัสผ่าน, Secret Key หรือข้อมูลงานภายในบริษัทลง GitHub
- ใช้ข้อมูลจำลองจนกว่าจะได้รับอนุญาตจากบริษัทสำหรับ Cloud ภายนอก
- Supabase Free อาจมีข้อจำกัดและพักโปรเจกต์เมื่อไม่ใช้งาน ไม่ควรรับประกัน uptime 24/7

## ฟังก์ชันที่มี
Login ด้วย Supabase Email/Password, Dashboard, Tasks (สร้าง/แก้ไข), Comments, Calendar, Gantt 14 วัน, Member list, Export CSV สำหรับ Excel และ subscription การเปลี่ยนแปลงแบบ Realtime เมื่อเปิด publication แล้ว

## การแก้ปัญหา
- Login ไม่ได้: ตรวจสอบ Supabase Authentication → Users และ Email Confirmation
- `permission denied` / `row-level security`: ตรวจสอบ SQL policies, grants และ profile ของบัญชี
- ไม่เห็นข้อมูลอัปเดตทันที: ตรวจ publication ของ Supabase Realtime และรีเฟรชหน้า
- ไม่โหลดหน้าเว็บ: ตรวจ GitHub Pages และ `config.js` ที่ root

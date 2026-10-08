# MT56251 Online V3.1

## สิ่งที่เปลี่ยน
- Members: เจ้าของบัญชีแก้ไข Display Name ได้จากปุ่มแก้ไขชื่อ (ไม่เปลี่ยน Role / UID)
- Calendar: แถบงานยาวตั้งแต่ Start Date ถึง Due Date (รวมวันเริ่มและวันสิ้นสุด) และแยกเลนเมื่อมีงานซ้อนกัน รวมทั้งข้ามสัปดาห์/เดือน
- งานที่ไม่มี Start Date จะแสดงเฉพาะ Due Date; งานที่ไม่มี Due Date จะแสดงเฉพาะ Start Date

## ติดตั้ง
1. สำรองไฟล์ปัจจุบันบน GitHub ก่อน
2. ใน Supabase SQL Editor รัน MIGRATION_V3_1.sql เพียงครั้งเดียว (ห้ามรันซ้ำ เพราะ policy ชื่อซ้ำ)
3. อัปโหลด index.html และ app.js ที่อยู่ใน ZIP นี้ไปแทนไฟล์เดิมที่ root ของ GitHub repository
4. config.js ใน ZIP เป็นเพียงตัวอย่าง placeholder: **เก็บ config.js เดิมของคุณไว้ ไม่ต้องอัปโหลดทับ**
5. Commit changes รอ Actions สำเร็จแล้ว Ctrl+Shift+R เพื่อรีเฟรชเว็บ

## หมายเหตุด้านความปลอดภัย
- การแก้ชื่อทำได้เฉพาะตนเองตาม RLS และ SQL privileges; trigger เดิมยังป้องกัน role/id
- ก่อนนำข้อมูลงานบริษัทจริงขึ้น Supabase ภายนอก ต้องได้รับอนุญาตและทดสอบสิทธิ์อื่น ๆ ให้ครบ
- หากมี policy ชื่อ profiles_self_update อยู่แล้ว ให้ตรวจสอบก่อนรัน migration

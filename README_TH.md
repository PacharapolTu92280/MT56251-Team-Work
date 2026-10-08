# MT56251 Online V2 - คู่มือเริ่มต้น

นี่คือ **ต้นแบบเชื่อมต่อจริงที่ต้องตั้งค่า** ไม่ใช่ระบบที่ Deploy แล้ว และไม่ควรนำข้อมูลบริษัทจริงเข้าระบบจนกว่าจะทดสอบสิทธิ์/ความปลอดภัยครบถ้วน

## สถาปัตยกรรม
- GitHub Pages: โฮสต์ HTML/JS สาธารณะ (อย่าใส่ความลับใน repository)
- Microsoft Entra ID: สมาชิกล็อกอินด้วยบัญชีบริษัท (ไม่มีรหัสผ่านที่แอปเก็บเอง)
- Microsoft Graph: อ่าน/เขียน JSON ในโฟลเดอร์ OneDrive ของผู้ดูแลที่แชร์ให้ทีม
- ไม่ใช้ Microsoft Lists, ไม่สร้าง SharePoint Site ใหม่, ไม่ใช้ฐานข้อมูล Cloud ภายนอก
- OneDrive for Business มีพื้นฐานบริการ SharePoint อยู่เบื้องหลัง จึงไม่สามารถรับประกันการไม่ใช้ SharePoint ในระดับโครงสร้าง Microsoft 365 ได้

## ตั้งค่าก่อนใช้งาน
1. ให้ผู้ดูแล Microsoft 365 ตรวจสอบนโยบายอนุญาต GitHub Pages, OAuth และ Microsoft Graph ก่อน
2. ไปที่ Microsoft Entra admin center > App registrations > New registration (Single tenant) และสร้าง SPA redirect URI เป็น `https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO/` อาจต้องได้รับอนุญาตจาก IT/ผู้ดูแล Tenant
3. ตั้ง delegated permissions: `User.Read` และ `Files.ReadWrite.All` (สิทธิ์กว้าง อาจต้อง Admin consent; ขอให้ผู้ดูแลประเมินก่อนใช้งานจริง)
4. สร้างโฟลเดอร์ MT56251 ใน OneDrive for Business ของผู้ดูแล และแชร์สิทธิ์แก้ไขให้สมาชิกทุกคนตามนโยบายองค์กร
5. หา drive ID และ folder item ID จาก Microsoft Graph Explorer (อาจต้องใช้สิทธิ์ที่องค์กรอนุญาต) แล้วกรอกใน `config.js` พร้อม clientId, tenantId, adminEmails
6. สร้าง GitHub repository (แนะนำ Private หากองค์กรอนุญาต แม้ GitHub Pages อาจยังเปิดให้คนทั่วไปเห็นหน้าเว็บ) แล้วอัปโหลด index.html, app.js, config.js
7. Repository > Settings > Pages > Deploy from branch > main / root; รอ URL และตรวจสอบ Redirect URI ให้ตรง
8. เปิดเว็บ Login แล้ว Admin สร้าง Task แรก; สมาชิกที่ได้รับสิทธิ์ OneDrive จึงอ่าน/แก้ไขข้อมูลได้

## ข้อจำกัดสำคัญ
- ไม่ใช่ Real-time; ผู้ใช้ต้องกด Sync
- JSON ไฟล์เดียวไม่รองรับ transaction หลายผู้ใช้; แม้ส่ง If-Match เพื่อช่วยตรวจชนกัน แต่ OneDrive/Graph อาจไม่บังคับ conditional update ในทุกกรณี: ห้ามถือว่าแก้ปัญหาข้อมูลทับกันได้แน่นอน
- ผู้ที่มีสิทธิ์แก้ไขไฟล์ OneDrive สามารถแก้ JSON นอกแอปได้; Role Admin ที่อยู่ใน JavaScript **ไม่ใช่ security boundary**
- แอปนี้ยังไม่มีการจัดการ conflict แบบ merge, audit trail ที่เชื่อถือได้, หรือการกู้คืนเมื่อบันทึกชนกัน; ต้องทดสอบก่อนใช้งานจริง
- ไม่ได้ใช้ Password Member ของแอป: สมาชิกใช้บัญชี Microsoft 365 ของตนเอง
- GitHub Pages ไม่ใช่ที่เก็บข้อมูลบริษัท ข้อมูลถูกอ่านโดย browser ผ่าน Graph ตามสิทธิ์ผู้ใช้
- Backup และ Version History ของ OneDrive ควรตั้งค่าก่อนใช้จริง


(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const cfg = window.MT_CONFIG || {};
  const siteKey = cfg.guestTurnstileSiteKey || '';

  let widgetId = null;

  const result = $('result');

  const setMsg = (s, ok = false) => {
    result.className = ok ? 'success' : 'error';
    result.textContent = s;
  };

  function renderCaptcha() {
    if (!siteKey) {
      setMsg('ยังไม่ได้ตั้งค่า guestTurnstileSiteKey ใน config.js');
      return;
    }

    if (!window.turnstile) {
      setTimeout(renderCaptcha, 250);
      return;
    }

    widgetId = window.turnstile.render('#turnstileWidget', {
      sitekey: siteKey
    });
  }

  renderCaptcha();

  $('guestForm').addEventListener('submit', async e => {
    e.preventDefault();

    if (!cfg.supabaseUrl || (!widgetId && widgetId !== 0)) {
      setMsg('ระบบยังไม่พร้อม: ตรวจสอบการตั้งค่า Supabase และ CAPTCHA');
      return;
    }

    const token = window.turnstile?.getResponse(widgetId);

    if (!token) {
      setMsg('กรุณายืนยัน CAPTCHA');
      return;
    }

    const btn = $('submitBtn');
    btn.disabled = true;

    setMsg('กำลังส่งคำขอ...');

    try {
      const payload = {
        requesterName: $('requesterName').value.trim(),
        contactEmail: $('contactEmail').value.trim(),
        title: $('taskTitle').value.trim(),
        category: $('category').value,
        priority: $('priority').value,
        dueDate: $('dueDate').value || null,
        details: $('details').value.trim(),
        captchaToken: token
      };

      const response = await fetch(
        cfg.supabaseUrl.replace(/\/$/, '') +
        '/functions/v1/team-guest-request',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': cfg.publishableKey || ''
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json().catch(() => ({
        error: 'Invalid server response'
      }));

      if (!response.ok) {
        throw Error(data.error || 'Request failed');
      }

      $('guestForm').reset();
      mtShowReceipt(data);

      setMsg(
        'ส่งคำขอสำเร็จ! โปรดบันทึกใบรับคำขอด้านล่างไว้เป็นความลับ' + (data.trackingCode?'':' (Tracking Code ยังไม่พร้อม — ติดต่อ Admin)'),
        true
      );

    } catch (err) {
      setMsg(err.message);

    } finally {
      window.turnstile?.reset(widgetId);
      btn.disabled = false;
    }
  });
})();
let mtReceiptData=null;
function mtShowReceipt(data){const box=document.getElementById('mtReceipt');if(!box)return;mtReceiptData={requestId:String(data.requestId||''),trackingCode:String(data.trackingCode||'')};box.hidden=false;document.getElementById('mtReceiptId').textContent=mtReceiptData.requestId;document.getElementById('mtReceiptCode').textContent=mtReceiptData.trackingCode||'ยังไม่พร้อม — ติดต่อ Admin';document.getElementById('mtTrackNow').disabled=!mtReceiptData.trackingCode;}
document.getElementById('mtCopyReceipt').onclick=async()=>{if(!mtReceiptData)return;try{await navigator.clipboard.writeText('Request ID: '+mtReceiptData.requestId+'\nTracking Code: '+mtReceiptData.trackingCode);}catch(e){alert('คัดลอกอัตโนมัติไม่สำเร็จ กรุณาเลือกข้อความแล้วคัดลอก');}};
document.getElementById('mtDownloadReceipt').onclick=()=>{if(!mtReceiptData)return;const data='MT56251 Request Receipt\nRequest ID: '+mtReceiptData.requestId+'\nTracking Code: '+mtReceiptData.trackingCode+'\nKeep this receipt private.\n';const blob=new Blob([data],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='MT56251-Request-'+mtReceiptData.requestId.slice(0,8)+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
document.getElementById('mtTrackNow').onclick=()=>{if(!mtReceiptData?.trackingCode)return;document.getElementById('showGuestTracking').click();document.getElementById('trackRequestId').value=mtReceiptData.requestId;document.getElementById('trackCode').value=mtReceiptData.trackingCode;};

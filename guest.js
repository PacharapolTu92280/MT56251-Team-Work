
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

  // Cloudflare Turnstile
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

  // Submit Guest Request
  $('guestForm').addEventListener('submit', async e => {
    e.preventDefault();

    if (
      !cfg.supabaseUrl ||
      (widgetId === null || widgetId === undefined)
    ) {
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
      // ข้อมูลคำขอ
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

      // ส่งข้อมูลไป Supabase Edge Function
     
const response = await fetch(
  `${window.MT_CONFIG.supabaseUrl}/functions/v1/team-guest-request`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': window.MT_CONFIG.publishableKey
    },
    body: JSON.stringify(payload)
  }
);

      // ตรวจสอบ Response
      const data = await response.json().catch(() => ({
        error: 'Invalid server response'
      }));

      if (!response.ok) {
        throw Error(data.error || 'Request failed');
      }

      // ส่งคำขอสำเร็จ
      $('guestForm').reset();

      setMsg(
        'ส่งคำขอสำเร็จ! Request ID: ' +
        data.requestId +
        ' — โปรดเก็บเลขนี้ไว้สำหรับติดต่อ Admin',
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

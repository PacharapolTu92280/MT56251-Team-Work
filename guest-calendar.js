(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const cfg = window.MT_CONFIG || {};
  const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  let current = new Date(), mode = 'month', tasks = [], loaded = false;
  function switchTab(calendar) {
    $('guestCalendarView').hidden = !calendar;
    $('guestRequestView').hidden = calendar;
    $('showGuestCalendar').classList.toggle('active', calendar);
    $('showGuestRequest').classList.toggle('active', !calendar);
    if (calendar && !loaded) void loadCalendar();
  }
  async function loadCalendar() {
    $('guestCalendarMessage').textContent = 'กำลังโหลด Calendar...';
    try {
      if (!/^https:\/\//.test(cfg.supabaseUrl || '')) throw Error('Supabase URL ไม่ถูกต้อง');
      const resp = await fetch(cfg.supabaseUrl.replace(/\/$/,'') + '/functions/v1/team-guest-calendar', {
        method: 'GET', headers: { 'apikey': cfg.publishableKey || '' }
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !Array.isArray(json.tasks)) throw Error(json.error || 'โหลด Calendar ไม่สำเร็จ');
      tasks = json.tasks; loaded = true;
      $('guestCalendarMessage').textContent = 'แสดงเฉพาะงานที่ Admin เปิดเผย (Read Only)';
      render();
    } catch (e) { $('guestCalendarMessage').textContent = e.message; }
  }
  function dayTasks(d) {
    return tasks.filter(t => {
      const start = t.start_date || t.due_date, end = t.due_date || t.start_date;
      return start && end && start <= d && end >= d && String(t.status).trim().toLowerCase() !== 'completed';
    });
  }
  function events(d) {
    return dayTasks(d).map(t => `<div class="guest-task" title="${safe(t.status)}">${safe(t.title)}</div>`).join('');
  }
  function render() {
    const grid = $('guestCalendarGrid');
    if (mode === 'month') {
      $('guestMonthTitle').textContent = current.toLocaleDateString('th-TH',{month:'long',year:'numeric'});
      const y=current.getFullYear(),m=current.getMonth();
      const first=new Date(y,m,1),last=new Date(y,m+1,0),n=Math.ceil((first.getDay()+last.getDate())/7)*7;
      const base=new Date(y,m,1-first.getDay());
      let html=['อา','จ','อ','พ','พฤ','ศ','ส'].map(x=>`<div class="guest-cal-head">${x}</div>`).join('');
      for(let i=0;i<n;i++){
        const d=new Date(base);d.setDate(base.getDate()+i);
        html+=`<div class="guest-cal-day ${d.getMonth()!==m?'outside':''}"><b>${d.getDate()}</b>${events(key(d))}</div>`;
      }
      grid.innerHTML=html;
    } else {
      const start=new Date(current.getFullYear(),current.getMonth(),current.getDate());
      if(mode==='week')start.setDate(start.getDate()-start.getDay());
      const dates=Array.from({length:mode==='week'?7:1},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d;});
      $('guestMonthTitle').textContent=mode==='week'?`${key(dates[0])} – ${key(dates[6])}`:current.toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'});
      grid.innerHTML=dates.map(d=>`<div class="guest-agenda"><div class="guest-agenda-day"><strong>${safe(d.toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long'}))}</strong>${events(key(d))||'<p class="hint">ไม่มีงานที่เปิดเผย</p>'}</div></div>`).join('');
    }
  }
  $('showGuestRequest').onclick=()=>switchTab(false);
  $('showGuestCalendar').onclick=()=>switchTab(true);
  $('guestPrev').onclick=()=>{const d=new Date(current);if(mode==='month')d.setMonth(d.getMonth()-1);else d.setDate(d.getDate()-(mode==='week'?7:1));current=d;render();};
  $('guestNext').onclick=()=>{const d=new Date(current);if(mode==='month')d.setMonth(d.getMonth()+1);else d.setDate(d.getDate()+(mode==='week'?7:1));current=d;render();};
  $('guestCalendarMode').onchange=e=>{mode=e.target.value;render();};
})();
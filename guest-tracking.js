(() => { 'use strict';
const $=id=>document.getElementById(id);const cfg=window.MT_CONFIG||{};
$('showGuestTracking').onclick=()=>{ $('guestCalendarView').hidden=true;$('guestRequestView').hidden=true;$('guestTrackingView').hidden=false;for(const id of ['showGuestRequest','showGuestCalendar','showGuestTracking'])$(id).classList.toggle('active',id==='showGuestTracking');};
for(const id of ['showGuestRequest','showGuestCalendar'])$(id).addEventListener('click',()=>{$('guestTrackingView').hidden=true;$('showGuestTracking').classList.remove('active');});
$('trackForm').onsubmit=async e=>{e.preventDefault();const out=$('trackResult'),btn=$('trackSubmit');btn.disabled=true;out.textContent='กำลังตรวจสอบ...';
try{const res=await fetch((cfg.supabaseUrl||'').replace(/\/$/,'')+'/functions/v1/team-guest-track',{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.publishableKey||''},body:JSON.stringify({requestId:$('trackRequestId').value.trim(),trackingCode:$('trackCode').value.trim()})});const data=await res.json();if(!res.ok)throw Error(data.error||'ตรวจสอบไม่สำเร็จ');out.textContent='Request: '+data.requestStatus+' | Task: '+(data.taskStatus||'ยังไม่เชื่อม Task')+' | Progress: '+(data.progress===null?'—':data.progress+'%');}catch(err){out.textContent=err.message;}finally{btn.disabled=false;}};
})();

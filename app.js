(()=>{'use strict';
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cfg=window.MT_CONFIG||{};let db=null,user=null,profile=null,tasks=[],members=[],commentTask=null,month=new Date(),channel=null;
const dateOnly=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const today=()=>dateOnly(new Date());const show=(id,yes)=>$(id).classList.toggle('hidden',!yes);
const msg=(s,bad=false)=>{$('notice').textContent=s;$('notice').className=bad?'error':'muted'};
function view(name){for(const id of ['dashboard','tasks','calendar','gantt','members','admin'])show(id,id===name);document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));render();}
function memberColor(id){const m=members.find(x=>x.id===id);return m&&/^#[0-9a-f]{6}$/i.test(m.user_color||'')?m.user_color:'#8291a5'}
function colorDot(id){return `<span class="user-dot" style="background:${memberColor(id)}" aria-hidden="true"></span>`}
function memberName(id){const m=members.find(x=>x.id===id);return m?m.display_name||m.id.slice(0,8):'—'}
function table(items){return `<table><thead><tr><th>งาน</th><th>ประเภท</th><th>สถานะ</th><th>Progress</th><th>ผู้รับผิดชอบ</th><th>Due</th><th>จัดการ</th></tr></thead><tbody>${items.map(t=>`<tr><td><b>${esc(t.title)}</b><div class="muted">${esc(t.description).slice(0,120)}</div></td><td>${esc(t.category)}</td><td><span class="pill">${esc(t.status)}</span></td><td>${t.progress}%<div class="bar"><span style="width:${Number(t.progress)||0}%"></span></div></td><td>${colorDot(t.assigned_to)} ${esc(memberName(t.assigned_to))}</td><td>${esc(t.due_date||'—')}</td><td><button class="secondary" data-edit="${t.id}">แก้ไข</button> <button class="secondary" data-comment="${t.id}">Comments</button></td></tr>`).join('')}</tbody></table>`}
function render(){const total=tasks.length,done=tasks.filter(t=>t.status==='Completed').length,late=tasks.filter(t=>t.due_date&&t.due_date<today()&&t.status!=='Completed').length,doing=tasks.filter(t=>t.status==='In Progress').length;
$('metrics').innerHTML=[['Total Tasks',total],['In Progress',doing],['Completed',done],['Overdue',late]].map(([k,v])=>`<div class="metric"><small>${k}</small><strong>${v}</strong></div>`).join('');
$('upcoming').innerHTML=table(tasks.filter(t=>t.due_date&&t.status!=='Completed').sort((a,b)=>a.due_date.localeCompare(b.due_date)).slice(0,8));
const q=$('search').value.toLowerCase(),f=$('filter').value;$('taskTable').innerHTML=table(tasks.filter(t=>(!f||t.status===f)&&(!q||[t.title,t.description,t.category].some(x=>String(x||'').toLowerCase().includes(q)))));
$('memberTable').innerHTML=`<table><tr><th>ชื่อ</th><th>Role</th><th>สี</th><th>จัดการ</th></tr>${members.map(m=>`<tr><td>${esc(m.display_name||m.id.slice(0,8))}</td><td>${esc(m.role)}</td><td><span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${/^#[0-9a-f]{6}$/i.test(m.user_color)?m.user_color:'#2563eb'}"></span></td><td>${m.id===user?.id?'<button class="secondary" data-edit-name="1">✎ แก้ไขชื่อ</button> <button class="secondary" data-edit-color="1">🎨 เปลี่ยนสี</button>':''}</td></tr>`).join('')}</table>`;
show('admin',!$('admin').classList.contains('hidden')&&profile?.role==='admin');document.querySelector('[data-view="admin"]').classList.toggle('hidden',profile?.role!=='admin');renderCalendar();renderGantt();}
function renderCalendar(){
 const y=month.getFullYear(),m=month.getMonth();
 $('monthTitle').textContent=month.toLocaleDateString('th-TH',{month:'long',year:'numeric'});
 const first=new Date(y,m,1),offset=first.getDay(),last=new Date(y,m+1,0);
 const count=Math.ceil((offset+last.getDate())/7)*7;
 const base=new Date(y,m,1-offset);
 const colors={'Pending':'#718096','In Progress':'#2563eb','Completed':'#138568','On Hold':'#c27b17'};
 let html=['อา','จ','อ','พ','พฤ','ศ','ส'].map(x=>`<div class="muted cal-head">${x}</div>`).join('');
 for(let w=0;w<count/7;w++){
  const start=new Date(base);start.setDate(base.getDate()+w*7);
  const end=new Date(start);end.setDate(start.getDate()+6);
  const startKey=dateOnly(start),endKey=dateOnly(end);
  const overlaps=tasks.filter(t=>{const a=t.start_date||t.due_date,b=t.due_date||t.start_date;return a&&b&&a<=endKey&&b>=startKey;})
    .sort((a,b)=>(a.start_date||a.due_date).localeCompare(b.start_date||b.due_date)||String(a.title).localeCompare(String(b.title)));
  const occupied=[];let bars='';
  for(const t of overlaps){
   const a=t.start_date||t.due_date,b=t.due_date||t.start_date;
   const lane=occupied.findIndex(endDay=>endDay<a);
   const slot=lane<0?occupied.length:lane;
   if(lane<0)occupied.push(b);else occupied[lane]=b;
   // Date-only arithmetic in UTC avoids DST offsets.
   const dayDiff=(x,z)=>(Date.parse(x+'T00:00:00Z')-Date.parse(z+'T00:00:00Z'))/86400000;
   const left=Math.max(0,dayDiff(a,startKey)),right=Math.min(6,dayDiff(b,startKey));
   const color=memberColor(t.assigned_to);
   bars+=`<div class="cal-span" style="grid-column:${left+1}/${right+2};grid-row:${slot+1};background:${color}" title="${esc(t.title)} | ${esc(a)} → ${esc(b)} | ${esc(t.status)}">${a<startKey?'↤ ':''}${esc(t.title)}${b>endKey?' ↦':''}</div>`;
  }
  const lanes=Math.max(1,occupied.length);
  html+=`<div class="cal-week" style="--lanes:${lanes}">`;
  for(let d=0;d<7;d++){
   const date=new Date(start);date.setDate(start.getDate()+d);
   html+=`<div class="day ${date.getMonth()===m?'':'outside'}" style="grid-column:${d+1};grid-row:1"><b>${date.getDate()}</b></div>`;
  }
  html+=`<div class="cal-events" style="--lanes:${lanes}">${bars}</div></div>`;
 }
 $('calendarGrid').innerHTML=html;
}
function renderGantt(){const days=Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return dateOnly(d)});let h=`<div>Task</div>${days.map(d=>`<div>${d.slice(5)}</div>`).join('')}`;for(const t of tasks.filter(x=>x.start_date&&x.due_date)){const color=memberColor(t.assigned_to);h+=`<div title="${esc(t.title)}">${colorDot(t.assigned_to)} ${esc(t.title)}</div>`+days.map(d=>`<div class="${d>=t.start_date&&d<=t.due_date?'filled':''}" style="${d>=t.start_date&&d<=t.due_date?'background:'+color:''}">${d===t.start_date?'●':''}</div>`).join('')}$('ganttGrid').innerHTML=`<div class="gantt">${h}</div>`;}
async function refresh(){if(!user)return;const [tr,mr,pr]=await Promise.all([db.from('tasks').select('*').order('created_at',{ascending:false}),db.from('profiles').select('id,display_name,role,user_color'),db.from('profiles').select('id,role,display_name,must_change_password').eq('id',user.id).single()]);if(tr.error||mr.error||pr.error){msg('โหลดข้อมูลไม่สำเร็จ: '+[tr.error,mr.error,pr.error].filter(Boolean).map(e=>e.message).join(' / '),true);return}tasks=tr.data||[];members=mr.data||[];profile=pr.data;$('identity').textContent=`${profile.display_name||user.email} (${profile.role})`;render();}
async function signedIn(u){user=u;show('auth',!u);show('app',!!u);show('logout',!!u);show('selfPassword',!!u);show('setup',false);if(channel){await db.removeChannel(channel);channel=null}if(u){await refresh();if(profile?.must_change_password)openSelfPassword(true);channel=db.channel('mt56251-updates').on('postgres_changes',{event:'*',schema:'public',table:'tasks'},()=>refresh()).on('postgres_changes',{event:'*',schema:'public',table:'profiles'},()=>refresh()).on('postgres_changes',{event:'*',schema:'public',table:'comments'},()=>{if(commentTask)loadComments()}).subscribe();}}
function openTask(id){const t=tasks.find(x=>x.id===id);$('taskForm').reset();$('taskId').value=t?.id||'';$('dialogTitle').textContent=t?'แก้ไขงาน':'เพิ่มงาน';for(const k of ['title','description','category','status','progress','start_date','due_date'])if(t&&t[k]!=null)$(k).value=t[k];$('assigned_to').innerHTML='<option value="">ไม่ระบุ</option>'+members.map(m=>`<option value="${m.id}">${esc(m.display_name||m.id.slice(0,8))}</option>`).join('');$('assigned_to').value=t?.assigned_to||'';$('taskMsg').textContent='';$('taskDialog').showModal();}
async function loadComments(){if(!commentTask)return;const {data,error}=await db.from('comments').select('*').eq('task_id',commentTask).order('created_at');$('commentsList').innerHTML=error?esc(error.message):(data||[]).map(c=>`<p><b>${esc(memberName(c.author_id))}</b> <small>${new Date(c.created_at).toLocaleString('th-TH')}</small><br>${esc(c.message)}</p>`).join('')||'<p class="muted">ยังไม่มีความคิดเห็น</p>';}
async function openComments(id){commentTask=id;$('commentTitle').textContent='Comments: '+(tasks.find(t=>t.id===id)?.title||'');$('commentMsg').textContent='';$('commentsDialog').showModal();await loadComments();}
async function boot(){if(!window.supabase||!cfg.supabaseUrl||!cfg.publishableKey||cfg.publishableKey.includes('PASTE_')){$('setupMsg').textContent='ยังไม่ได้ใส่ Publishable Key ใน config.js หรือโหลด Supabase library ไม่สำเร็จ';return}db=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey);const {data,error}=await db.auth.getSession();if(error)console.warn(error);await signedIn(data?.session?.user||null);db.auth.onAuthStateChange((_event,session)=>{if(session?.user?.id!==user?.id)void signedIn(session?.user||null)});}
$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginMsg').textContent='กำลังเข้าสู่ระบบ...';const {error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});$('loginMsg').textContent=error?error.message:'';};
$('forgot').onclick=async()=>{const email=$('email').value.trim();if(!email){$('loginMsg').textContent='กรอก Email ก่อน';return}const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});$('loginMsg').textContent=error?error.message:'หากบัญชีนี้มีอยู่ ระบบจะส่งอีเมลรีเซ็ต (ต้องตั้งค่า URL ใน Supabase ก่อน)';};
$('cancelName').onclick=()=>$('nameDialog').close();
$('cancelColor').onclick=()=>$('colorDialog').close();
$('colorForm').onsubmit=async e=>{e.preventDefault();const color=$('newUserColor').value;if(!/^#[0-9a-f]{6}$/i.test(color)){ $('colorMsg').textContent='สีไม่ถูกต้อง';return;}$('colorMsg').textContent='กำลังบันทึก...';const {error}=await db.from('profiles').update({user_color:color}).eq('id',user.id);if(error){$('colorMsg').textContent=error.message;return;}$('colorDialog').close();await refresh();};
$('nameForm').onsubmit=async e=>{e.preventDefault();const name=$('newDisplayName').value.trim();if(!name){$('nameMsg').textContent='กรุณากรอกชื่อ';return}const {error}=await db.from('profiles').update({display_name:name}).eq('id',user.id);if(error){$('nameMsg').textContent=error.message;return}$('nameDialog').close();await refresh();};
$('logout').onclick=()=>db.auth.signOut();document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>{view(b.dataset.view);if(b.dataset.view==='admin')void loadAdminUsers();});$('newTask').onclick=()=>openTask(null);$('cancelTask').onclick=()=>$('taskDialog').close();$('search').oninput=render;$('filter').onchange=render;
$('taskForm').onsubmit=async e=>{e.preventDefault();const id=$('taskId').value;const data={title:$('title').value.trim(),description:$('description').value,category:$('category').value,status:$('status').value,progress:Number($('progress').value),start_date:$('start_date').value||null,due_date:$('due_date').value||null,assigned_to:$('assigned_to').value||null};if(data.start_date&&data.due_date&&data.start_date>data.due_date){$('taskMsg').textContent='Due Date ต้องไม่ก่อน Start Date';return}const result=id?await db.from('tasks').update(data).eq('id',id):await db.from('tasks').insert({...data,created_by:user.id});if(result.error){$('taskMsg').textContent=result.error.message;return}$('taskDialog').close();await refresh();};
document.addEventListener('click',e=>{const a=e.target.closest('[data-edit]'),b=e.target.closest('[data-comment]');if(a)openTask(a.dataset.edit);if(b)openComments(b.dataset.comment);if(e.target.closest('[data-edit-name]')){$('newDisplayName').value=profile?.display_name||'';$('nameMsg').textContent='';$('nameDialog').showModal()}if(e.target.closest('[data-edit-color]')){$('newUserColor').value=memberColor(user.id)==='#8291a5'?'#2563eb':memberColor(user.id);$('colorMsg').textContent='';$('colorDialog').showModal()}});$('closeComments').onclick=()=>{$('commentsDialog').close();commentTask=null};$('commentForm').onsubmit=async e=>{e.preventDefault();const message=$('commentText').value.trim();if(!message)return;const {error}=await db.from('comments').insert({task_id:commentTask,author_id:user.id,message});if(error){$('commentMsg').textContent=error.message;return}$('commentText').value='';await loadComments();};
$('prevMonth').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);renderCalendar()};$('nextMonth').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);renderCalendar()};
$('export').onclick=()=>{const cols=['title','description','category','status','progress','start_date','due_date','assigned_to','created_at'];const csv='\ufeff'+[cols.join(','),...tasks.map(t=>cols.map(k=>'"'+String(t[k]??'').replace(/"/g,'""')+'"').join(','))].join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='MT56251_Tasks_'+today()+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};

// Admin actions are authorized again on the server. Never put a secret key in this file.
async function adminRequest(payload){
 const {data:{session},error:sessionError}=await db.auth.getSession();
 if(sessionError||!session?.access_token)throw Error('กรุณา Login ใหม่');
 const endpoint=cfg.supabaseUrl.replace(/\/$/,'')+'/functions/v1/team-admin';
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.publishableKey,'Authorization':'Bearer '+session.access_token},body:JSON.stringify(payload)});
 const result=await response.json().catch(()=>({error:'Invalid server response'}));
 if(!response.ok)throw Error(result.error||'Request failed ('+response.status+')');
 return result;
}
async function loadAdminUsers(){
 if(profile?.role!=='admin')return;
 $('adminMsg').textContent='กำลังโหลด...';
 try{
  const result=await adminRequest({action:'list'});
  const rows=result.users||[];
  $('adminUsers').innerHTML='<table><thead><tr><th>ชื่อ / Email</th><th>Role</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>'+rows.map(x=>{
   const m=members.find(v=>v.id===x.id)||{};
   return `<tr><td><b>${esc(m.display_name||x.email||x.id.slice(0,8))}</b><div class="muted">${esc(x.email||'')}</div></td><td>${esc(m.role||'member')}</td><td>${x.banned_until&&new Date(x.banned_until)>new Date()?'ระงับ':'ใช้งาน'}</td><td><button class="secondary" data-admin-action="reset_password" data-user-id="${x.id}">ตั้งรหัสใหม่</button> <button class="secondary" data-admin-action="set_role" data-user-id="${x.id}">เปลี่ยน Role</button> <button class="secondary" data-admin-action="${x.banned_until&&new Date(x.banned_until)>new Date()?'unban':'ban'}" data-user-id="${x.id}">${x.banned_until&&new Date(x.banned_until)>new Date()?'ปลดระงับ':'ระงับ'}</button></td></tr>`;
  }).join('')+'</tbody></table>';
  $('adminMsg').textContent=`บัญชี ${rows.length} รายการ`;
 }catch(e){$('adminMsg').textContent=e.message;}
}
function openAdminDialog(action,id=''){
 $('adminForm').reset();$('adminAction').value=action;$('adminTargetId').value=id;
 $('adminDialogMsg').textContent='';
 $('adminCreateFields').classList.toggle('hidden',action!=='create');
 $('adminRoleField').classList.toggle('hidden',!['create','set_role'].includes(action));
 $('adminPasswordField').classList.toggle('hidden',!['create','reset_password'].includes(action));
 $('adminDialogTitle').textContent=action==='create'?'เพิ่มบัญชี':action==='set_role'?'เปลี่ยนสิทธิ์':'ตั้งรหัสผ่านใหม่';
 $('adminDialog').showModal();
}
$('adminReload').onclick=loadAdminUsers;
$('adminAdd').onclick=()=>openAdminDialog('create');
$('adminCancel').onclick=()=>$('adminDialog').close();
document.addEventListener('click',async e=>{
 const btn=e.target.closest('[data-admin-action]');if(!btn)return;
 const action=btn.dataset.adminAction,id=btn.dataset.userId;
 if(action==='reset_password'||action==='set_role'){openAdminDialog(action,id);return;}
 if(!confirm(action==='ban'?'ยืนยันระงับบัญชีนี้?':'ยืนยันปลดระงับบัญชีนี้?'))return;
 try{await adminRequest({action,userId:id});await loadAdminUsers();}catch(err){$('adminMsg').textContent=err.message;}
});
$('adminForm').onsubmit=async e=>{
 e.preventDefault();const action=$('adminAction').value;
 const data={action,userId:$('adminTargetId').value,email:$('adminEmail').value.trim(),name:$('adminName').value.trim(),role:$('adminRole').value,password:$('adminPassword').value};
 $('adminDialogMsg').textContent='กำลังบันทึก...';
 try{await adminRequest(data);$('adminDialog').close();await refresh();await loadAdminUsers();}
 catch(err){$('adminDialogMsg').textContent=err.message;}
};
let forcePassword=false;
function openSelfPassword(required=false){forcePassword=required;$('changePasswordMsg').textContent=required?'กรุณาตั้งรหัสผ่านใหม่ก่อนทำงาน':' ';$('changePasswordCancel').disabled=required;$('changePasswordDialog').showModal();}
$('selfPassword').onclick=()=>openSelfPassword(false);
$('changePasswordCancel').onclick=()=>{if(!forcePassword)$('changePasswordDialog').close()};
$('changePasswordForm').onsubmit=async e=>{
 e.preventDefault();const password=$('selfNewPassword').value;
 if(password.length<12){$('changePasswordMsg').textContent='ต้องมีอย่างน้อย 12 ตัวอักษร';return;}
 const {error}=await db.auth.updateUser({password});if(error){$('changePasswordMsg').textContent=error.message;return;}
 if(forcePassword){
  // Server verifies the caller is this user before clearing the flag.
  try{
   const {data:{session}}=await db.auth.getSession();
   const resp=await fetch(cfg.supabaseUrl.replace(/\/$/,'')+'/functions/v1/team-password-changed',{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.publishableKey,'Authorization':'Bearer '+session.access_token},body:'{}'});
   if(!resp.ok)throw Error('ไม่สามารถยืนยันการเปลี่ยนรหัสผ่านได้');
  }catch(err){$('changePasswordMsg').textContent=err.message;return;}
 }
 forcePassword=false;$('changePasswordDialog').close();$('selfNewPassword').value='';await refresh();
};

boot().catch(e=>{$('setupMsg').textContent=e.message;show('setup',true)});
})();

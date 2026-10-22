(()=>{'use strict';
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cfg=window.MT_CONFIG||{};let db=null,user=null,profile=null,tasks=[],members=[],collaboratorsByTask=new Map(),commentTask=null,historyTask=null,month=new Date(),calendarMode="month",ganttStart="",ganttEnd="",ganttSelectedOwners=null,ganttSortOrder="old",detailTask=null,attachmentTask=null,channel=null;
const dateOnly=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const today=()=>dateOnly(new Date());ganttStart=dateOnly(new Date(new Date().getFullYear(),new Date().getMonth(),1));ganttEnd=dateOnly(new Date(new Date().getFullYear(),new Date().getMonth()+2,0));const show=(id,yes)=>$(id).classList.toggle('hidden',!yes);
const msg=(s,bad=false)=>{$('notice').textContent=s;$('notice').className=bad?'error':'muted'};
function view(name){if(['requests','teams'].includes(name)&&profile?.role!=='admin')name='tasks';if(profile?.role==='guest')name='tasks';for(const id of ['dashboard','tasks','calendar','gantt','members','admin','requests','teams'])show(id,id===name);document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));render();}
function memberColor(id){const m=members.find(x=>x.id===id);return m&&/^#[0-9a-f]{6}$/i.test(m.user_color||'')?m.user_color:'#8291a5'}
function colorDot(id){return `<span class="user-dot" style="background:${memberColor(id)}" aria-hidden="true"></span>`}
function taskSchedule(t){return [t.start_date||'—',t.start_time?String(t.start_time).slice(0,5):'', '→',t.due_date||'—',t.end_time?String(t.end_time).slice(0,5):''].filter(Boolean).join(' ')}
function taskCoIds(t){return collaboratorsByTask.get(t.id)||[]}
function taskCoNames(t){return taskCoIds(t).map(memberName)}
function taskTeamLabel(t){const n=taskCoIds(t).length;return taskOwnerLabel(t)+(n?` +${n} Co-PIC`:'')}
function taskMemberIds(t){return [...new Set([t.assigned_to,...taskCoIds(t)].filter(Boolean))]}
function taskOwnerLabel(t){return t.assigned_to ? memberName(t.assigned_to) : 'ยังไม่ระบุผู้รับผิดชอบ'}
function memberName(id){const m=members.find(x=>x.id===id);return m?m.display_name||m.id.slice(0,8):'—'}
function canManageTask(t){return profile?.role==='admin'||(profile?.role==='member'&&t.assigned_to===user?.id)}
function table(items){return `<table><thead><tr><th>งาน</th><th>ประเภท</th><th>สถานะ</th><th>Progress</th><th>ผู้รับผิดชอบ</th><th>Due</th><th>จัดการ</th></tr></thead><tbody>${items.map(t=>`<tr><td><b>${esc(t.title)}</b> ${t.priority?`<span class="v40-priority ${v40PriorityClass(t)}">${esc(t.priority)}</span>`:''} <span class="task-owner-inline">(${esc(taskTeamLabel(t))})</span><div class="muted">${esc(t.description).slice(0,120)}</div></td><td>${esc(t.category)}</td><td><span class="pill">${esc(t.status)}</span></td><td>${t.progress}%<div class="bar"><span style="width:${Number(t.progress)||0}%"></span></div></td><td>${colorDot(t.assigned_to)} ${esc(memberName(t.assigned_to))}</td><td>${esc(t.due_date||'—')}${t.end_time?' '+esc(String(t.end_time).slice(0,5)):''}</td><td>${canManageTask(t)?`<button class="secondary" data-edit="${t.id}">แก้ไข</button>`:''} <button class="secondary" data-comment="${t.id}">Comments</button> <button class="secondary" data-history="${t.id}">History</button> ${canManageTask(t)?`<button class="secondary" data-attachment-task="${t.id}">แนบไฟล์</button> <button class="secondary" data-priority-task="${t.id}">Priority</button> <button class="danger" data-delete-task="${t.id}">ลบงาน</button>`:''}</td></tr>`).join('')}</tbody></table>`}
function render(){const total=tasks.length,done=tasks.filter(t=>t.status==='Completed').length,late=tasks.filter(t=>t.due_date&&t.due_date<today()&&t.status!=='Completed').length,doing=tasks.filter(t=>t.status==='In Progress').length;
$('metrics').innerHTML=[['Total Tasks',total],['In Progress',doing],['Completed',done],['Overdue',late]].map(([k,v])=>`<div class="metric"><small>${k}</small><strong>${v}</strong></div>`).join('');
 renderDashboardCharts();
$('upcoming').innerHTML=table(tasks.filter(t=>t.due_date&&t.status!=='Completed').sort((a,b)=>a.due_date.localeCompare(b.due_date)).slice(0,8));
const q=$('search').value.trim().toLowerCase(),f=$('filter').value,owner=$('ownerFilter').value;
 const ownerSelect=$('ownerFilter');
 const previousOwner=ownerSelect.value;
 const ownerOptions='<option value="">ผู้รับผิดชอบทุกคน</option><option value="__unassigned__">ยังไม่มอบหมาย</option>'+members.filter(m=>m.role!=='guest').map(m=>`<option value="${esc(m.id)}">${esc(m.display_name||m.id.slice(0,8))}</option>`).join('');
 if(ownerSelect.innerHTML!==ownerOptions){ownerSelect.innerHTML=ownerOptions;ownerSelect.value=previousOwner;if(ownerSelect.value!==previousOwner)ownerSelect.value='';}
 $('taskTable').innerHTML=table(tasks.filter(t=>(!$('v40MyTasks').checked||taskMemberIds(t).includes(user?.id))&&(!f||t.status===f)&&(!owner||(owner==='__unassigned__'?!taskMemberIds(t).length:taskMemberIds(t).includes(owner)))&&(!q||[t.title,t.description,t.category,taskOwnerLabel(t),...taskCoNames(t)].some(x=>String(x||'').toLowerCase().includes(q)))));
$('memberTable').innerHTML=`<table><tr><th>ชื่อ</th><th>Role</th><th>สี</th><th>จัดการ</th></tr>${members.map(m=>`<tr><td>${esc(m.display_name||m.id.slice(0,8))}</td><td>${esc(m.role)}</td><td><span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${/^#[0-9a-f]{6}$/i.test(m.user_color)?m.user_color:'#2563eb'}"></span></td><td>${m.id===user?.id?'<button class="secondary" data-edit-name="1">✎ แก้ไขชื่อ</button> <button class="secondary" data-edit-color="1">🎨 เปลี่ยนสี</button>':''}</td></tr>`).join('')}</table>`;
show('admin',!$('admin').classList.contains('hidden')&&profile?.role==='admin');document.querySelector('[data-view="admin"]').classList.toggle('hidden',profile?.role!=='admin');document.querySelector('[data-view="requests"]').classList.toggle('hidden',profile?.role!=='admin');document.querySelector('[data-view="teams"]').classList.toggle('hidden',profile?.role!=='admin');v40RefreshOwnerOptions();ganttRenderOwnerMenu();renderCalendar();renderGantt();renderRemainingTasks();v40RenderDashboard();v40WeeklyReport();if(!$('requests').classList.contains('hidden'))void loadTaskRequests();}

// Dashboard charts use live tasks already loaded from Supabase. No external chart dependency.
function renderDashboardCharts(){
 const statusOrder=['Pending','In Progress','On Hold','Completed'];
 const statusColors=['#98a2b3','#4478d7','#e7a83e','#2caa83'];
 const statusCounts=statusOrder.map(s=>tasks.filter(t=>t.status===s).length);
 const max=Math.max(1,...statusCounts);
 const statusHtml=statusOrder.map((s,i)=>`<div class="status-chart-row"><span>${esc(s)}</span><div class="status-track"><div class="status-fill" style="width:${100*statusCounts[i]/max}%;background:${statusColors[i]}"></div></div><strong>${statusCounts[i]}</strong></div>`).join('');
 $('statusChart').innerHTML=statusHtml;
 const categoryOrder=['Daily Operations','Project Response','Process Improvement'];
 const categoryColors=['#334155','#d7193f','#386be0','#20a478','#e7a83e','#8b5cf6'];
 const counts=new Map();
 for(const t of tasks){const name=String(t.category||'ไม่ระบุประเภท');counts.set(name,(counts.get(name)||0)+1);}
 const names=[...categoryOrder.filter(x=>counts.has(x)),...Array.from(counts.keys()).filter(x=>!categoryOrder.includes(x)).sort()];
 const total=tasks.length;
 let running=0;
 const slices=names.map((name,i)=>{const value=counts.get(name);const start=running;running+=value;return `${categoryColors[i%categoryColors.length]} ${100*start/total}% ${100*running/total}%`;});
 const ring=total?`conic-gradient(${slices.join(',')})`:'conic-gradient(#e4e7ec 0% 100%)';
 const legend=names.map((name,i)=>`<div class="category-legend-row"><span class="chart-swatch" style="background:${categoryColors[i%categoryColors.length]}"></span><span>${esc(name)}</span><strong>${counts.get(name)}</strong></div>`).join('');
 $('categoryChart').innerHTML=`<div class="donut-chart" style="background:${ring}" role="img" aria-label="สัดส่วนประเภทงาน"><div class="donut-hole"><strong>${total}</strong><small>Tasks</small></div></div><div class="category-legend">${legend||'<span class="muted">ยังไม่มีงาน</span>'}</div>`;
}

// V4.0 Calendar filters and compact per-day items.
let v40SelectedDate=today();
// null = all members; Set = explicitly selected members.
let v405SelectedOwners = null;

function v40PriorityClass(t){return 'v40-'+String(t.priority||'P3').toLowerCase();}
function v40CalendarTasks(){
 const ownerIds=v405SelectedOwners,category=$('calCategory').value,status=$('calStatus').value,priority=$('calPriority').value,mine=$('calMine').checked;
 return tasks.filter(t=>String(t.status||'').trim().toLowerCase()!=='completed'&&(ownerIds===null||ownerIds.size===0||taskMemberIds(t).some(id=>ownerIds.has(id)))&&(!category||t.category===category)&&(!status||t.status===status)&&(!priority||(t.priority||'P3')===priority)&&(!mine||taskMemberIds(t).includes(user?.id)));
}
function v40InDay(t,key){const a=t.start_date||t.due_date,b=t.due_date||t.start_date;return !!(a&&b&&a<=key&&b>=key);}
function v40DayItems(key){return v40CalendarTasks().filter(t=>v40InDay(t,key)).sort((a,b)=>Number((a.priority||'P3').slice(1))-Number((b.priority||'P3').slice(1))||(a.start_time||'').localeCompare(b.start_time||''));}
function v40Chip(t){return `<button type="button" class="v40-event" data-task-detail="${esc(t.id)}" style="background:${memberColor(t.assigned_to)}" title="${esc(t.title)} | ${esc(taskTeamLabel(t))}">${esc(t.priority||'P3')} · ${esc(t.title)}</button>`;}
function v40Panel(key){v40SelectedDate=key;const items=v40DayItems(key);const heading=new Date(key+'T12:00:00').toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long',year:'numeric'});$('dailyPanel').querySelector('h3').textContent=heading;
 if(calendarMode==='day'){
 const hours=Array.from({length:24},(_,i)=>String(i).padStart(2,'0'));
 const timed=items.filter(t=>t.start_time),untimed=items.filter(t=>!t.start_time);
 $('dailyPanelBody').innerHTML=`<p class="muted">Daily Timeline · ${items.length} งาน</p><div class="v40-timeline">${hours.map(hour=>`<div class="v40-hour">${hour}:00</div><div class="v40-hour-events">${timed.filter(t=>String(t.start_time).slice(0,2)===hour).map(t=>v40Chip(t)+`<small>${esc(String(t.start_time).slice(0,5))} – ${esc(t.end_time?String(t.end_time).slice(0,5):'ไม่ระบุ')}</small>`).join('')}</div>`).join('')}</div><div class="v40-timeline-unscheduled"><b>ไม่ระบุเวลา (${untimed.length})</b>${untimed.map(v40Chip).join('')}</div>`;
 }else{$('dailyPanelBody').innerHTML=`<p class="muted">${items.length} งาน</p>`+(items.map(t=>`<div class="v40-daily-item"><span class="v40-priority ${v40PriorityClass(t)}">${esc(t.priority||'P3')}</span>${v40Chip(t)}<small>${esc(taskTeamLabel(t))} · ${esc(taskSchedule(t))} · ${esc(t.status)} · ${Number(t.progress)||0}%</small></div>`).join('')||'<p class="muted">ไม่มีงานในวันนี้</p>');}
}
function renderCalendar(){
 if(calendarMode!=='month'){renderCalendarAgenda();v40Panel(dateOnly(month));return;}
 const y=month.getFullYear(),m=month.getMonth();$('monthTitle').textContent=month.toLocaleDateString('th-TH',{month:'long',year:'numeric'});
 const offset=new Date(y,m,1).getDay(),count=Math.ceil((offset+new Date(y,m+1,0).getDate())/7)*7,base=new Date(y,m,1-offset);
 let html=['อา','จ','อ','พ','พฤ','ศ','ส'].map(x=>`<div class="muted cal-head">${x}</div>`).join('');
 for(let i=0;i<count;i++){const d=new Date(base);d.setDate(base.getDate()+i);const key=dateOnly(d),daily=v40DayItems(key),visible=daily.slice(0,3),isToday=key===today();
 html+=`<div class="day cal-daily-day ${d.getMonth()===m?'':'outside'} ${key===v40SelectedDate?'v40-day-selected':''} ${isToday?'mt403-today':''}"><div class="mt403-day-heading"><button class="v40-day-btn" type="button" data-v40-day="${key}">${d.getDate()}</button>${isToday?'<span class="mt403-today-label">TODAY</span>':''}</div><div class="cal-daily-list">${visible.map(v40Chip).join('')}${daily.length>3?`<button class="v40-more" type="button" data-v40-day="${key}">+${daily.length-3} More</button>`:''}</div></div>`;
 }
 $('calendarGrid').classList.add('calendar');$('calendarGrid').innerHTML=html;v40Panel(v40SelectedDate);
}
function renderRemainingTasks(){
 const counts=new Map();let unassigned=0;
 for(const t of tasks){if(t.status==='Completed')continue;const ids=taskMemberIds(t);if(!ids.length)unassigned++;for(const id of ids)counts.set(id,(counts.get(id)||0)+1);}
 // Super Manager: hide only this member's row in Remaining Tasks.
 // Keep the member account, role, task assignments and global totals unchanged.
 const hiddenRemainingNames=new Set(['tanutnan homnan']);
 const rows=members
  .filter(m=>!hiddenRemainingNames.has(String(m.display_name||'').trim().toLowerCase()))
  .map(m=>({id:m.id,name:m.display_name||m.id.slice(0,8),count:counts.get(m.id)||0,color:memberColor(m.id)}))
  .sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
 const known=new Set(members.map(m=>m.id));
 for(const [id,count] of counts){if(!known.has(id))rows.push({id,name:'สมาชิกที่ไม่พบข้อมูล',count,color:'#8291a5'});}
 if(unassigned)rows.push({id:null,name:'ยังไม่กำหนดผู้รับผิดชอบ',count:unassigned,color:'#8291a5'});
 $('remainingTasks').innerHTML=`<h3>Remaining Tasks</h3><p class="muted">จำนวนงานที่ยังไม่ Completed (ทุกช่วงเวลา)</p>${rows.map(r=>`<div class="remaining-row"><span class="remaining-name"><span class="user-dot" style="background:${r.color}"></span>${esc(r.name)}</span><strong>${r.count}</strong></div>`).join('')}<div class="remaining-total"><span>งานคงเหลือทั้งหมด</span><strong>${tasks.filter(t=>t.status!=='Completed').length}</strong></div>`;
}
const historyFields={title:'ชื่องาน',description:'รายละเอียด',category:'ประเภท',status:'สถานะ',progress:'Progress',assigned_to:'ผู้รับผิดชอบ',co_pic:'ผู้ร่วมรับผิดชอบ (Co-PIC)',start_date:'Start Date',due_date:'Due Date',start_time:'Start Time',end_time:'End Time'};
function historyValue(key,value){if(value===null||value===undefined||value==='')return '—';if(key==='assigned_to')return memberName(value);if(key==='co_pic'&&Array.isArray(value))return value.map(memberName).join(', ')||'ไม่มี';if(key==='progress')return String(value)+'%';return String(value);}
async function openHistory(id){
 historyTask=id;const t=tasks.find(x=>x.id===id);$('historyTitle').textContent='ประวัติการแก้ไข: '+(t?.title||'งาน');$('historyList').textContent='กำลังโหลดประวัติ...';$('historyDialog').showModal();
 const {data,error}=await db.from('task_edit_history').select('id,task_id,changed_by,changed_at,changes').eq('task_id',id).order('changed_at',{ascending:false}).limit(200);
 if(historyTask!==id)return;
 if(error){$('historyList').textContent='โหลดประวัติไม่ได้: '+error.message+' (ตรวจสอบว่าได้รัน MIGRATION_V3_5.sql แล้ว)';return;}
 if(!data?.length){$('historyList').innerHTML='<p class="muted">ยังไม่มีประวัติการแก้ไขหลังติดตั้ง V3.5</p>';return;}
 $('historyList').innerHTML=data.map(h=>{const entries=Object.entries(h.changes||{}).filter(([key])=>Object.hasOwn(historyFields,key));return `<article class="history-entry"><div><strong>${esc(h.changed_by?memberName(h.changed_by):'ระบบ / ไม่ระบุผู้แก้ไข')}</strong> <span class="muted">${esc(new Date(h.changed_at).toLocaleString('th-TH'))}</span></div><table class="history-table"><thead><tr><th>รายการ</th><th>ก่อนแก้ไข</th><th>หลังแก้ไข</th></tr></thead><tbody>${entries.map(([key,v])=>`<tr><td>${esc(historyFields[key])}</td><td>${esc(historyValue(key,v.old))}</td><td>${esc(historyValue(key,v.new))}</td></tr>`).join('')}</tbody></table></article>`;}).join('');
}
function ganttUpdateOwnerLabel(){
 const count=ganttSelectedOwners?.size;
 $('ganttOwnerButton').textContent=ganttSelectedOwners===null||count===0?'ทุกคน':`เลือกแล้ว ${count} คน`;
}
function ganttRenderOwnerMenu(){
 const list=$('ganttOwnerList');if(!list)return;
 const people=members.filter(m=>m.role!=='guest');
 list.innerHTML=people.map(m=>`<label class="v405-member-option"><input type="checkbox" value="${esc(m.id)}" ${ganttSelectedOwners===null||ganttSelectedOwners.has(m.id)?'checked':''}><span class="user-dot" style="background:${memberColor(m.id)}"></span><span>${esc(m.display_name||m.id.slice(0,8))}</span></label>`).join('');
 ganttUpdateOwnerLabel();
}
function compareGanttTitles(a,b){return String(a.title||'').localeCompare(String(b.title||''),'th',{sensitivity:'base'}) || String(a.id||'').localeCompare(String(b.id||''));}
function renderGantt(){
 const start=$('ganttStart').value||ganttStart,end=$('ganttEnd').value||ganttEnd;
 const startTime=Date.parse(start+'T00:00:00Z'),endTime=Date.parse(end+'T00:00:00Z');
 const dayCount=Math.round((endTime-startTime)/86400000)+1;
 if(!Number.isFinite(dayCount)||dayCount<1||dayCount>366){$('ganttGrid').innerHTML='<p class="error">กรุณาเลือกช่วงวันที่ถูกต้อง (ไม่เกิน 366 วัน)</p>';return;}
 ganttStart=start;ganttEnd=end;
 const days=Array.from({length:dayCount},(_,i)=>new Date(startTime+i*86400000).toISOString().slice(0,10));
 let h=`<div class="gantt-heading">Task</div>${days.map(d=>`<div class="gantt-heading">${d.slice(5)}</div>`).join('')}`;
 const visibleTasks=tasks.filter(x=>x.start_date&&x.due_date&&x.start_date<=end&&x.due_date>=start&&(ganttSelectedOwners===null||taskMemberIds(x).some(id=>ganttSelectedOwners.has(id))));
 // Sort by Start Date, with missing dates last (if displayed in future).
 visibleTasks.sort((a,b)=>{
  const ad=a.start_date||'',bd=b.start_date||'';
  if(!ad)return bd?1:compareGanttTitles(a,b);
  if(!bd)return -1;
  const cmp=ad.localeCompare(bd);
  return cmp?(ganttSortOrder==='new'?-cmp:cmp):compareGanttTitles(a,b);
 });
 for(const t of visibleTasks){
  const color=memberColor(t.assigned_to);
  h+=`<div class="gantt-task" data-task-detail="${esc(t.id)}" tabindex="0" role="button" title="ดูรายละเอียด ${esc(t.title)}">${colorDot(t.assigned_to)} ${esc(t.title)} <span class="task-owner-inline">(${esc(taskTeamLabel(t))})</span></div>`;
  h+=days.map(d=>`<div class="${d>=t.start_date&&d<=t.due_date?'filled gantt-clickable':''}" ${d>=t.start_date&&d<=t.due_date?`data-task-detail="${esc(t.id)}" tabindex="0" role="button"`:''} style="${d>=t.start_date&&d<=t.due_date?'background:'+color:''}">${d===t.start_date?'●':''}</div>`).join('');
 }
 $('ganttGrid').innerHTML=`<div class="gantt" style="grid-template-columns:240px repeat(${dayCount},minmax(34px,1fr))">${h}</div>`;
}
function renderCalendarAgenda(){
 const selected=new Date(month.getFullYear(),month.getMonth(),month.getDate()),begin=new Date(selected);
 if(calendarMode==='week')begin.setDate(begin.getDate()-begin.getDay());
 const days=Array.from({length:calendarMode==='week'?7:1},(_,i)=>{const d=new Date(begin);d.setDate(begin.getDate()+i);return dateOnly(d)});
 $('monthTitle').textContent=calendarMode==='week'?`${days[0]} — ${days.at(-1)}`:selected.toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'});
 $('calendarGrid').classList.remove('calendar');$('calendarGrid').innerHTML=`<div class="agenda-grid">${days.map(d=>`<div class="agenda-day ${d===today()?'mt403-today':''}"><button type="button" class="v40-day-btn" data-v40-day="${d}">${new Date(d+'T12:00:00').toLocaleDateString('th-TH',{weekday:'short',day:'numeric',month:'short'})}</button>${d===today()?'<span class="mt403-today-label">TODAY</span>':''}${v40DayItems(d).slice(0,3).map(v40Chip).join('')}${v40DayItems(d).length>3?`<button type="button" class="v40-more" data-v40-day="${d}">+${v40DayItems(d).length-3} More</button>`:''}</div>`).join('')}</div>`;
}
function openTaskDetail(id){
 const t=tasks.find(x=>x.id===id);if(!t)return;
 detailTask=id;
 $('detailTitle').textContent=t.title;
 $('detailContent').innerHTML=`<dl class="detail-grid"><dt>ประเภท</dt><dd>${esc(t.category)}</dd><dt>สถานะ</dt><dd>${esc(t.status)}</dd><dt>Progress</dt><dd>${esc(t.progress)}%</dd><dt>Main PIC</dt><dd>${esc(taskOwnerLabel(t))}</dd><dt>Co-PIC</dt><dd>${esc(taskCoNames(t).join(', ')||'ไม่มี')}</dd><dt>ช่วงเวลา</dt><dd>${esc(taskSchedule(t))}</dd><dt>รายละเอียด</dt><dd>${esc(t.description||'—')}</dd></dl>`;
 $('taskDetailDialog').showModal();
 void loadDetailAttachments(id);
}
async function loadDetailAttachments(id){
 const el=$('detailAttachments');el.textContent='กำลังโหลดไฟล์แนบ...';
 const {data,error}=await db.from('task_attachments').select('id,file_name,storage_path,file_size').eq('task_id',id).order('created_at',{ascending:false});
 if(detailTask!==id)return;
 if(error){el.textContent='ไม่สามารถโหลดไฟล์แนบ: '+error.message;return;}
 el.innerHTML=(data||[]).map(a=>`<div class="attachment-row"><span>${esc(a.file_name)} (${Math.ceil(a.file_size/1024)} KB)</span><button class="secondary" type="button" data-attachment-open="${esc(a.id)}">เปิดไฟล์</button></div>`).join('')||'<p class="muted">ยังไม่มีไฟล์แนบ</p>';
}
async function openAttachment(id){
 const {data:a,error}=await db.from('task_attachments').select('storage_path').eq('id',id).single();
 if(error||!a)throw Error(error?.message||'ไม่พบไฟล์');
 const {data,error:signError}=await db.storage.from('task-files').createSignedUrl(a.storage_path,60);
 if(signError||!data?.signedUrl)throw Error(signError?.message||'ไม่สามารถเปิดไฟล์');
 window.open(data.signedUrl,'_blank','noopener,noreferrer');
}
async function openAttachmentDialog(id){
 const t=tasks.find(x=>x.id===id);if(!t)return;
 attachmentTask=id;$('attachmentTaskTitle').textContent=t.title;
 $('attachmentFile').value='';$('attachmentMsg').textContent='';$('attachmentDialog').showModal();
 await loadAttachmentList(id);
}
async function loadAttachmentList(id){
 const el=$('attachmentList');el.textContent='กำลังโหลด...';
 const {data,error}=await db.from('task_attachments').select('id,file_name,file_size').eq('task_id',id).order('created_at',{ascending:false});
 if(attachmentTask!==id)return;
 el.innerHTML=error?`<p class="error">${esc(error.message)}</p>`:(data||[]).map(a=>`<div class="attachment-row"><span>${esc(a.file_name)} (${Math.ceil(a.file_size/1024)} KB)</span><button type="button" class="secondary" data-attachment-open="${esc(a.id)}">เปิดไฟล์</button></div>`).join('')||'<p class="muted">ยังไม่มีไฟล์แนบ</p>';
}
async function refresh(){if(!user)return;const {data:myProfile,error:myError}=await db.from('profiles').select('id,role,display_name,must_change_password').eq('id',user.id).single();if(myError){msg('Profile: '+myError.message,true);return;}if(myProfile.role==='guest'){window.location.replace('guest.html');return;}document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('hidden',['admin','requests'].includes(b.dataset.view)&&myProfile.role!=='admin'));if(myProfile.role!=='admin'&&!$('requests').classList.contains('hidden'))view('tasks');const [tr,mr,pr,cr]=await Promise.all([db.from('tasks').select('*').is('deleted_at',null).order('created_at',{ascending:false}),db.from('profiles').select('id,display_name,role,user_color'),db.from('profiles').select('id,role,display_name,must_change_password').eq('id',user.id).single(),db.from('task_collaborators').select('task_id,user_id')]);if(tr.error||mr.error||pr.error||cr.error){msg('โหลดข้อมูลไม่สำเร็จ: '+[tr.error,mr.error,pr.error,cr.error].filter(Boolean).map(e=>e.message).join(' / '),true);return}tasks=tr.data||[];members=mr.data||[];collaboratorsByTask=new Map();for(const c of cr.data||[]){const ids=collaboratorsByTask.get(c.task_id)||[];ids.push(c.user_id);collaboratorsByTask.set(c.task_id,ids)}profile=pr.data;$('identity').textContent=`${profile.display_name||user.email} (${profile.role})`;render();}
async function signedIn(u){user=u;show('auth',!u);show('app',!!u);show('logout',!!u);show('selfPassword',!!u);show('setup',false);if(channel){await db.removeChannel(channel);channel=null}if(u){await refresh();if(profile?.role==='guest'){if(profile.must_change_password)openSelfPassword(true);await loadTaskRequests();return;}if(profile?.must_change_password)openSelfPassword(true);channel=db.channel('mt56251-updates').on('postgres_changes',{event:'*',schema:'public',table:'tasks'},()=>refresh()).on('postgres_changes',{event:'*',schema:'public',table:'task_collaborators'},()=>refresh()).on('postgres_changes',{event:'*',schema:'public',table:'profiles'},()=>refresh()).on('postgres_changes',{event:'*',schema:'public',table:'comments'},()=>{if(commentTask)loadComments()}).subscribe();}}
function renderCoPicChoices(t){
 const selected=new Set(t?taskCoIds(t):[]);
 const main=$('assigned_to').value;
 $('coPicChoices').innerHTML=members.filter(m=>m.id!==main&&m.role!=='guest').map(m=>`<label class="co-pic-item"><input type="checkbox" name="co_pic" value="${esc(m.id)}" ${selected.has(m.id)?'checked':''}><span class="user-dot" style="background:${memberColor(m.id)}"></span>${esc(m.display_name||m.id.slice(0,8))}</label>`).join('');
}
function openTask(id){const t=tasks.find(x=>x.id===id);if(t&&!canManageTask(t)){msg('เฉพาะ Main PIC หรือ Admin เท่านั้นที่แก้ไขงานได้',true);return;}$('taskForm').reset();$('taskId').value=t?.id||'';$('dialogTitle').textContent=t?'แก้ไขงาน':'เพิ่มงาน';for(const k of ['title','description','category','status','progress','start_date','due_date','start_time','end_time'])if(t&&t[k]!=null)$(k).value=t[k];$('assigned_to').innerHTML='<option value="">ไม่ระบุ</option>'+members.filter(m=>m.role!=='guest').map(m=>`<option value="${m.id}">${esc(m.display_name||m.id.slice(0,8))}</option>`).join('');$('assigned_to').value=t?.assigned_to||'';$('taskPriority').value=t?.priority||'P3';$('taskPriority').disabled=!['admin','member'].includes(profile?.role);$('taskPriority').title='กำหนดระดับความสำคัญของงานที่มีสิทธิ์แก้ไข';renderCoPicChoices(t);mt408SyncFromStatus();$('taskMsg').textContent='';$('taskDialog').showModal();}
async function loadComments(){if(!commentTask)return;const {data,error}=await db.from('comments').select('*').eq('task_id',commentTask).order('created_at');$('commentsList').innerHTML=error?esc(error.message):(data||[]).map(c=>`<p><b>${esc(memberName(c.author_id))}</b> <small>${new Date(c.created_at).toLocaleString('th-TH')}</small><br>${esc(c.message)}</p>`).join('')||'<p class="muted">ยังไม่มีความคิดเห็น</p>';}
async function openComments(id){commentTask=id;$('commentTitle').textContent='Comments: '+(tasks.find(t=>t.id===id)?.title||'');$('commentMsg').textContent='';$('commentsDialog').showModal();await loadComments();}
async function boot(){if(!window.supabase||!cfg.supabaseUrl||!cfg.publishableKey||cfg.publishableKey.includes('PASTE_')){$('setupMsg').textContent='ยังไม่ได้ใส่ Publishable Key ใน config.js หรือโหลด Supabase library ไม่สำเร็จ';return}db=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey);const {data,error}=await db.auth.getSession();if(error)console.warn(error);await signedIn(data?.session?.user||null);db.auth.onAuthStateChange((_event,session)=>{if(session?.user?.id!==user?.id)void signedIn(session?.user||null)});}
$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginMsg').textContent='กำลังเข้าสู่ระบบ...';const {error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});$('loginMsg').textContent=error?error.message:'';};
$('forgot').onclick=async()=>{const email=$('email').value.trim();if(!email){$('loginMsg').textContent='กรอก Email ก่อน';return}const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});$('loginMsg').textContent=error?error.message:'หากบัญชีนี้มีอยู่ ระบบจะส่งอีเมลรีเซ็ต (ต้องตั้งค่า URL ใน Supabase ก่อน)';};
$('cancelName').onclick=()=>$('nameDialog').close();
$('cancelColor').onclick=()=>$('colorDialog').close();
$('colorForm').onsubmit=async e=>{e.preventDefault();const color=$('newUserColor').value;if(!/^#[0-9a-f]{6}$/i.test(color)){ $('colorMsg').textContent='สีไม่ถูกต้อง';return;}$('colorMsg').textContent='กำลังบันทึก...';const {error}=await db.from('profiles').update({user_color:color}).eq('id',user.id);if(error){$('colorMsg').textContent=error.message;return;}$('colorDialog').close();await refresh();};
$('nameForm').onsubmit=async e=>{e.preventDefault();const name=$('newDisplayName').value.trim();if(!name){$('nameMsg').textContent='กรุณากรอกชื่อ';return}const {error}=await db.from('profiles').update({display_name:name}).eq('id',user.id);if(error){$('nameMsg').textContent=error.message;return}$('nameDialog').close();await refresh();};
$('logout').onclick=()=>db.auth.signOut();document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>{view(b.dataset.view);if(b.dataset.view==='admin')void loadAdminUsers();if(b.dataset.view==='requests')void loadTaskRequests();});$('newTask').onclick=()=>openTask(null);$('cancelTask').onclick=()=>$('taskDialog').close();$('search').oninput=render;$('filter').onchange=render;$('ownerFilter').onchange=render;$('assigned_to').onchange=()=>{const selected=new Set([...document.querySelectorAll('#coPicChoices input:checked')].map(x=>x.value));renderCoPicChoices(null);for(const x of document.querySelectorAll('#coPicChoices input'))x.checked=selected.has(x.value)};
// V4.0.8: status/progress stay consistent in both directions.
function mt408SyncFromStatus(){
 if($('status').value==='Completed') $('progress').value='100';
}
function mt408SyncFromProgress(){
 const field=$('progress');
 if(field.value==='') return;
 const n=Math.min(100,Math.max(0,Number(field.value)));
 if(!Number.isFinite(n)) return;
 field.value=String(n);
 if(n===100) $('status').value='Completed';
 else if($('status').value==='Completed') $('status').value='In Progress';
 else if(n>0&&$('status').value==='Pending') $('status').value='In Progress';
}
$('status').addEventListener('change',mt408SyncFromStatus);
$('progress').addEventListener('input',mt408SyncFromProgress);
$('taskForm').onsubmit=async e=>{e.preventDefault();const id=$('taskId').value;if(id&&!canManageTask(tasks.find(t=>t.id===id))){$('taskMsg').textContent='ไม่มีสิทธิ์แก้ไขงานนี้';return;}mt408SyncFromProgress();mt408SyncFromStatus();const data={title:$('title').value.trim(),description:$('description').value,category:$('category').value,status:$('status').value,progress:Number($('progress').value),start_date:$('start_date').value||null,due_date:$('due_date').value||null,start_time:$('start_time').value||null,end_time:$('end_time').value||null,assigned_to:$('assigned_to').value||null};if(data.start_date&&data.due_date&&data.start_date>data.due_date){$('taskMsg').textContent='Due Date ต้องไม่ก่อน Start Date';return}if(data.start_date&&data.due_date&&data.start_date===data.due_date&&data.start_time&&data.end_time&&data.end_time<data.start_time){$('taskMsg').textContent='End Time ต้องไม่ก่อน Start Time ในวันเดียวกัน';return;}const result=id?await db.from('tasks').update(data).eq('id',id):await db.from('tasks').insert({...data,created_by:user.id}).select('id').single();if(result.error){$('taskMsg').textContent=result.error.message;return}
 const savedId=id||result.data?.id;
 if(!savedId){$('taskMsg').textContent='บันทึกงานแล้ว แต่ไม่ได้รับ Task ID เพื่อบันทึก Co-PIC';await refresh();return;}
 // Priority is saved through a server-checked RPC; Admin retains rank control.
 if(['admin','member'].includes(profile?.role)){
  const old=tasks.find(x=>x.id===savedId);
  const selectedPriority=$('taskPriority').value;
  if(selectedPriority!==(old?.priority||'P3')){
   const {error:priorityErr}=await db.rpc('team42_set_main_pic_priority',{p_task_id:savedId,p_priority:selectedPriority});
   if(priorityErr){$('taskMsg').textContent='บันทึกงานแล้ว แต่กำหนด Priority ไม่สำเร็จ: '+priorityErr.message;await refresh();return;}
  }
 }
 const coIds=[...document.querySelectorAll('#coPicChoices input:checked')].map(x=>x.value).filter(x=>x!==data.assigned_to);
 const {error:coErr}=await db.rpc('team38_set_collaborators',{p_task_id:savedId,p_member_ids:coIds});
 if(coErr){$('taskMsg').textContent='บันทึกงานแล้ว แต่บันทึก Co-PIC ไม่สำเร็จ: '+coErr.message;await refresh();return;}
 $('taskDialog').close();await refresh();};
document.addEventListener('click',e=>{const del=e.target.closest('[data-delete-task]');if(del){void openDeleteTask(del.dataset.deleteTask);return;}const a=e.target.closest('[data-edit]'),b=e.target.closest('[data-comment]'),h=e.target.closest('[data-history]');if(a)openTask(a.dataset.edit);if(b)openComments(b.dataset.comment);if(h)void openHistory(h.dataset.history);if(e.target.closest('[data-edit-name]')){$('newDisplayName').value=profile?.display_name||'';$('nameMsg').textContent='';$('nameDialog').showModal()}if(e.target.closest('[data-edit-color]')){$('newUserColor').value=memberColor(user.id)==='#8291a5'?'#2563eb':memberColor(user.id);$('colorMsg').textContent='';$('colorDialog').showModal()}});$('closeHistory').onclick=()=>{historyTask=null;$('historyDialog').close()};$('closeComments').onclick=()=>{$('commentsDialog').close();commentTask=null};$('commentForm').onsubmit=async e=>{e.preventDefault();const message=$('commentText').value.trim();if(!message)return;const {error}=await db.from('comments').insert({task_id:commentTask,author_id:user.id,message});if(error){$('commentMsg').textContent=error.message;return}$('commentText').value='';await loadComments();};
$('prevMonth').onclick=()=>{const d=new Date(month);if(calendarMode==='month')d.setMonth(d.getMonth()-1);else d.setDate(d.getDate()-(calendarMode==='week'?7:1));month=d;renderCalendar()};
$('nextMonth').onclick=()=>{const d=new Date(month);if(calendarMode==='month')d.setMonth(d.getMonth()+1);else d.setDate(d.getDate()+(calendarMode==='week'?7:1));month=d;renderCalendar()};
$('calendarMode').onchange=e=>{calendarMode=e.target.value;renderCalendar()};
$('ganttOwnerButton').onclick=()=>{$('ganttOwnerMenu').classList.toggle('hidden');ganttUpdateOwnerLabel();};
$('ganttOwnerAll').onclick=()=>{ganttSelectedOwners=null;ganttRenderOwnerMenu();renderGantt();};
$('ganttOwnerNone').onclick=()=>{ganttSelectedOwners=new Set();ganttRenderOwnerMenu();renderGantt();};
$('ganttOwnerList').onchange=e=>{if(!e.target.matches('input[type="checkbox"]'))return;const all=members.filter(m=>m.role!=='guest').map(m=>m.id);const chosen=new Set([...$('ganttOwnerList').querySelectorAll('input:checked')].map(x=>x.value));ganttSelectedOwners=chosen.size===all.length?null:chosen;ganttUpdateOwnerLabel();renderGantt();};
$('ganttOwnerClear').onclick=()=>{ganttSelectedOwners=null;ganttRenderOwnerMenu();renderGantt();};
document.addEventListener('click',e=>{if(!$('ganttOwnerWidget').contains(e.target))$('ganttOwnerMenu').classList.add('hidden');});
$('ganttSortOrder').value=ganttSortOrder;
$('ganttSortOrder').onchange=e=>{ganttSortOrder=e.target.value==='new'?'new':'old';renderGantt();};
$('ganttStart').value=ganttStart;
$('ganttEnd').value=ganttEnd;
$('ganttStart').onchange=e=>{ganttStart=e.target.value||ganttStart;renderGantt()};
$('ganttEnd').onchange=e=>{ganttEnd=e.target.value||ganttEnd;renderGantt()};
$('closeTaskDetail').onclick=()=>{$('taskDetailDialog').close();detailTask=null};
$('detailEdit').onclick=()=>{const id=detailTask;$('taskDetailDialog').close();detailTask=null;openTask(id)};
$('detailAttach').onclick=()=>{const id=detailTask;$('taskDetailDialog').close();detailTask=null;void openAttachmentDialog(id)};
$('attachmentCancel').onclick=()=>{$('attachmentDialog').close();attachmentTask=null};
$('attachmentForm').onsubmit=async e=>{e.preventDefault();const file=$('attachmentFile').files[0];if(!file||!attachmentTask)return;
 if(file.size>10*1024*1024){$('attachmentMsg').textContent='ไฟล์ต้องไม่เกิน 10 MB';return;}
 const allowed=['application/pdf','image/png','image/jpeg','text/plain','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
 if(!allowed.includes(file.type)){$('attachmentMsg').textContent='รองรับ PDF, PNG, JPG, TXT, CSV, XLS, XLSX, DOCX';return;}
 $('attachmentMsg').textContent='กำลังอัปโหลด...';const taskId=attachmentTask;
 const path=taskId+'/'+crypto.randomUUID()+'/'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
 const {error:upErr}=await db.storage.from('task-files').upload(path,file,{upsert:false,contentType:file.type});
 if(upErr){$('attachmentMsg').textContent=upErr.message;return;}
 const {error:dbErr}=await db.from('task_attachments').insert({task_id:taskId,uploaded_by:user.id,file_name:file.name,file_size:file.size,storage_path:path});
 if(dbErr){await db.storage.from('task-files').remove([path]);$('attachmentMsg').textContent=dbErr.message;return;}
 $('attachmentFile').value='';$('attachmentMsg').textContent='อัปโหลดสำเร็จ';await loadAttachmentList(taskId);
};
document.addEventListener('click',e=>{const d=e.target.closest('[data-task-detail]');if(d)openTaskDetail(d.dataset.taskDetail);const a=e.target.closest('[data-attachment-task]');if(a)void openAttachmentDialog(a.dataset.attachmentTask);const f=e.target.closest('[data-attachment-open]');if(f)void openAttachment(f.dataset.attachmentOpen).catch(err=>alert(err.message));});
document.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const d=e.target.closest('[data-task-detail]');if(d){e.preventDefault();openTaskDetail(d.dataset.taskDetail)}}});
$('export').onclick=()=>{const cols=['title','description','category','status','progress','start_date','start_time','due_date','end_time','assigned_to','created_at'];const csv='\ufeff'+[cols.join(','),...tasks.map(t=>cols.map(k=>'"'+String(t[k]??'').replace(/"/g,'""')+'"').join(','))].join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='MT56251_Tasks_'+today()+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};

// Delete requires a fresh admin password verification on the server, never a publishable key.
let pendingDeleteTaskId=null;
function openDeleteTask(id){
  const t=tasks.find(x=>x.id===id);if(!t||!canManageTask(t))return;
  pendingDeleteTaskId=id;
  $('deleteTaskTitle').textContent=t.title;
  $('deleteTaskPassword').value='';
  $('deleteTaskPassword').required=profile?.role==='admin';
  $('deletePasswordWrap').classList.toggle('hidden',profile?.role!=='admin');
  $('deleteTaskMsg').textContent='';
  $('deleteTaskDialog').showModal();
}
$('cancelDeleteTask').onclick=()=>{$('deleteTaskDialog').close();pendingDeleteTaskId=null;};
$('deleteTaskForm').onsubmit=async e=>{
  e.preventDefault();
  if(!pendingDeleteTaskId||!canManageTask(tasks.find(t=>t.id===pendingDeleteTaskId)))return;
  const password=profile?.role==='admin'?$('deleteTaskPassword').value:'';
  $('deleteTaskMsg').textContent='กำลังตรวจสอบสิทธิ์และย้ายงานไปถังขยะ...';
  const btn=$('confirmDeleteTask');btn.disabled=true;
  try{
    const {data:{session},error}=await db.auth.getSession();
    if(error||!session?.access_token)throw Error('กรุณา Login ใหม่');
    const resp=await fetch(cfg.supabaseUrl.replace(/\/$/,'')+'/functions/v1/team-delete-task',{
      method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.publishableKey,'Authorization':'Bearer '+session.access_token},
      body:JSON.stringify({taskId:pendingDeleteTaskId,password})
    });
    const result=await resp.json().catch(()=>({error:'Server response ไม่ถูกต้อง'}));
    if(!resp.ok)throw Error(result.error||'Delete failed ('+resp.status+')');
    $('deleteTaskDialog').close();pendingDeleteTaskId=null;
    await refresh();msg('ย้ายงานไปถังขยะสำเร็จ');
  }catch(err){$('deleteTaskMsg').textContent=err.message;}
  finally{$('deleteTaskPassword').value='';btn.disabled=false;}
};

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


// V3.7 Notification Center: server-side event triggers + reminders on app refresh.
let teamNotifications=[],notifChannel=null,notifBusy=false;
const notifKinds={due_soon:'📅',overdue:'⚠️',assigned:'👤',comment:'💬',completed:'✅'};
function renderNotifications(){
 const unread=teamNotifications.filter(n=>!n.is_read).length;
 $('notifCount').textContent=unread>99?'99+':String(unread);
 show('notifCount',unread>0);
 $('notifList').innerHTML=teamNotifications.length?teamNotifications.map(n=>`<button type="button" class="notif-item ${n.is_read?'':'unread'}" data-notif-id="${esc(n.id)}"><b>${notifKinds[n.kind]||'🔔'} ${esc(n.title)}</b><small>${esc(n.message)}</small><small>${esc(new Date(n.created_at).toLocaleString('th-TH'))}</small></button>`).join(''):'<p class="notif-empty">ยังไม่มีการแจ้งเตือน</p>';
}
async function loadNotifications(withReminders=false){
 if(!db||!user||notifBusy)return;
 notifBusy=true;
 try{
  if(withReminders){const {error:reminderError}=await db.rpc('team37_refresh_reminders');if(reminderError)throw reminderError;}
  const {data,error}=await db.from('team_notifications').select('id,task_id,kind,title,message,is_read,created_at').order('created_at',{ascending:false}).limit(100);
  if(error)throw error;
  teamNotifications=data||[];renderNotifications();$('notifInfo').textContent='';
 }catch(e){$('notifInfo').textContent='แจ้งเตือนยังไม่พร้อม: '+e.message;}
 finally{notifBusy=false;}
}
async function markNotification(id){
 const n=teamNotifications.find(x=>x.id===id);if(!n)return;
 if(!n.is_read){const {error}=await db.from('team_notifications').update({is_read:true}).eq('id',id);if(error){$('notifInfo').textContent=error.message;return;}n.is_read=true;renderNotifications();}
 $('notifPanel').classList.add('hidden');$('notifBell').setAttribute('aria-expanded','false');
 if(n.task_id){const task=tasks.find(t=>t.id===n.task_id);if(task){view('tasks');openTaskDetail(n.task_id);}else msg('งานที่เกี่ยวข้องอาจถูกลบหรือไม่อยู่ในรายการปัจจุบัน',true);}
}
$('notifBell').onclick=()=>{const panel=$('notifPanel');const opening=panel.classList.contains('hidden');panel.classList.toggle('hidden',!opening);$('notifBell').setAttribute('aria-expanded',String(opening));if(opening)void loadNotifications(true);};
$('notifRefresh').onclick=()=>loadNotifications(true);
$('notifReadAll').onclick=async()=>{const {error}=await db.from('team_notifications').update({is_read:true}).eq('is_read',false);if(error){$('notifInfo').textContent=error.message;return;}teamNotifications.forEach(n=>n.is_read=true);renderNotifications();};
document.addEventListener('click',e=>{const b=e.target.closest('[data-notif-id]');if(b)void markNotification(b.dataset.notifId);});
async function setupNotifications(){
 if(notifChannel){await db.removeChannel(notifChannel);notifChannel=null;}
 teamNotifications=[];renderNotifications();
 if(!user)return;
 await loadNotifications(true);
 notifChannel=db.channel('mt37-notifications-'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'team_notifications',filter:'recipient_id=eq.'+user.id},()=>{void loadNotifications(false);}).subscribe();
}
// Refresh notification state on login/logout without changing the existing auth flow.
const originalSignedIn=signedIn;
signedIn=async function(u){await originalSignedIn(u);await setupNotifications();};



// Priority-only editor for Admin and Main PIC.
document.addEventListener('click',e=>{const b=e.target.closest('[data-priority-task]');if(!b)return;const t=tasks.find(x=>x.id===b.dataset.priorityTask);if(!t||!canManageTask(t))return;$('rankTaskId').value=t.id;$('rankTaskTitle').textContent=t.title;$('rankPriority').value=t.priority||'P3';$('rankMsg').textContent='';$('rankDialog').showModal();});
$('rankCancel').onclick=()=>$('rankDialog').close();
$('rankForm').onsubmit=async e=>{e.preventDefault();const {error}=await db.rpc('team42_set_main_pic_priority',{p_task_id:$('rankTaskId').value,p_priority:$('rankPriority').value});if(error){$('rankMsg').textContent=error.message;return;}$('rankDialog').close();await refresh();};
document.querySelector('[data-view="admin"]').addEventListener('click',()=>{void loadGuestCalendarSetting();});
// V3.9.3: one admin-controlled visibility setting for the entire Guest Calendar.
async function loadGuestCalendarSetting(){
 if(profile?.role!=='admin')return;
 const label=$('guestCalendarVisibilityStatus');
 if(!label)return;
 label.textContent='กำลังโหลด...';
 const {data,error}=await db.rpc('team393_get_guest_calendar_visibility');
 if(error){label.textContent='โหลดการตั้งค่าไม่ได้: '+error.message;return;}
 const visible=data===true;
 label.textContent=visible?'เปิดเผยงานทั้งหมดที่ยังไม่ Completed':'ซ่อนงานทั้งหมดจาก Guest';
 $('guestCalendarVisibilityToggle').textContent=visible?'ซ่อน Calendar ทั้งหมด':'เปิดเผย Calendar ทั้งหมด';
 $('guestCalendarVisibilityToggle').dataset.visible=String(visible);
}
$('guestCalendarVisibilityToggle').onclick=async()=>{
 if(profile?.role!=='admin')return;
 const btn=$('guestCalendarVisibilityToggle');
 const visible=btn.dataset.visible!=='true';
 if(!confirm(visible?'ยืนยันเปิดเผยชื่องานและวันที่ของงานที่ยังไม่ Completed ทั้งหมดต่อผู้เข้าชมที่ไม่ Login?':'ยืนยันซ่อนงานทั้งหมดจาก Guest Calendar?'))return;
 btn.disabled=true;
 const {error}=await db.rpc('team393_set_guest_calendar_visibility',{p_visible:visible});
 btn.disabled=false;
 if(error){$('guestCalendarVisibilityStatus').textContent='บันทึกไม่สำเร็จ: '+error.message;return;}
 await loadGuestCalendarSetting();
};

// V3.9: Guest requests, review, priority and rank. All writes use server-checked RPCs.
const requestStatusLabel={pending:'Pending Approval',approved:'Approved',rejected:'Rejected'};
const workStatusLabel={'Pending':'Pending','In Progress':'In Progress','On Hold':'On Hold','Completed':'Completed'};
function requestBadge(s){return `<span class="pill">${esc(requestStatusLabel[s]||s||'Unknown')}</span>`;}
function taskRequestBadge(status){
 const color={'Pending':'#64748b','In Progress':'#2563eb','On Hold':'#a16207','Completed':'#15803d','Not Linked':'#9a3412','Not Created':'#64748b'}[status]||'#64748b';
 return `<span class="pill" style="background:${color};color:white;white-space:nowrap">${esc(status)}</span>`;
}

async function loadTaskRequests(){
 if(!user||profile?.role!=='admin')return;
 const host=$('requestList');host.textContent='กำลังโหลดคำขอ...';
 const {data,error}=await db.from('task_requests').select('*').order('created_at',{ascending:false}).limit(200);
 if(error){host.textContent='โหลดคำขอไม่ได้: '+error.message;return;}
 const requests=data||[];
 const requestFilter=$('requestStatusFilter')?.value||'all';
 const workFilter=$('requestWorkFilter')?.value||'all';
 const linkedIds=[...new Set(requests.map(r=>r.linked_task_id).filter(Boolean))];
 const linkedMap=new Map();
 if(linkedIds.length){const {data:linked,error:linkedError}=await db.from('tasks').select('id,status,progress,assigned_to,deleted_at').in('id',linkedIds);
 if(linkedError){host.textContent='โหลดสถานะ Task ไม่สำเร็จ: '+linkedError.message;return;}
 for(const t of linked||[])linkedMap.set(t.id,t);}
 const visible=requests.filter(r=>{
  if(requestFilter!=='all'&&r.status!==requestFilter)return false;
  const t=linkedMap.get(r.linked_task_id);
  const ws=r.status==='approved'?(t&&!t.deleted_at?t.status:'unlinked'):'not_applicable';
  return workFilter==='all'||workFilter===ws;
 });
 host.innerHTML=visible.map(r=>{
  const t=linkedMap.get(r.linked_task_id);const active=t&&!t.deleted_at;
  const work=r.status==='approved'?(active?esc(workStatusLabel[t.status]||t.status):'ยังไม่เชื่อม Task'):'—';
  const percent=active?Math.max(0,Math.min(100,Number(t.progress)||0)):null;
  const opts='<option value="">-- เลือก Task เพื่อเชื่อม --</option>'+tasks.map(x=>`<option value="${esc(x.id)}" ${r.linked_task_id===x.id?'selected':''}>${esc(x.title)}</option>`).join('');
  return `<article class="request-card"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:12px"><strong style="min-width:0;flex:1">${esc(r.title)}</strong><div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0"><span style="font-size:11px;color:#64748b">Request Status</span>${requestBadge(r.status)}<span style="font-size:11px;color:#64748b">Task Status</span>${taskRequestBadge(r.status==='approved'?(active?t.status:'Not Linked'):'Not Created')}</div></div>
   <p class="muted">${esc(r.requester_name)} · ${esc(r.contact_email)} · ${esc(r.category)} · Requested ${esc(r.requested_priority)} · Due ${esc(r.requested_due_date||'—')}</p>
   <p>${esc(r.details||'')}</p><p><strong>Task Status:</strong> ${work}${percent===null?'':` · Progress: ${percent}%`}</p>
   ${r.status==='approved'?`<p class="muted">Approved: ${esc(r.final_priority||'—')}</p><label>เชื่อม Task ที่สร้างแล้ว <select data-link-task="${esc(r.id)}">${opts}</select></label><button type="button" class="secondary" data-save-link="${esc(r.id)}">บันทึกการเชื่อม Task</button>`:''}
   ${r.status==='rejected'?`<p class="muted">เหตุผล: ${esc(r.review_note||'—')}</p>`:''}
   ${r.status==='pending'?`<button data-review-request="${esc(r.id)}" class="secondary">ตรวจสอบ / อนุมัติ</button>`:''}</article>`;
 }).join('')||'<p class="muted">ไม่พบคำขอตามตัวกรอง</p>';
 $('requestAdminHint').classList.remove('hidden');$('requestNew').classList.add('hidden');
}
$('requestStatusFilter').onchange=()=>void loadTaskRequests();
$('requestWorkFilter').onchange=()=>void loadTaskRequests();
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-save-link]');if(!b||profile?.role!=='admin')return;
 const id=b.dataset.saveLink;const select=[...document.querySelectorAll('[data-link-task]')].find(x=>x.dataset.linkTask===id);
 if(!select)return;
 b.disabled=true;
 try{const {error}=await db.rpc('team425_link_request_task',{p_request_id:id,p_task_id:select.value||null});if(error)throw error;await loadTaskRequests();}
 catch(err){alert('เชื่อม Task ไม่สำเร็จ: '+err.message);b.disabled=false;}
});
$('requestForm').onsubmit=async e=>{
 e.preventDefault();if(profile?.role!=='admin')return;const btn=$('requestSubmit');btn.disabled=true;$('requestMsg').textContent='กำลังส่งคำขอ...';
 try{
  const args={p_requester_name:$('requesterName').value.trim(),p_contact_email:$('requestEmail').value.trim(),p_title:$('requestTitle').value.trim(),p_details:$('requestDetails').value.trim(),p_category:$('requestCategory').value,p_requested_priority:$('requestPriority').value,p_due_date:$('requestDue').value||null};
  const {error}=await db.rpc('team39_submit_request',args);if(error)throw error;
  $('requestMsg').textContent='ส่งคำขอสำเร็จ รอ Admin พิจารณา';$('requestTitle').value='';$('requestDetails').value='';await loadTaskRequests();
 }catch(err){$('requestMsg').textContent=err.message;}finally{btn.disabled=false;}
};
document.addEventListener('click',async e=>{
 const btn=e.target.closest('[data-review-request]');if(!btn||profile?.role!=='admin')return;
 const id=btn.dataset.reviewRequest;const {data,error}=await db.from('task_requests').select('*').eq('id',id).single();if(error){alert(error.message);return;}
 $('reviewId').value=id;$('reviewTaskTitle').textContent=data.title;$('reviewPriority').value=data.requested_priority;
 $('reviewNote').value='';$('reviewMainPic').innerHTML='<option value="">ยังไม่มอบหมาย</option>'+members.filter(m=>m.role!=='guest').map(m=>`<option value="${esc(m.id)}">${esc(m.display_name||m.id.slice(0,8))}</option>`).join('');
 $('reviewMsg').textContent='';$('reviewDialog').showModal();
});
$('reviewCancel').onclick=()=>$('reviewDialog').close();
$('reviewForm').onsubmit=async e=>{
 e.preventDefault();const action=e.submitter?.value||'approve';$('reviewMsg').textContent='กำลังบันทึก...';
 const args={p_request_id:$('reviewId').value,p_decision:action,p_priority:$('reviewPriority').value,p_rank:null,p_main_pic:$('reviewMainPic').value||null,p_note:$('reviewNote').value.trim()};
 const {error}=await db.rpc('team39_review_request',args);if(error){$('reviewMsg').textContent=error.message;return;}
 $('reviewDialog').close();await refresh();await loadTaskRequests();
};
async function initRequestForm(){if(!user)return;$('requesterName').value=profile?.display_name||'';$('requestEmail').value=user.email||'';}
const originalRequestSignedIn=signedIn;
signedIn=async function(u){await originalRequestSignedIn(u);if(u){initRequestForm();if(profile?.role==='guest')await loadTaskRequests();}};


// V4.0: Read-only derived analytics; no new SQL tables or elevated privileges.
function v405UpdateOwnerLabel(){
 const count=v405SelectedOwners?.size;
 $('calOwnerButton').textContent=v405SelectedOwners===null||count===0?'ทุกคน':`เลือกแล้ว ${count} คน`;
 $('calOwnerButton').setAttribute('aria-expanded',String(!$('calOwnerMenu').classList.contains('hidden')));
}
function v405RenderOwnerMenu(){
 const list=$('calOwnerList');
 list.innerHTML=members.filter(m=>m.role!=='guest').map(m=>`<label class="v405-member-option"><input type="checkbox" value="${esc(m.id)}" ${v405SelectedOwners===null||v405SelectedOwners.has(m.id)?'checked':''}><span class="user-dot" style="background:${memberColor(m.id)}"></span><span>${esc(m.display_name||m.id.slice(0,8))}</span></label>`).join('');
 v405UpdateOwnerLabel();
}
function v40RefreshOwnerOptions(){
 const valid=new Set(members.filter(m=>m.role!=='guest').map(m=>m.id));
 if(v405SelectedOwners!==null){v405SelectedOwners=new Set([...v405SelectedOwners].filter(id=>valid.has(id)));if(v405SelectedOwners.size===valid.size)v405SelectedOwners=null;}
 v405RenderOwnerMenu();
 const cat=$('calCategory'),prev=cat.value;cat.innerHTML='<option value="">ทุกประเภท</option>'+[...new Set(tasks.map(t=>t.category).filter(Boolean))].map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');cat.value=prev;
}
function v40RenderDashboard(){const active=tasks.filter(t=>t.status!=='Completed');const rows=members.filter(m=>m.role!=='guest').map(m=>({name:m.display_name||m.id.slice(0,8),count:active.filter(t=>taskMemberIds(t).includes(m.id)).length})).sort((a,b)=>b.count-a.count);const max=Math.max(1,...rows.map(x=>x.count));$('v40Workload').innerHTML=rows.map(r=>`<div class="v40-work-row"><span title="${esc(r.name)}">${esc(r.name)}</span><div class="v40-work-track"><div class="v40-work-fill" style="width:${r.count/max*100}%"></div></div><strong>${r.count}</strong></div>`).join('')||'<p class="muted">ไม่มีข้อมูล</p>';
 $('v40Priority').innerHTML=['P1','P2','P3','P4'].map(p=>`<div class="remaining-row"><span class="v40-priority v40-${p.toLowerCase()}">${p}</span><strong>${active.filter(t=>(t.priority||'P3')===p).length}</strong></div>`).join('');}
function v40WeekStartValue(d){const x=new Date(d+'T12:00:00');x.setDate(x.getDate()-((x.getDay()+6)%7));return dateOnly(x);}
function v40WeeklyItems(){const start=$('v40WeekStart').value||v40WeekStartValue(today()),d=new Date(start+'T12:00:00');d.setDate(d.getDate()+6);const end=dateOnly(d);return {start,end,items:tasks.filter(t=>{const a=t.start_date||t.due_date,b=t.due_date||t.start_date;return a&&b&&a<=end&&b>=start;})};}
function v40WeeklyReport(){const {start,end,items}=v40WeeklyItems(),completed=items.filter(t=>t.status==='Completed').length,active=items.filter(t=>t.status!=='Completed').length,overdue=items.filter(t=>t.status!=='Completed'&&t.due_date&&t.due_date<today()).length;
 $('v40WeekSummary').innerHTML=`<p class="muted">${start} ถึง ${end} · งานที่มีช่วงเวลาทับซ้อนสัปดาห์นี้</p><div class="v40-summary-cards"><span>ทั้งหมด <b>${items.length}</b></span><span>คงเหลือ <b>${active}</b></span><span>Completed <b>${completed}</b></span><span>Overdue <b>${overdue}</b></span></div><div class="scroll"><table><thead><tr><th>งาน</th><th>Priority</th><th>สถานะ</th><th>Progress</th><th>ทีม</th><th>Due</th></tr></thead><tbody>${items.map(t=>`<tr><td>${esc(t.title)}</td><td>${esc(t.priority||'P3')}</td><td>${esc(t.status)}</td><td>${Number(t.progress)||0}%</td><td>${esc(taskTeamLabel(t))}</td><td>${esc(t.due_date||'—')}</td></tr>`).join('')}</tbody></table></div>`;}
function v40CsvCell(v){return '"'+String(v??'').replace(/"/g,'""')+'"';}
function v40ExportWeek(){const {start,end,items}=v40WeeklyItems();const cols=['Title','Category','Priority','Status','Progress','Main PIC','Co-PIC','Start Date','Start Time','Due Date','End Time'];const lines=[cols,...items.map(t=>[t.title,t.category,t.priority||'P3',t.status,t.progress,taskOwnerLabel(t),taskCoNames(t).join('; '),t.start_date,t.start_time,t.due_date,t.end_time])];const csv='\ufeff'+lines.map(row=>row.map(v40CsvCell).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`MT56251_Weekly_${start}_${end}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('v40WeekStart').value=v40WeekStartValue(today());
$('v40WeekStart').onchange=v40WeeklyReport;
$('v40WeekThis').onclick=()=>{$('v40WeekStart').value=v40WeekStartValue(today());v40WeeklyReport();};
$('v40WeekExport').onclick=v40ExportWeek;
$('v40MyTasks').onchange=render;
for(const id of ['calCategory','calStatus','calPriority','calMine'])$(id).onchange=renderCalendar;
$('calOwnerButton').onclick=()=>{$('calOwnerMenu').classList.toggle('hidden');v405UpdateOwnerLabel();};
$('calOwnerAll').onclick=()=>{v405SelectedOwners=null;v405RenderOwnerMenu();renderCalendar();};
$('calOwnerNone').onclick=()=>{v405SelectedOwners=new Set();v405RenderOwnerMenu();renderCalendar();};
$('calOwnerList').onchange=e=>{if(!e.target.matches('input[type="checkbox"]'))return;const all=members.filter(m=>m.role!=='guest').map(m=>m.id);const chosen=new Set([...$('calOwnerList').querySelectorAll('input:checked')].map(x=>x.value));v405SelectedOwners=chosen.size===all.length?null:chosen;v405UpdateOwnerLabel();renderCalendar();};
document.addEventListener('click',e=>{if(!$('calOwnerWidget').contains(e.target)){$('calOwnerMenu').classList.add('hidden');v405UpdateOwnerLabel();}});

$('calClear').onclick=()=>{for(const id of ['calCategory','calStatus','calPriority'])$(id).value='';v405SelectedOwners=null;v405RenderOwnerMenu();$('calMine').checked=false;renderCalendar();};
document.addEventListener('click',e=>{const b=e.target.closest('[data-v40-day]');if(!b)return;const day=b.dataset.v40Day;month=new Date(day+'T12:00:00');v40Panel(day);renderCalendar();});
// V4.0.10: Today button must be bound inside this closure.
// Preserve the current Month / Week / Day mode and all active filters.
$('calendarToday').onclick=()=>{
  const now=new Date();
  month=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  v40SelectedDate=today();
  renderCalendar();
};

// V4.1 Phase 1 – client-side review only. No Graph tokens or Teams content persisted.
const teams41MaxItems=25;
let teams41Items=[];
function teams41Split(raw){
  const chunks=raw.split(/\n\s*\n|\n(?=(?:\d+[.)]|[-*•])\s+)/g).map(x=>x.trim()).filter(Boolean);
  return (chunks.length>1?chunks:[raw.trim()]).slice(0,teams41MaxItems).map((chunk,i)=>{
    const first=chunk.split('\n').map(s=>s.trim()).find(Boolean)||`Action ${i+1}`;
    const title=first.replace(/^(?:\d+[.)]|[-*•])\s*/, '').slice(0,200);
    const pic=chunk.match(/(?:PIC|Owner|ผู้รับผิดชอบ|To)\s*[:：]\s*([^\n]+)/i)?.[1]?.trim()||'';
    const due=chunk.match(/(?:Due\s*Date|Due|Target|กำหนดเสร็จ)\s*[:：]\s*([^\n]+)/i)?.[1]?.trim()||'';
    return {title,details:chunk.slice(0,3000),pic,due};
  });
}
function teams41Render(){
  const box=$('teams41Candidates');
  box.innerHTML=teams41Items.length?teams41Items.map((item,i)=>`<div class="teams41-item"><h4>${i+1}. ${esc(item.title)}</h4><p><b>PIC (ข้อความต้นทาง):</b> ${esc(item.pic||'ไม่พบ')}</p><p><b>Due (ข้อความต้นทาง):</b> ${esc(item.due||'ไม่พบ')}</p><p class="muted">ตรวจสอบชื่องานและผู้รับผิดชอบอีกครั้งก่อนบันทึก</p><button type="button" data-teams41-review="${i}">เปิดฟอร์ม Add Task</button></div>`).join(''):'<p class="muted">ยังไม่มีรายการ</p>';
}
$('teams41Analyze').onclick=()=>{
  if(profile?.role!=='admin')return;
  const raw=$('teams41Source').value.trim();
  if(!raw){$('teams41Info').textContent='กรุณาวางข้อความก่อน';return;}
  teams41Items=teams41Split(raw);
  $('teams41Info').textContent=`พบ ${teams41Items.length} รายการเบื้องต้น (ยังไม่ได้บันทึก) · การแยกข้อความเป็นแบบพื้นฐาน ต้องตรวจสอบด้วยตนเอง`;
  teams41Render();
};
$('teams41Clear').onclick=()=>{teams41Items=[];$('teams41Source').value='';$('teams41Link').value='';$('teams41Info').textContent='';teams41Render()};
$('teams41Candidates').addEventListener('click',e=>{
  const b=e.target.closest('[data-teams41-review]');if(!b||profile?.role!=='admin')return;
  const item=teams41Items[Number(b.dataset.teams41Review)];if(!item)return;
  const duplicate=tasks.some(t=>t.title.trim().toLowerCase()===item.title.trim().toLowerCase());
  openTask(null);
  $('title').value=item.title;
  const link=$('teams41Link').value.trim();
  const safeLink=/^https:\/\/([a-z0-9-]+\.)*teams\.microsoft\.com\//i.test(link)?link:'';
  $('description').value=item.details+(safeLink?'\n\nTeams source: '+safeLink:'');
  $('taskMsg').textContent=(duplicate?'พบชื่องานซ้ำใน Tasks – โปรดตรวจสอบก่อนบันทึก. ':'')+'ตรวจสอบ PIC, Due Date, Priority และรายละเอียดก่อนกดบันทึก';
});

boot().catch(e=>{$('setupMsg').textContent=e.message;show('setup',true)});
})();

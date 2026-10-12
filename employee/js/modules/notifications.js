// ══ NOTIFICATIONS ══
function rNotif(){
  const el=document.getElementById('notif-list');if(!el)return;
  if(!NOTIFS.length){
    el.innerHTML=`<div class="card" style="padding:32px 20px;text-align:center">
      <div style="font-size:30px;margin-bottom:8px">\uD83D\uDD14</div>
      <div style="font-weight:650;font-size:15px;margin-bottom:4px">You're all caught up</div>
      <div style="font-size:13px;color:var(--t3);line-height:1.5">New tasks, reviews, messages, notices and leave updates will show up here.</div>
    </div>`;
    return;
  }
  const row=n=>`
    <div onclick="hNotif('${escJs(String(n.id))}')" style="display:flex;gap:12px;align-items:flex-start;padding:13px 16px;cursor:pointer;border-bottom:1px solid var(--b);${n.unread?'background:rgba(0,122,255,.05);':''}">
      <div style="width:36px;height:36px;border-radius:11px;background:${escAttr(n.iconBg||'var(--s2)')};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${n.icon||'\uD83D\uDD14'}</div>
      <div style="flex:1;min-width:0">
        ${n.type==='een'?`<span style="display:inline-block;background:var(--bl);color:var(--blc);padding:1px 8px;border-radius:99px;font-size:10px;font-weight:700;margin-bottom:4px">Een</span>`:''}
        <div style="font-size:13.5px;line-height:1.45;font-weight:${n.unread?650:500}">${esc(n.text)}</div>
        ${n.sub?`<div style="font-size:12.5px;color:var(--t3);line-height:1.5;margin-top:2px">${esc(n.sub)}</div>`:''}
        <div style="font-size:11.5px;color:var(--t4,var(--t3));margin-top:4px">${esc(n.time||'')}</div>
      </div>
      ${n.unread?'<div style="width:9px;height:9px;border-radius:50%;background:var(--blue,#007AFF);margin-top:6px;flex-shrink:0"></div>':''}
    </div>`;
  const fresh=NOTIFS.filter(n=>n.unread), old=NOTIFS.filter(n=>!n.unread);
  const head=t=>`<div style="padding:10px 16px 6px;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--t3)">${t}</div>`;
  el.innerHTML=`<div class="card" style="padding:0;overflow:hidden">`+
    (fresh.length?head('New \u00b7 '+fresh.length)+fresh.map(row).join(''):'')+
    (old.length?head('Earlier')+old.map(row).join(''):'')+`</div>`;
}

function hNotif(id){
  const n=NOTIFS.find(x=>String(x.id)===String(id));
  const raw=(DataAPI.raw().notifications||[]).find(x=>String(x.id)===String(id))||{};
  DataAPI.markNotificationRead(id).catch(function(){}).then(function(){
    syncUserState();updBadges();
    var type=raw.entityType || null;
    /* Older notifications may not have entityType. Recover the destination
       from the entity id so older and newer notifications behave the same. */
    if (!type && raw.entityId != null) {
      if ((DataAPI.raw().subtasks||[]).some(function(x){return String(x.id)===String(raw.entityId);})) type='SUBTASK';
      else if ((DataAPI.raw().deliverables||[]).some(function(x){return String(x.id)===String(raw.entityId);})) type='DELIVERABLE';
      else if ((DataAPI.raw().projects||[]).some(function(x){return String(x.id)===String(raw.entityId);})) type='PROJECT';
    }
    /* Every notification that points to something in the employee app now
       has a destination. Unknown informational notifications simply stay
       on the notification page but are still marked read. */
    if(type==='LEAVE'||type==='REGULARISATION'){nav('leave',document.querySelector('[data-v=leave]'));return;}
    if(type==='WALLET'||type==='DISPUTE'||type==='PENALTY'||type==='PENALTY_APPEAL'){nav('wallet',document.querySelector('[data-v=wallet]'));return;}
    if(type==='NOTICE'&&typeof openNotice==='function'){nav('notices',document.querySelector('[data-v=notices]'));openNotice(raw.entityId);return;}
    if(type==='CONVERSATION'){
      var conv=(DataAPI.raw().conversations||[]).find(function(c){return String(c.id)===String(raw.entityId);});
      if(typeof _chatWith!=='undefined'){_chatWith=conv&&conv.kind==='PEER'?Number((conv.participantIds||[]).find(function(x){return Number(x)!==Number(CU.id);})):'admin';}
      nav('messages',document.querySelector('[data-v=messages]'));return;}
    var tid=(n&&n.taskId)||(type==='DELIVERABLE'?raw.entityId:null);
    if(type==='SUBTASK'){
      var st=(SUBTASKS||[]).find(function(x){return String(x.id)===String(raw.entityId);});
      if(st){openDetail(st.id);return;}
    }
    if(tid&&TASKS.some(t=>String(t.id)===String(tid))){openDetail(TASKS.find(t=>String(t.id)===String(tid)).id);return;}
    if(type==='MILESTONE'||type==='PROJECT'){
      var obj=type==='PROJECT' ? (PROJECTS||[]).find(function(p){return String(p.id)===String(raw.entityId);}) : null;
      if(obj&&typeof openProj==='function'){openProj(obj.id);return;}
      nav('projects',document.querySelector('[data-v=projects]'));return;
    }
    rNotif();
  });
}

/* new notifications pop up (and ding) whenever the badges refresh */
(function(){
  var _ub=window.updBadges;
  if(typeof _ub!=='function')return;
  window.updBadges=function(){
    _ub.apply(this,arguments);
    if(window.NotifyPop&&typeof NOTIFS!=='undefined'&&CU)NotifyPop.update(NOTIFS.map(function(n){
      return {id:n.id,title:n.text,sub:n.sub,unread:!!n.unread,icon:n.icon};
    }),function(id){hNotif(id);});
  };
})();

function markRead(){
  if(!CU)return;
  DataAPI.markAllNotificationsRead(CU.id).then(function(){
    syncUserState();updBadges();rNotif();toast('All read');
  });
}
var markAllRead=markRead;
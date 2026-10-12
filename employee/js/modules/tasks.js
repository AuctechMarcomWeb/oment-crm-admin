// ══════════════════════════════════════════════
// TASK DETAIL
// ══════════════════════════════════════════════

function openDetail(id){
  var t=findWorkItem(id);if(!t)return;
  if(t.isSubtask){ rSubtaskDetail(t); nav('detail',null); document.getElementById('v-detail').scrollTop=0; return; }
  rDetail(t);nav('detail',null);document.getElementById('v-detail').scrollTop=0;
}

/* note + files waiting to be submitted for a task inside a deliverable */
var _stNote={},_stFiles={};
function _stFilesHtml(id){
  return (_stFiles[id]||[]).map(function(f,i){
    return '<span style="display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:99px;background:var(--s2);font-size:12px">\uD83D\uDCC4 '+esc(f.name)+
      (f.uploading?' <span style="color:var(--t3)">uploading\u2026</span>':'')+
      ' <button style="border:0;background:none;cursor:pointer;color:var(--t3);font-size:13px;padding:0" onclick="stRemoveFile('+id+','+i+')" title="Remove">\u2715</button></span>';
  }).join('');
}
function _stRefreshFiles(id){
  var box=document.getElementById('stf-'+id);if(!box)return;
  var lbl=box.querySelector('label');
  box.innerHTML=_stFilesHtml(id);if(lbl)box.appendChild(lbl);
}
function stAddFiles(e,id){
  var files=Array.from(e.target.files||[]);e.target.value='';
  if(!files.length)return;
  if(!window.OmentAPI||!OmentAPI.uploadFile){toast('Files need the server connection','err');return;}
  _stFiles[id]=_stFiles[id]||[];
  files.forEach(function(f){
    if(f.size>50*1024*1024){toast(f.name+' is over 50 MB','err');return;}
    var item={name:f.name,uploading:true};_stFiles[id].push(item);
    OmentAPI.uploadFile(f).then(function(r){
      item.uploading=false;item.fileId=r.fileId;item.mime=r.mime||f.type;item.sizeBytes=r.sizeBytes||f.size;item.name=r.name||f.name;
      _stRefreshFiles(id);
    }).catch(function(err){
      _stFiles[id]=(_stFiles[id]||[]).filter(function(x){return x!==item;});_stRefreshFiles(id);
      toast('Upload failed: '+(err.message||f.name),'err');
    });
  });
  _stRefreshFiles(id);
}
function stRemoveFile(id,i){(_stFiles[id]||[]).splice(i,1);_stRefreshFiles(id);}

function rSubtaskDetail(task){
  var el=document.getElementById('det-body');if(!el)return;
  var parent=findWorkItem(task.parentId)||TASKS.find(function(x){return x.id===task.deliverableId;});
  var canStart=task.status==='todo'||task.status==='inprogress'||task.status==='rejected';
  var approved=!task.adminStatus || task.adminStatus==='approved';
  var html='<div class="dh">';
  html+='<button class="dh-back" onclick="goBack()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg></button>';
  html+='<div class="dh-t">'+esc(task.title)+'</div>'+sb(task.status);
  if(task.active) html+='<button class="btn btn-ghost btn-sm" onclick="toggleT();rSubtaskDetail(findWorkItem('+task.id+'))">'+(trun?'⏸ Pause':'▶ Resume')+'</button>';
  else if(canStart && approved) html+='<button class="btn btn-solid btn-sm" onclick="confirmSwitch('+task.id+')">▶ Start</button>';
  if(task.active||task.status==='inprogress') html+='<button class="btn btn-green btn-sm" onclick="goSubmit('+task.id+')">✓ Submit</button>';
  html+='</div>';
  html+='<div style="padding:16px 18px 96px">';
  html+='<div class="card" style="margin-bottom:13px">';
  html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px"><div><div style="font-size:15px;font-weight:700">'+esc(task.title)+'</div><div style="font-size:12px;color:var(--t3);margin-top:3px">Subtask of <strong>'+esc(task.parentTitle||'Deliverable')+'</strong></div></div>';
  html+=task.adminStatus==='approved'?'<span style="font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:99px;background:#ECFDF5;color:#065F46">✓ Admin approved</span>':'';
  html+='</div>';
  html+='<div style="font-size:13px;color:var(--t2);line-height:1.6;margin-bottom:12px">'+esc(task.desc||'No description added.')+'</div>';
  html+='<div class="dm-g">';
  html+='<div class="dm"><div class="dm-l">Priority</div><div style="margin-top:3px">'+pb(task.priority)+'</div></div>';
  html+='<div class="dm"><div class="dm-l">Parent</div><div class="dm-v" style="font-size:12px">'+esc(task.parentTitle||'Deliverable')+'</div></div>';
  html+='<div class="dm"><div class="dm-l">Est. Time</div><div class="dm-v">'+fmtSh(task.exp||0)+'</div></div>';
  html+='</div></div>';
  if(task.status==='rejected'&&task.adminStatus==='approved') html+='<div class="rej-b" style="margin-bottom:12px"><div style="font-size:13px;font-weight:700;color:var(--red);margin-bottom:5px">Sent back after review</div><div style="font-size:12.5px">'+esc(task.rejReason||'Please fix and submit again.')+'</div><div style="font-size:11.5px;color:var(--t3);margin-top:6px">Press Start to continue the work, then Submit again.</div></div>';
  if(task.adminStatus==='rejected') html+='<div style="margin:-4px 0 12px"><button class="btn btn-purple btn-sm" onclick="doResubmit('+task.id+')">\u21BB Send again for approval</button></div>';
  if(task.adminStatus==='pending'&&task.status!=='submitted') html+='<div class="sub-b" style="margin-bottom:12px"><span style="font-size:13px;font-weight:600;color:var(--plc)">\u23F3 Waiting for Admin to approve this task before you can start</span></div>';
  else if(task.status==='submitted') html+='<div class="sub-b" style="margin-bottom:12px"><span style="font-size:13px;font-weight:600;color:var(--plc)">\uD83D\uDCE4 Submitted \u2014 waiting for Admin review</span></div>';
  if(false) html+='<div class="sub-b" style="margin-bottom:12px"><span style="font-size:13px;font-weight:600;color:var(--plc)">⏳ Waiting for Admin approval</span></div>';
  if(task.adminStatus==='rejected') html+='<div class="rej-b" style="margin-bottom:12px"><div style="font-size:13px;font-weight:700;color:var(--red);margin-bottom:5px">Task sent back</div><div style="font-size:12.5px">'+esc(task.rejReason||'Please revise and resubmit.')+'</div></div>';
  html+='<div class="card"><div style="font-size:12px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Time Tracking</div>';
  html+='<div class="dm-g"><div class="dm"><div class="dm-l">Expected</div><div class="dm-v">'+fmtSh(task.exp||0)+'</div></div><div class="dm"><div class="dm-l">Actual</div><div class="dm-v">'+fmtSh(task.logged||0)+'</div></div><div class="dm"><div class="dm-l">Status</div><div class="dm-v">'+(task.active?(trun?'Running':'Paused'):task.status)+'</div></div></div>';
  if(task.active) html+='<div style="margin-top:12px;font-family:var(--mono);font-size:26px;font-weight:800;color:var(--blue)" id="det-timer">'+fmtMono(tsecs)+'</div>';
  html+='</div>';
  /* submit for review, like a deliverable: a short note for the admin */
  if(approved && (task.active||task.status==='inprogress'||(task.status==='rejected'&&task.adminStatus==='approved'))){
    html+='<div class="card" style="margin-top:13px"><div style="font-size:12px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Submit for review</div>'+
      '<textarea class="fta" id="stn-'+task.id+'" style="min-height:64px" placeholder="What did you do? Anything the admin should check?" oninput="_stNote['+task.id+']=this.value">'+esc(_stNote[task.id]||'')+'</textarea>'+
      '<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center" id="stf-'+task.id+'">'+_stFilesHtml(task.id)+
        '<label class="btn btn-ghost btn-sm" style="cursor:pointer">\uD83D\uDCCE Attach files<input type="file" multiple style="display:none" onchange="stAddFiles(event,'+task.id+')"></label></div>'+
      '<div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn btn-green btn-sm" onclick="doSubmit('+task.id+')">\u2713 Submit for review</button></div></div>';
  }
  html+='</div>';
  el.innerHTML=html;
}

function rDetail(task){
  var el=document.getElementById('det-body');if(!el)return;
  var u=urg(task.dms),exp=task.exp||3600,diff=(task.logged||0)-exp;
  var isEdit=task.status==='todo'||task.status==='inprogress'||task.status==='rejected';

  var html='<div class="dh">';
  html+='<button class="dh-back" onclick="goBack()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg></button>';
  html+='<div class="dh-t">'+esc(task.title)+'</div>';
  html+=sb(task.status);
  var canStart={ok:true};
  if(isEdit&&!task.active&&typeof Wallet!=='undefined'&&CU)canStart=Wallet.canStart(CU.id,task.id);
  if(isEdit&&!task.active){
    if(canStart.ok)html+='<button class="btn btn-solid btn-sm" onclick="confirmSwitch('+task.id+')">▶ Start</button>';
    else html+='<button class="btn btn-ghost btn-sm" disabled title="'+esc(canStart.reason)+'" style="opacity:.6">▶ Start</button>';
  }
  if(task.isPiece&&!task.settlement&&(typeof Wallet!=='undefined'&&Wallet.moneyVisibleToEmployees()))html+='<span class="wl-chip">'+_rup(task.myPricePaise||task.pricePaise)+'</span>';
  if(task.active){
    html+='<button class="btn btn-ghost btn-sm" onclick="toggleT();rDetail(TASKS.find(function(t){return t.id==='+task.id+'})||{})">'+(trun?'\u23F8 Pause':'\u25B6 Resume')+'</button>';
    html+='<span style="font-size:11.5px;color:var(--blue);font-weight:600">'+(trun?'\u25CF Running':'\u25CF Paused')+'</span>';
  }
  if(isEdit&&(task.active||task.status==='inprogress'))html+='<button class="btn btn-green btn-sm" onclick="goSubmit('+task.id+')">\u2713 Complete</button>';
  html+='</div>';

  html+='<div style="padding:16px 18px">';

  // Status banners
  if(task.status==='rejected'){
    html+='<div class="rej-b">';
    html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
    html+='<div style="width:26px;height:26px;border-radius:50%;background:rgba(220,38,38,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    html+='<div style="font-size:13px;font-weight:700;color:var(--red)">This task was sent back</div></div>';
    html+='<div style="font-size:12.5px;color:var(--t2);line-height:1.55;margin-bottom:10px">'+esc(task.rejReason)+'</div>';
    html+='<button class="btn btn-red btn-sm" onclick="doResubmit('+task.id+')">\u21BB Start again</button></div>';
  }
  if(task.status==='approved')html+='<div class="app-b"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg><span style="font-size:13px;font-weight:600;color:var(--glc)">Approved \u2713 \u2014 well done!</span></div>';
  if(task.status==='submitted')html+='<div class="sub-b"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--purple)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span style="font-size:13px;font-weight:600;color:var(--plc)">Submitted \u2014 your manager is reviewing it</span></div>';

  if(isEdit&&!task.active&&!canStart.ok&&canStart.code==='WIP_LIMIT')html+='<div class="wl-note" style="border-color:rgba(217,119,6,.4)">'+esc(canStart.reason)+'</div>';

  html+='<div class="dlayout">';
  html+='<div>';

  // Piece-rate: blocked / agreement / price (wallet.js)
  if(typeof wlBlockedCard==='function')html+=wlBlockedCard(task);
  if(typeof wlAgreementCard==='function')html+=wlAgreementCard(task);

  // Basic info + time tracking
  html+='<div class="card" style="margin-bottom:13px">';
  html+='<div style="font-size:15px;font-weight:700;margin-bottom:5px">'+esc(task.title)+'</div>';
  html+='<div style="font-size:13px;color:var(--t2);line-height:1.6;margin-bottom:12px">'+esc(task.desc)+'</div>';
  html+='<div class="dm-g">';
  html+='<div class="dm"><div class="dm-l">Priority</div><div style="margin-top:3px">'+pb(task.priority)+'</div></div>';
  html+='<div class="dm"><div class="dm-l">Deadline</div><span class="'+u.cls+'" style="margin-top:3px;font-size:11.5px">'+u.s+'</span><div style="font-size:11px;color:var(--t4);margin-top:2px">'+(task.dlabel||task.deadlineLabel||'')+'</div></div>';
  html+='<div class="dm"><div class="dm-l">Est Time</div><div class="dm-v">'+fmtSh(exp)+'</div></div>';
  html+='</div>';
  html+='<div style="margin-top:12px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);margin-bottom:7px">⏱ Time Tracking</div>';
  html+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px">';
  html+='<div style="background:var(--s2);border-radius:var(--r2);padding:8px 10px"><div style="font-size:9.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.3px;margin-bottom:3px">Expected</div><div style="font-size:13px;font-weight:700;font-family:var(--mono)">'+fmtSh(exp)+'</div></div>';
  html+='<div style="background:'+(diff>60?'var(--rl)':diff<-60?'var(--gl)':'var(--s2)')+';border-radius:var(--r2);padding:8px 10px"><div style="font-size:9.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.3px;margin-bottom:3px">Actual</div><div style="font-size:13px;font-weight:700;font-family:var(--mono)">'+fmtSh(task.logged||0)+'</div></div>';
  html+='<div style="background:'+(diff>60?'var(--rl)':diff<-60?'var(--gl)':'var(--s2)')+';border-radius:var(--r2);padding:8px 10px"><div style="font-size:9.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.3px;margin-bottom:3px">'+(diff>60?'Over by':diff<-60?'Saved':'Status')+'</div><div style="font-size:13px;font-weight:700;font-family:var(--mono)">'+
    (Math.abs(diff)<60?'✓':(diff>0?'+':'-')+fmtSh(Math.abs(diff)))+'</div></div>';
  html+='</div></div></div>';

  if(typeof wlPriceCard==='function')html+='<div id="wl-price-wrap">'+wlPriceCard(task,task.active?tsecs:null)+'</div>';

  // Instruction files
  if(task.files&&task.files.length){
    html+='<div class="card" style="margin-bottom:13px">';
    html+='<div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">\uD83D\uDCCE Files from your manager</div>';
    task.files.forEach(function(f){
      html+='<div class="fi-row">'+ft(f.kind||f.type||f.t)+'<span class="fi-nm">'+esc(f.name||f.n)+'</span><span class="fi-sz">'+esc(f.sizeLabel||f.size||f.s||'')+'</span>';
      html+='<div class="fi-act">';
      html+='<div class="fi-btn" onclick="downloadFile(\''+escJs(f.fileId||'')+'\',\''+escJs(f.name||f.n)+'\',0)" title="Open"><svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 0 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></div>';
      html+='<div class="fi-btn" onclick="downloadFile(\''+escJs(f.fileId||'')+'\',\''+escJs(f.name||f.n)+'\',1)" title="Download"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>';
      html+='</div></div>';
    });
    html+='</div>';
  }

  // Work chat
  html+='<div class="card" style="margin-bottom:13px">';
  html+='<div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">\uD83D\uDCAC Discussion on this task</div>';
  html+='<div class="cw" id="cw-'+task.id+'">';
  if(task.msgs&&task.msgs.length){
    task.msgs.forEach(function(m){
      html+='<div class="cm"><div class="cm-hd">'+av(m.bg,m.fg||m.fc,m.ini||m.initials,20)+'<span class="cm-nm">'+esc(m.from)+'</span><span class="cm-tm">'+m.time+'</span></div>';
      html+='<div class="cm-b">'+esc(m.text)+'</div></div>';
    });
  } else {html+='<div style="padding:10px 0;text-align:center;font-size:12px;color:var(--t4)">No messages yet</div>';}
  html+='</div>';
  html+='<div class="ci-row"><input class="fin" id="ci-'+task.id+'" style="flex:1;height:34px;font-size:14px" placeholder="Have a question? Type it here…" onkeypress="if(event.key===\'Enter\')sendMsg('+task.id+')"><button class="btn btn-solid btn-sm" onclick="sendMsg('+task.id+')">Send</button></div>';
  html+='</div>';

  // Submit work
  if(isEdit){
    html+='<div class="card" style="margin-bottom:13px">';
    html+='<div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">\uD83D\uDCE4 Submit your work here</div>';
    if(task.subFiles&&task.subFiles.length){
      html+='<div style="margin-bottom:10px">';
      html+='<div style="font-size:11.5px;font-weight:600;color:var(--t2);margin-bottom:6px">Uploaded files ('+task.subFiles.length+')</div>';
      task.subFiles.forEach(function(f,i){
        html+='<div class="fi-row">'+ft(f.kind||f.type||f.t)+'<span class="fi-nm">'+esc(f.name||f.n)+'</span><span class="fi-sz">'+esc(f.sizeLabel||f.size||f.s||'')+'</span>';
        html+='<div class="fi-act">';
        html+='<div class="fi-btn" onclick="downloadFile(\''+escJs(f.fileId||'')+'\',\''+escJs(f.name||f.n)+'\',1)" title="Download"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>';
        html+='<div class="fi-btn" style="color:var(--red)" onclick="removeSubFile('+task.id+','+i+')" title="Remove"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
        html+='</div></div>';
      });
      html+='</div>';
    }
    html+='<div class="upload-zone" id="uz-'+task.id+'" ondragover="uzDrag(event,\''+task.id+'\')" ondragleave="uzLeave(\''+task.id+'\')" ondrop="uzDrop(event,'+task.id+')">';
    html+='<input type="file" multiple onchange="uzPick(event,'+task.id+')" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.zip">';
    html+='<div class="upload-zone-icon"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>';
    html+='<div class="upload-zone-t">Drop a file here, or click to choose</div>';
    html+='<div class="upload-zone-s">PDF, Word, Excel, photo, ZIP \u2014 up to 50 MB per file</div>';
    html+='</div>';
    html+='<textarea class="fta" id="sn-'+task.id+'" placeholder="What you did, any problems, how you solved them \u2014 a short note…" style="margin:10px 0">'+(task.subNotes||'')+'</textarea>';
    html+='<button class="btn btn-green btn-full" onclick="doSubmit('+task.id+')">';
    html+='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>';
    html+='Submit for review</button>';
    html+='</div>';
  } else if(task.subFiles&&task.subFiles.length){
    html+='<div class="card" style="margin-bottom:13px">';
    html+='<div style="font-size:11px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📎 Your Submission</div>';
    task.subFiles.forEach(function(f){
      html+='<div class="fi-row">'+ft(f.kind||f.type||f.t)+'<span class="fi-nm">'+esc(f.name||f.n)+'</span><span class="fi-sz">'+esc(f.sizeLabel||f.size||f.s||'')+'</span>';
      html+='<div class="fi-btn" onclick="downloadFile(\''+escJs(f.fileId||'')+'\',\''+escJs(f.name||f.n)+'\',1)" title="Download"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>';
      html+='</div>';
    });
    if(task.subNotes)html+='<div style="font-size:13px;color:var(--t2);background:var(--s2);padding:10px 12px;border-radius:var(--r2);margin-top:8px">'+esc(task.subNotes)+'</div>';
    html+='</div>';
  }

  html+='</div>';

  /* Subtasks live under the deliverable, but each is a real work item with
     its own approval state, timer and completion review. */
  if(task.subtasks && task.subtasks.length){
    html+='<div class="card" style="margin-bottom:13px">';
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px"><div><div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.5px">Subtasks</div><div style="font-size:12px;color:var(--t3);margin-top:2px">'+task.subtasks.length+' task'+(task.subtasks.length===1?'':'s')+' inside this deliverable</div></div><span style="font-size:10px;background:var(--s2);padding:3px 8px;border-radius:99px;color:var(--t2)">Work breakdown</span></div>';
    task.subtasks.forEach(function(s){
      var live=findWorkItem(s.id)||s;
      var ready=live.adminStatus==='approved' && live.status!=='approved' && live.status!=='submitted';
      var action='';
      if(live.active) action='<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();toggleT();rSubtaskDetail(findWorkItem('+live.id+'))">'+(trun?'⏸ Pause':'▶ Resume')+'</button>';
      else if(ready) action='<button class="btn btn-solid btn-sm" onclick="event.stopPropagation();confirmSwitch('+live.id+')">▶ Start</button>';
      var label=live.adminStatus==='pending'?'Waiting for Admin':live.adminStatus==='rejected'?'Sent back':live.status==='submitted'?'Completion review':live.status==='approved'?'Completed':'Approved · Ready';
      html+='<div onclick="openDetail('+live.id+')" style="display:flex;align-items:center;gap:10px;padding:10px 11px;border:1px solid var(--b1);border-radius:9px;margin-bottom:6px;cursor:pointer;background:var(--surface)">';
      html+='<div style="width:8px;height:8px;border-radius:50%;background:'+(live.active?'var(--blue)':live.adminStatus==='approved'?'var(--green)':live.adminStatus==='pending'?'var(--amber)':'var(--red)')+';flex-shrink:0"></div>';
      html+='<div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(live.title)+'</div><div style="font-size:10.5px;color:var(--t3);margin-top:2px">'+esc(label)+' · '+fmtSh(live.logged||0)+' / '+fmtSh(live.exp||0)+'</div></div>';
      html+=action;
      html+='</div>';
    });
    html+='</div>';
  }

  // Right column
  html+='<div>';
  html+='<div class="card" style="margin-bottom:12px">';
  html+='<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);margin-bottom:10px">Assignment</div>';
  html+='<div style="display:flex;align-items:center;gap:9px;margin-bottom:10px">'+av(task.byBg,task.byFg,task.byIni,28);
  html+='<div><div style="font-size:13px;font-weight:600">'+esc(task.by)+'</div><div style="font-size:11.5px;color:var(--t3)">'+(task.self?'Self-assigned':task.proj||'—')+'</div></div></div>';
  if(task.proj)html+='<div style="font-size:12px;color:var(--t3);margin-bottom:3px">Project: <strong style="color:var(--t1)">'+esc(task.proj)+'</strong></div>';
  if(task.ms)html+='<div style="font-size:12px;color:var(--t3)">Milestone: <strong style="color:var(--t1)">'+esc(task.ms)+'</strong></div>';
  html+='</div>';

  if(task.active){
    html+='<div style="background:var(--t1);color:#fff;border-radius:var(--r4);padding:15px;margin-bottom:12px;text-align:center">';
    html+='<div style="font-size:9.5px;opacity:.4;text-transform:uppercase;letter-spacing:1px;margin-bottom:7px">Live Timer</div>';
    html+='<div style="font-family:var(--mono);font-size:28px;font-weight:500;letter-spacing:-1.5px;margin-bottom:10px" id="det-timer">'+fmtMono(tsecs)+'</div>';
    html+='<div style="display:flex;gap:7px">';
    html+='<button class="btn btn-full" style="background:rgba(255,255,255,.1);color:#fff;border-color:transparent;justify-content:center;height:34px" onclick="toggleT()">'+(trun?'⏸ Pause':'▶ Resume')+'</button>';
    html+='<button class="btn btn-full" style="background:rgba(5,150,105,.2);color:#6EE7B7;border-color:transparent;justify-content:center;height:34px" onclick="doSubmit('+task.id+')">Submit</button>';
    html+='</div></div>';
  }

  html+='<div class="card">';
  html+='<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);margin-bottom:10px">Activity Timeline</div>';
  html+='<div class="tl">';
  (task.tl||[]).forEach(function(ev){
    html+='<div class="tl-i"><div class="tl-d tl-'+ev.type+'">'+tlIcon(ev.type)+'</div>';
    html+='<div><div class="tl-t">'+ev.text+'</div><div class="tl-s">'+ev.time+'</div></div></div>';
  });
  html+='</div></div>';

  html+='</div>';
  html+='</div>';
  html+='</div>';

  el.innerHTML=html;
}

// File handling
/* open (preview in a new tab) or download a file stored on the server */
/* "Complete" → jump to the submit box (add files + a note, then submit) */
function goSubmit(id){
  var w=findWorkItem(id);
  if(w&&w.isSubtask){
    var stn=document.getElementById('stn-'+id);
    var has=(stn&&stn.value.trim())||(_stNote[id]||'').trim()||(_stFiles[id]||[]).some(function(f){return f.fileId;});
    if(has){doSubmit(id);return;}
    if(stn){if(stn.scrollIntoView)stn.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(function(){stn.focus();},300);}
    toast('Write a short note or attach a file, then press Submit','err');
    return;
  }
  var box=document.getElementById('sn-'+id);
  if(box){box.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(function(){box.focus();},300);toast('Add your files and a short note, then press Submit for review');}
  else doSubmit(id);
}
function downloadFile(fileId,name,download){
  if(!fileId){toast('"'+name+'" was added before file uploads were connected \u2014 please upload it again','err');return;}
  if(!window.OmentAPI||!OmentAPI.openFile){toast('File storage needs the backend server','err');return;}
  OmentAPI.openFile(fileId,name,!!download).catch(function(err){toast(err.message||'Could not open the file','err');});
}
function uzDrag(e,id){e.preventDefault();var z=document.getElementById('uz-'+id);if(z)z.classList.add('drag');}
function uzLeave(id){var z=document.getElementById('uz-'+id);if(z)z.classList.remove('drag');}
function uzDrop(e,taskId){
  e.preventDefault();
  var z=document.getElementById('uz-'+taskId);if(z)z.classList.remove('drag');
  processFiles(e.dataTransfer.files,taskId);
}
function uzPick(e,taskId){processFiles(e.target.files,taskId);}
function processFiles(files,taskId){
  var task=TASKS.find(function(t){return t.id===taskId;});if(!task)return;
  var MAX=50*1024*1024;
  var list=Array.from(files),rejected=[];
  list=list.filter(function(f){if(f.size>MAX){rejected.push(f.name);return false;}return true;});
  if(rejected.length)toast(rejected.length+' file(s) over 50 MB skipped','err');
  if(!list.length)return;
  if(!window.OmentAPI||!OmentAPI.uploadFile){toast('File uploads need the backend server','err');return;}
  var zone=document.getElementById('uz-'+taskId);
  var zt=zone?zone.querySelector('.upload-zone-t'):null;
  if(zt)zt.textContent='Uploading '+list.length+' file'+(list.length>1?'s':'')+'\u2026';
  /* one after another, so a slow connection doesn't choke */
  var done=[],chain=Promise.resolve();
  list.forEach(function(f){
    chain=chain.then(function(){
      return OmentAPI.uploadFile(f,taskId).then(function(r){
        var ext=f.name.split('.').pop().toLowerCase();
        var kind=ext==='pdf'?'pdf':['jpg','jpeg','png','gif','webp'].indexOf(ext)>=0?'img':ext==='zip'?'zip':['xls','xlsx','csv'].indexOf(ext)>=0?'xls':'doc';
        var size=f.size>1048576?(f.size/1048576).toFixed(1)+' MB':Math.max(1,Math.round(f.size/1024))+' KB';
        done.push({name:r.name||f.name,sizeLabel:size,kind:kind,fileId:r.fileId,mime:r.mime,sizeBytes:r.sizeBytes,uploadedAt:r.uploadedAt});
      });
    });
  });
  chain.then(function(){
    return DataAPI.addDeliverableFiles(taskId,done,'submission');
  }).then(function(){
    syncUserState();
    var fresh=TASKS.find(function(t){return t.id===taskId;});
    if(fresh)rDetail(fresh);
    toast(done.length+' file'+(done.length>1?'s':'')+' uploaded \u2713','ok');
  }).catch(function(err){
    if(zt)zt.textContent='Drop a file here, or click to choose';
    toast((err&&err.message)||'Upload failed','err');
  });
}
function removeSubFile(taskId,idx){
  var task=TASKS.find(function(t){return t.id===taskId;});if(!task||!task.subFiles)return;
  var name=(task.subFiles[idx]||{}).name||'File';
  DataAPI.removeDeliverableFile(taskId,idx,'submission').then(function(){
    syncUserState();
    var fresh=TASKS.find(function(t){return t.id===taskId;});
    if(fresh)rDetail(fresh);
    toast(esc(name)+' removed');
  }).catch(function(err){toast(err.message||'Could not remove','err');});
}

function sendMsg(id){
  var inp=document.getElementById('ci-'+id);if(!inp||!inp.value.trim())return;
  var text=inp.value.trim();
  inp.value='';
  DataAPI.addDeliverableComment(id,CU.id,text).then(function(){
    syncUserState();
    var fresh=TASKS.find(function(x){return x.id===id;});
    if(fresh)rDetail(fresh);
  }).catch(function(err){inp.value=text;toast(err.message||'Could not send','err');});
}

function doSubmit(id){
  var t=findWorkItem(id);if(!t)return;
  if(t.isSubtask){
    var stn=document.getElementById('stn-'+t.id);
    var note=((stn&&stn.value.trim())||_stNote[t.id]||'').trim();
    var files=(_stFiles[t.id]||[]);
    if(files.some(function(f){return f.uploading;})){toast('Please wait \u2014 a file is still uploading','err');return;}
    files=files.filter(function(f){return f.fileId;}).map(function(f){return {name:f.name,fileId:f.fileId,mime:f.mime||'',sizeBytes:f.sizeBytes||0,uploadedAt:new Date().toISOString()};});
    if(!note&&!files.length){if(stn){stn.focus();}toast('Write a short note or attach a file, then press Submit','err');return;}
    if(t.active)stopT();
    t.active=false;
    var patch={status:'IN_REVIEW',submissionNotes:note};
    if(files.length)patch.submissionFiles=files;
    DataAPI.updateSubtask(t.id,patch)
      .then(function(){ delete _stNote[t.id]; delete _stFiles[t.id]; syncUserState(); rAll(); var fresh=findWorkItem(t.id); if(fresh) rSubtaskDetail(fresh); if(window.renderTaskBar)renderTaskBar(); toast('Task submitted for Admin review 📨','ok'); })
      .catch(function(err){ toast(err.message||'Could not submit task','err'); });
    return;
  }
  var n=document.getElementById('sn-'+id);
  var notes=n?n.value.trim():'';

  var btn=document.querySelector('#det-body .btn-green');
  if(btn){btn.disabled=true;btn.textContent='Submitting\u2026';}

  stopT();
  DataAPI.submitDeliverable(id,{notes:notes}).then(function(){
    syncUserState();
    var fresh=TASKS.find(function(x){return x.id===id;});
    if(fresh)rDetail(fresh);
    rAll();
    toast('Submitted! Awaiting manager review \uD83D\uDCE4','ok');
  }).catch(function(err){
    if(btn){btn.disabled=false;btn.textContent='Submit for Review';}
    toast(err.message||'Could not submit','err');
  });
}

function doResubmit(id){
  var t=findWorkItem(id);if(!t)return;
  if(t.isSubtask){
    DataAPI.updateSubtask(t.id,{status:'IN_REVIEW'})
      .then(function(){syncUserState();rAll();var fresh=findWorkItem(t.id);if(fresh)rSubtaskDetail(fresh);toast('Task sent back to Admin for review 📨','ok');})
      .catch(function(err){toast(err.message||'Could not resubmit task','err');});
    return;
  }
  DataAPI.updateDeliverable(id,{
    status:'IN_PROGRESS',approvalState:null,rejectionReason:null,
    submissionFiles:[],submissionNotes:''
  }).then(function(){
    syncUserState();
    activateTask(id,false);
    var fresh=TASKS.find(function(x){return x.id===id;});
    if(fresh)rDetail(fresh);
  }).catch(function(err){toast(err.message||'Could not restart','err');});
}
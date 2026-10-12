// ══ SELF ASSIGN ══
function oSA(editId,preProjName){
  var ex=editId?TASKS.find(function(t){return t.id===editId;}):null;
  var pp=preProjName||(ex?ex.proj:'')||'';
  var pri=ex?ex.priority:'medium';
  var projOpts=PROJECTS.map(function(p){return '<option value="'+esc(p.name)+'" '+(pp===p.name?'selected':'')+'>'+esc(p.name)+'</option>';}).join('');

  var formHtml=
    '<style>'+
    '.sf-field{margin-bottom:13px}'+
    '.sf-label{display:block;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#9B9899;margin-bottom:5px}'+
    '.sf-in{width:100%;height:42px;background:#fff;border:1.5px solid rgba(0,0,0,.1);border-radius:10px;padding:0 13px;font-family:var(--font);font-size:14px;color:#18171A;outline:none;transition:.15s;box-shadow:inset 0 1px 2px rgba(0,0,0,.04)}'+
    '.sf-in:focus{border-color:#18171A;box-shadow:0 0 0 3px rgba(24,23,26,.07)}'+
    '.sf-in::placeholder{color:#C4C2C6}'+
    '.sf-ta{width:100%;min-height:80px;background:#fff;border:1.5px solid rgba(0,0,0,.1);border-radius:10px;padding:10px 13px;font-family:var(--font);font-size:14px;color:#18171A;outline:none;resize:vertical;transition:.15s;box-shadow:inset 0 1px 2px rgba(0,0,0,.04);line-height:1.5}'+
    '.sf-ta:focus{border-color:#18171A;box-shadow:0 0 0 3px rgba(24,23,26,.07)}'+
    '.sf-sel{width:100%;height:42px;background:#fff;border:1.5px solid rgba(0,0,0,.1);border-radius:10px;padding:0 13px;font-family:var(--font);font-size:14px;color:#18171A;outline:none;cursor:pointer;box-shadow:inset 0 1px 2px rgba(0,0,0,.04)}'+
    '.sf-sel:focus{border-color:#18171A;box-shadow:0 0 0 3px rgba(24,23,26,.07)}'+
    '.pri-row{display:flex;gap:7px}'+
    '.pri-b{flex:1;height:38px;border-radius:10px;border:1.5px solid rgba(0,0,0,.1);background:#fff;font-family:var(--font);font-size:13px;font-weight:600;cursor:pointer;transition:.15s}'+
    '.pri-hi{color:#DC2626}.pri-hi.on{background:#FEF2F2;border-color:#DC2626}'+
    '.pri-md{color:#D97706}.pri-md.on{background:#FFFBEB;border-color:#D97706}'+
    '.pri-lo{color:#059669}.pri-lo.on{background:#ECFDF5;border-color:#059669}'+
    '.sf-toggle-row{display:flex;align-items:center;gap:12px;padding:13px 14px;background:#F5F3FF;border:1.5px solid rgba(124,58,237,.15);border-radius:12px}'+
    '.sf-toggle{width:44px;height:26px;border-radius:99px;background:#DDD9D2;border:none;cursor:pointer;position:relative;transition:.25s;flex-shrink:0;outline:none}'+
    '.sf-toggle.on{background:#7C3AED}'+
    '.sf-toggle::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:.25s;box-shadow:0 1px 3px rgba(0,0,0,.25)}'+
    '.sf-toggle.on::after{left:calc(100% - 23px)}'+
    '</style>'+

    '<div class="sf-field">'+
    '<label class="sf-label">What will you work on? *</label>'+
    '<input class="sf-in" id="sa-t" value="'+(ex?ex.title:'')+'" placeholder="e.g. Research competitor flows" autocomplete="off">'+
    '</div>'+

    '<div class="sf-field">'+
    '<label class="sf-label">Description</label>'+
    '<textarea class="sf-ta" id="sa-d" placeholder="Describe the task, approach, goal…">'+(ex?ex.desc:'')+'</textarea>'+
    '</div>'+

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:13px">'+
    '<div>'+
    '<label class="sf-label">Project</label>'+
    '<select class="sf-sel" id="sa-proj"><option value="">No project</option>'+projOpts+'</select>'+
    '</div>'+
    '<div>'+
    '<label class="sf-label">Target Date</label>'+
    '<input class="sf-in" id="sa-dl" type="date" style="cursor:pointer">'+
    '</div></div>'+

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:13px">'+
    '<div>'+
    '<label class="sf-label">Priority</label>'+
    '<div class="pri-row" id="sa-pri" data-value="'+pri+'">'+
    '<button class="pri-b pri-hi '+(pri==='high'?'on':'')+'" onclick="setSAPri(this,\'sa-pri\',\'high\')">🔴 High</button>'+
    '<button class="pri-b pri-md '+(pri==='medium'||pri!=='high'&&pri!=='low'?'on':'')+'" onclick="setSAPri(this,\'sa-pri\',\'medium\')">🟡 Med</button>'+
    '<button class="pri-b pri-lo '+(pri==='low'?'on':'')+'" onclick="setSAPri(this,\'sa-pri\',\'low\')">🟢 Low</button>'+
    '</div></div>'+
    '<div>'+
    '<label class="sf-label">Est. Hours</label>'+
    '<input class="sf-in" id="sa-h" type="number" min="0.5" step="0.5" value="'+(ex?ex.exp/3600:1)+'" style="text-align:center;font-size:16px;font-weight:700">'+
    '</div></div>'+

    '<div class="sf-toggle-row">'+
    '<div style="flex:1">'+
    '<div style="font-size:13px;font-weight:700;color:#5B21B6;margin-bottom:2px">Submit for Admin Review</div>'+
    '<div style="font-size:11.5px;color:rgba(91,33,182,.6)">Admin will approve or reject this task</div>'+
    '</div>'+
    '<button class="sf-toggle" id="sf-tog" onclick="sfToggle()" aria-role="switch"></button>'+
    '<input type="checkbox" id="sa-sub" style="display:none">'+
    '</div>';

  oMod(editId?'Edit Task':'New Self Task', formHtml,
    [{l:'Cancel',cls:'btn-ghost',a:cMod},
     {l:editId?'Save Changes':'Create Task',cls:'btn-purple',a:function(){saveSA(editId||null);}}]);
}

function setSAPri(el,gid,val){
  document.querySelectorAll('#'+gid+' .pri-b').forEach(function(b){b.classList.remove('on');});
  el.classList.add('on');
  var group=document.getElementById(gid);
  if(group)group.dataset.value=val;
}

function sfToggle(){
  var tog=document.getElementById('sf-tog');
  var chk=document.getElementById('sa-sub');
  if(!tog||!chk)return;
  tog.classList.toggle('on');
  chk.checked=tog.classList.contains('on');
}

function saveSA(editId){
  const t=document.getElementById('sa-t')?.value?.trim();
  if(!t){toast('Title required','err');return;}
  const desc=document.getElementById('sa-d')?.value?.trim()||'';
  const proj=document.getElementById('sa-proj')?.value||null;
  const h=parseFloat(document.getElementById('sa-h')?.value)||1;
  const dl=document.getElementById('sa-dl')?.value||'';
  const sub=document.getElementById('sa-sub')?.checked||false;
  const pri=Schema.normPriority(document.getElementById('sa-pri')?.dataset.value||'medium');
  const dueAt=dl?new Date(dl).toISOString():new Date(Date.now()+3*86400000).toISOString();
  const projObj=proj?PROJECTS.find(x=>x.name===proj):null;

  if(editId){
    DataAPI.updateDeliverable(editId,{
      title:t,description:desc,priority:pri,
      estimateSecs:Schema.TIME.hoursToSecs(h),dueAt:dueAt,
      projectId:projObj?projObj.id:undefined
    }).then(function(){
      if(sub)return DataAPI.submitDeliverable(editId,{notes:desc});
    }).then(function(){
      syncUserState();cMod();rAll();
      toast('Task updated \u2713','ok');
      if(cv==='proj-detail'&&projObj){const p=PROJECTS.find(x=>x.id===projObj.id);if(p)rProjDetail(p);}
    }).catch(function(err){toast(err.message||'Could not save','err');});
    return;
  }

  if(!projObj){toast('Pick a project for this task','err');return;}

  DataAPI.createDeliverable({
    projectId:projObj.id,
    milestoneId:(projObj.milestones||[]).find(m=>m.status==='In Progress')?.id||
                (projObj.milestones||[])[0]?.id||null,
    title:t,description:desc,priority:pri,
    status:'TODO',origin:'SELF',
    assigneeIds:[CU.id],createdById:CU.id,
    dueAt:dueAt,
    estimateSecs:Schema.TIME.hoursToSecs(h)
  }).then(function(created){
    if(sub)return DataAPI.submitDeliverable(created.id,{notes:desc||t});
  }).then(function(){
    syncUserState();cMod();rAll();
    toast(sub?'Task created & submitted \uD83D\uDCE4':'Self task created \u2713','ok');
    if(cv==='proj-detail'){const p=PROJECTS.find(x=>x.id===projObj.id);if(p)rProjDetail(p);}
  }).catch(function(err){toast(err.message||'Could not create task','err');});
}

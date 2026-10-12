// // ══════════════════════════════════════════════
// // DASHBOARD
// // ══════════════════════════════════════════════

// function rAll(){
//   rDash();rProj();rTracker();updBadges();updWP();updAtt();
//   /* Leave badge — pending requests ka count sidebar pe */
//   if(CU&&typeof HRM!=='undefined'){
//     HRM.getLeaveRequests({employeeId:CU.id}).then(updLeaveBadge).catch(function(){});
//   }
// }

// function rDash(){
//   var el=document.getElementById('dash');if(!el)return;
//   var d=new Date(),hr=d.getHours();
//   var greet=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
//   var name=CU?CU.name.split(' ')[0]:'';
//   var pend=TASKS.filter(function(t){return t.status==='todo'||t.status==='inprogress';}).length;
//   var appr=TASKS.filter(function(t){return t.status==='approved';}).length;
//   var rej=TASKS.filter(function(t){return t.status==='rejected';}).length;
//   var act=TASKS.find(function(t){return t.active;})||(typeof SUBTASKS!=='undefined'?(SUBTASKS||[]).find(function(t){return t.active;}):null);
//   var score=TASKS.length?Math.round(appr/TASKS.length*100):0;
//   var html='';

//   // Start work banner
//   if(!ws){
//     html+='<div style="background:var(--t1);border-radius:var(--r4);padding:20px;margin-bottom:16px;color:#fff">';
//     html+='<div style="font-size:20px;font-weight:700;letter-spacing:-.5px;margin-bottom:4px">'+greet+', '+name+' 👋</div>';
//     html+='<div style="font-size:13px;opacity:.55;margin-bottom:'+(rej?'10px':'14px')+'">'+pend+' deliverables waiting · '+appr+' completed</div>';
//     if(rej)html+='<div style="display:inline-flex;align-items:center;gap:5px;background:rgba(220,38,38,.2);color:#FCA5A5;padding:4px 10px;border-radius:99px;font-size:12px;font-weight:600;margin-bottom:12px">⚠ '+rej+' rejected · resubmission needed</div><br>';
//     html+='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:4px">';
//     html+='<button class="btn" style="background:rgba(255,255,255,.12);color:#fff;border-color:transparent;height:38px" onclick="startWork()"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>Start work</button>';
//     html+='<span style="font-size:11.5px;opacity:.45">or click any task below</span></div></div>';
//   }

//   // Stats
//   html+='<div class="sbar">';
//   html+='<div class="scard"><div class="sl">Total tasks</div><div class="sv">'+TASKS.filter(function(t){return!t.self;}).length+'</div><div class="ss">'+pend+' pending</div></div>';
//   html+='<div class="scard"><div class="sl">Approved</div><div class="sv" style="color:var(--green)">'+appr+'</div><div class="ss">so far</div></div>';
//   html+='<div class="scard" style="cursor:pointer" onclick="nav(\'attendance\',document.querySelector(\'[data-v=attendance]\'))"><div class="sl">Today’s time</div><div class="sv" style="font-size:17px;color:'+(trun?'var(--green)':ws?'var(--amber)':'var(--t1)')+'" id="stat-time">'+fmtSh(tsecs)+'</div><div class="ss">'+(trun?'\u25CF Running':ws?'Paused':'Not started')+'</div></div>';
//   var _mv=(typeof Wallet!=='undefined'&&Wallet.moneyVisibleToEmployees());
//   if(_mv)  html+='<div class="scard" style="cursor:pointer" onclick="nav(\'wallet\',document.querySelector(\'[data-v=wallet]\'))"><div class="sl">Wallet</div><div class="sv" style="color:var(--green);font-size:17px" id="stat-wallet">\u2014</div><div class="ss" id="stat-wallet-s">is mahine</div></div>';
//   html+='</div>';
//   if(_mv&&CU){
//     Wallet.getWallet(CU.id).then(function(w){
//       var v=document.getElementById('stat-wallet'),sub=document.getElementById('stat-wallet-s');
//       if(v)v.textContent=_rup(w.balancePaise);
//       if(sub)sub.textContent=(w.thisMonthPaise?_rup(w.thisMonthPaise)+' this month':'balance')+(w.openDisputes?' \u00b7 '+w.openDisputes+' dispute':'');
//     }).catch(function(){});
//   }

//   // Focus card
//   var queue=typeof focusOrder==='function'?focusOrder():TASKS.filter(function(t){return t.status!=='approved';});
//   var pendingReview=TASKS.filter(function(t){return t.status==='submitted';}).length;
//   var selfPending=TASKS.filter(function(t){return t.self&&t.saStatus==='pending';}).length;
//   var overdue=TASKS.filter(function(t){return t.status!=='approved'&&t.dms&&t.dms<Date.now();}).length;
//   var rejected=TASKS.filter(function(t){return t.status==='rejected';}).length;
//   if(!act||!ws){
//     var next=queue.find(function(t){return !t.blocked&&(!t.isPiece||!t.agreement||t.agreement.state==='AGREED');})||queue[0];
//     html+='<div class="card" style="margin-bottom:14px">';
//     html+='<div style="width:40px;height:40px;border-radius:var(--r3);background:var(--s2);display:flex;align-items:center;justify-content:center;margin-bottom:10px"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>';
//     html+='<div style="font-size:14px;font-weight:700;margin-bottom:3px">'+(ws?'No task is running':'You haven’t started work yet')+'</div>';
//     html+='<div style="font-size:13px;color:var(--t3);margin-bottom:12px;line-height:1.6">'+(ws?'Pick a task below \u2014 the timer starts automatically':'Click "Start work" above, or click any task directly')+'</div>';
//     if(next){
//       var u2=urg(next.dms);
//       html+='<div style="background:var(--s2);border-radius:var(--r3);padding:12px;cursor:pointer;border:1px solid var(--b)" onclick="'+(ws?'activateTask('+next.id+')':'startWork()')+'" onmouseover="this.style.background=\'var(--s3)\'" onmouseout="this.style.background=\'var(--s2)\'">';
//       var nh=typeof focusHint==='function'?focusHint(next):null;
//       html+='<div style="font-size:10.5px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">#1 \u2014 Do this next</div>';
//       html+='<div style="font-size:13px;font-weight:600;margin-bottom:5px">'+esc(next.title)+(next.isPiece&&_mv?' <span class="wl-chip">'+_rup(next.myPricePaise)+'</span>':'')+'</div>';
//       html+='<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">'+pb(next.priority)+'<span class="'+u2.cls+'">'+u2.s+'</span><span style="font-size:11.5px;color:var(--t3)">'+esc(next.proj||'')+'</span></div>';
//       if(nh)html+='<div style="font-size:11.5px;color:'+nh[1]+';font-weight:600;margin-top:5px">'+esc(nh[0])+'</div>';
//       if(ws)html+='<button class="btn btn-solid btn-sm" style="margin-top:10px">Start this task \u2192</button>';
//       html+='</div>';
//     }
//     html+='</div>';
//   } else {
//     var u=urg(act.dms),exp=act.exp||3600,diff=tsecs-exp;
//     html+='<div class="fc">';
//     html+='<div class="fc-ey"><div class="fc-pd '+(trun?'':onBrk?'b':'p')+'"></div>'+(onBrk?'ON BREAK':trun?'ACTIVE TASK':'PAUSED')+'</div>';
//     html+='<div class="fc-t">'+act.title+'</div>';
//     html+='<div class="fc-d">'+esc(employeePlainText(act.desc)||'No description added.')+'</div>';
//     html+='<div class="fc-chips">';
//     if(act.proj)html+='<span class="fc-chip">📁 '+act.proj+'</span>';
//     if(act.ms)html+='<span class="fc-chip">🎯 '+act.ms+'</span>';
//     if(act.self)html+='<span class="fc-chip">✍ Self-assigned</span>';
//     html+='</div>';
//     var u=urg(act.dms);
//     html+='<div class="fc-dl"><span style="font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:99px;background:'+(u.cls==='u-urg'?'rgba(220,38,38,.15)':u.cls==='u-wrn'?'rgba(217,119,6,.15)':'rgba(5,150,105,.15)')+';color:'+(u.cls==='u-urg'?'#FCA5A5':u.cls==='u-wrn'?'#FCD34D':'#6EE7B7')+'">'+u.s+'</span></div>';
//     html+='<div class="fc-timer" id="fc-timer">'+fmtMono(tsecs)+'</div>';
//     html+='<div style="font-size:11px;color:rgba(255,255,255,.45);margin-bottom:6px">Expected vs actual \u2014 green means time saved, red means over</div>';
//     html+='<div class="fc-compare" id="fc-ctx">';
//     var ov=diff>60,un=diff<-60;
//     html+='<div class="fc-cc"><div class="fc-cc-l">Expected</div><div class="fc-cc-v">'+fmtSh(exp)+'</div></div>';
//     html+='<div class="fc-sep"></div>';
//     html+='<div class="fc-cc"><div class="fc-cc-l">Actual</div><div class="fc-cc-v '+(ov?'ov':un?'un':'')+'">'+fmtSh(tsecs)+'</div></div>';
//     html+='<div class="fc-sep"></div>';
//     html+='<div class="fc-cc"><div class="fc-cc-l">'+(ov?'Over':un?'Saved':'Status')+'</div><div class="fc-cc-v '+(ov?'ov':un?'un':'')+'">'+
//       (Math.abs(diff)<60?'✓':(ov?'+':'-')+fmtSh(Math.abs(diff)))+'</div></div>';
//     html+='</div>';
//     html+='<div class="fc-acts">';
//     html+='<button class="fcb fcb-w" onclick="toggleT()"><svg viewBox="0 0 24 24">'+(trun?'<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>':'<polygon points="5 3 19 12 5 21 5 3"/>')+'</svg>'+(trun?'Pause':'Resume')+'</button>';
//     html+='<button class="fcb fcb-s" onclick="openDetail('+act.id+')">View Details</button>';
//     html+='<button class="fcb fcb-g" onclick="openDetail('+act.id+')"><svg viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>Submit</button>';
//     html+='</div></div>';
//   }

//   var todayList=queue.slice(0,7);
//   var inReview=TASKS.filter(function(t){return t.status==='submitted';}).length;
//   html+='<div class="dash-workgrid"><div class="dash-queue">';
//   html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:9px"><span style="font-size:13px;font-weight:700">Focus queue <span style="font-size:11px;color:var(--t3);font-weight:500">\u00b7 work in this order</span></span><button class="btn btn-ghost btn-sm" onclick="nav(\'tracker\',document.querySelector(\'[data-v=tracker]\'))">See all \u2192</button></div>';
//   if(todayList.length){
//     todayList.forEach(function(t,i){
//       var u=urg(t.dms),fh=typeof focusHint==='function'?focusHint(t):null;
//       html+='<div class="tr '+(t.active?'arow ':'')+' '+(t.status==='rejected'?'rrow ':'')+'" onclick="openDetail('+t.id+')">';
//       html+='<div class="fq-n">'+(i+1)+'</div>';
//       html+='<div class="tr-info"><div class="tr-t">'+esc(t.title)+(t.isPiece&&_mv?'<span class="wl-chip">'+_rup(t.myPricePaise)+'</span>':'')+(t.self?'<span class="badge b-self" style="font-size:10px">Self</span>':'')+(t.active?'<span style="font-size:10px;color:var(--blue);font-weight:600">\u25CF Active</span>':'')+'</div>';
//       html+='<div class="tr-m">'+pb(t.priority)+'<span class="'+u.cls+'">'+u.s+'</span>'+(t.proj?'<span style="font-size:11.5px;color:var(--t3)">'+esc(t.proj)+'</span>':'')+'</div>';
//       if(fh)html+='<div style="font-size:12px;color:'+fh[1]+';margin-top:3px;font-weight:500">'+esc(fh[0])+'</div>';
//       html+='</div>'+sb(t.status)+'</div>';
//     });
//     if(inReview)html+='<div style="font-size:12px;color:var(--t3);padding:6px 4px">+ '+inReview+' task(s) in review \u2014 that wait doesn’t count against your time</div>';
//   } else {
//     html+='<div style="text-align:center;padding:28px;color:var(--t3);background:var(--sur);border:1px solid var(--b);border-radius:var(--r4)"><div style="font-size:28px;margin-bottom:6px">🎉</div><div style="font-weight:600">All work done!</div><div style="font-size:12px;margin-top:4px">No pending work right now.</div></div>';
//   }
//   html+='</div>';
//   html+='<aside class="dash-summary card">'+
//     '<div style="font-size:13px;font-weight:700;margin-bottom:3px">Work overview</div>'+
//     '<div style="font-size:11.5px;color:var(--t3);margin-bottom:13px">A quick view of what needs attention.</div>'+
//     '<div class="dash-stat"><span>Pending tasks</span><b>'+pend+'</b></div>'+
//     '<div class="dash-stat"><span>Awaiting review</span><b style="color:var(--purple)">'+pendingReview+'</b></div>'+
//     '<div class="dash-stat"><span>Self tasks</span><b style="color:var(--purple)">'+selfPending+'</b></div>'+
//     '<div class="dash-stat"><span>Overdue</span><b style="color:var(--red)">'+overdue+'</b></div>'+
//     '<div class="dash-stat"><span>Sent back</span><b style="color:var(--red)">'+rejected+'</b></div>'+
//     '<button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;margin-top:10px" onclick="nav(\'tracker\',document.querySelector(\'[data-v=tracker]\'))">Open Task Tracker →</button>'+
//   '</aside></div>';

//   el.innerHTML=html;
// }


// ══════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════

function rAll(){
  rDash();rProj();rTracker();updBadges();updWP();updAtt();
  /* Leave badge — pending requests ka count sidebar pe */
  if(CU&&typeof HRM!=='undefined'){
    HRM.getLeaveRequests({employeeId:CU.id}).then(updLeaveBadge).catch(function(){});
  }
}

function rDash(){
  var el=document.getElementById('dash');if(!el)return;
  var d=new Date(),hr=d.getHours();
  var greet=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
  var name=CU?CU.name.split(' ')[0]:'';
  var pend=TASKS.filter(function(t){return t.status==='todo'||t.status==='inprogress';}).length;
  var appr=TASKS.filter(function(t){return t.status==='approved';}).length;
  var rej=TASKS.filter(function(t){return t.status==='rejected';}).length;
  var act=TASKS.find(function(t){return t.active;})||(typeof SUBTASKS!=='undefined'?(SUBTASKS||[]).find(function(t){return t.active;}):null);
  var score=TASKS.length?Math.round(appr/TASKS.length*100):0;
  var html='';

  // Start work banner
  if(!ws){
    html+='<div style="background:var(--t1);border-radius:var(--r4);padding:20px;margin-bottom:16px;color:#fff">';
    html+='<div style="font-size:20px;font-weight:700;letter-spacing:-.5px;margin-bottom:4px">'+greet+', '+name+' 👋</div>';
    html+='<div style="font-size:13px;opacity:.55;margin-bottom:'+(rej?'10px':'14px')+'">'+pend+' deliverables waiting · '+appr+' completed</div>';
    if(rej)html+='<div style="display:inline-flex;align-items:center;gap:5px;background:rgba(220,38,38,.2);color:#FCA5A5;padding:4px 10px;border-radius:99px;font-size:12px;font-weight:600;margin-bottom:12px">⚠ '+rej+' rejected · resubmission needed</div><br>';
    html+='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:4px">';
    html+='<button class="btn" style="background:rgba(255,255,255,.12);color:#fff;border-color:transparent;height:38px" onclick="startWork()"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>Start work</button>';
    html+='<span style="font-size:11.5px;opacity:.45">or click any task below</span></div></div>';
  }

  // Stats
  html+='<div class="sbar">';
  html+='<div class="scard"><div class="sl">Total tasks</div><div class="sv">'+TASKS.filter(function(t){return!t.self;}).length+'</div><div class="ss">'+pend+' pending</div></div>';
  html+='<div class="scard"><div class="sl">Approved</div><div class="sv" style="color:var(--green)">'+appr+'</div><div class="ss">so far</div></div>';
  html+='<div class="scard" style="cursor:pointer" onclick="nav(\'attendance\',document.querySelector(\'[data-v=attendance]\'))"><div class="sl">Today’s time</div><div class="sv" style="font-size:17px;color:'+(trun?'var(--green)':ws?'var(--amber)':'var(--t1)')+'" id="stat-time">'+fmtSh(tsecs)+'</div><div class="ss">'+(trun?'\u25CF Running':ws?'Paused':'Not started')+'</div></div>';
  var _mv=(typeof Wallet!=='undefined'&&Wallet.moneyVisibleToEmployees());
  if(_mv)  html+='<div class="scard" style="cursor:pointer" onclick="nav(\'wallet\',document.querySelector(\'[data-v=wallet]\'))"><div class="sl">Wallet</div><div class="sv" style="color:var(--green);font-size:17px" id="stat-wallet">\u2014</div><div class="ss" id="stat-wallet-s">is mahine</div></div>';
  html+='</div>';
  if(_mv&&CU){
    Wallet.getWallet(CU.id).then(function(w){
      var v=document.getElementById('stat-wallet'),sub=document.getElementById('stat-wallet-s');
      if(v)v.textContent=_rup(w.balancePaise);
      if(sub)sub.textContent=(w.thisMonthPaise?_rup(w.thisMonthPaise)+' this month':'balance')+(w.openDisputes?' \u00b7 '+w.openDisputes+' dispute':'');
    }).catch(function(){});
  }

  // Focus card
  var queue=typeof focusOrder==='function'?focusOrder():TASKS.filter(function(t){return t.status!=='approved';});
  var pendingReview=TASKS.filter(function(t){return t.status==='submitted';}).length;
  var selfPending=TASKS.filter(function(t){return t.self&&t.saStatus==='pending';}).length;
  var overdue=TASKS.filter(function(t){return t.status!=='approved'&&t.dms&&t.dms<Date.now();}).length;
  var rejected=TASKS.filter(function(t){return t.status==='rejected';}).length;
  if(!act||!ws){
    var next=queue.find(function(t){return !t.blocked&&(!t.isPiece||!t.agreement||t.agreement.state==='AGREED');})||queue[0];
    html+='<div class="card" style="margin-bottom:14px">';
    html+='<div style="width:40px;height:40px;border-radius:var(--r3);background:var(--s2);display:flex;align-items:center;justify-content:center;margin-bottom:10px"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>';
    html+='<div style="font-size:14px;font-weight:700;margin-bottom:3px">'+(ws?'No task is running':'You haven’t started work yet')+'</div>';
    html+='<div style="font-size:13px;color:var(--t3);margin-bottom:12px;line-height:1.6">'+(ws?'Pick a task below \u2014 the timer starts automatically':'Click "Start work" above, or click any task directly')+'</div>';
    if(next){
      var u2=urg(next.dms);
      html+='<div style="background:var(--s2);border-radius:var(--r3);padding:12px;cursor:pointer;border:1px solid var(--b)" onclick="'+(ws?'activateTask('+next.id+')':'startWork()')+'" onmouseover="this.style.background=\'var(--s3)\'" onmouseout="this.style.background=\'var(--s2)\'">';
      var nh=typeof focusHint==='function'?focusHint(next):null;
      html+='<div style="font-size:10.5px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">#1 \u2014 Do this next</div>';
      html+='<div style="font-size:13px;font-weight:600;margin-bottom:5px">'+esc(next.title)+(next.isPiece&&_mv?' <span class="wl-chip">'+_rup(next.myPricePaise)+'</span>':'')+'</div>';
      html+='<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">'+pb(next.priority)+'<span class="'+u2.cls+'">'+u2.s+'</span><span style="font-size:11.5px;color:var(--t3)">'+esc(next.proj||'')+'</span></div>';
      if(nh)html+='<div style="font-size:11.5px;color:'+nh[1]+';font-weight:600;margin-top:5px">'+esc(nh[0])+'</div>';
      if(ws)html+='<button class="btn btn-solid btn-sm" style="margin-top:10px">Start this task \u2192</button>';
      html+='</div>';
    }
    html+='</div>';
  } else {
    var u=urg(act.dms),exp=act.exp||3600,diff=tsecs-exp;
    /* Active task card: what you are on, the clock, and how much of the
       expected time is used (the bar turns red when you go over). */
    var stLbl=onBrk?'On break':trun?'Running':'Paused', stCls=onBrk?'brk':trun?'run':'pause';
    var where=[act.proj,act.ms].filter(Boolean).map(function(x){return esc(x);}).join(' / ');
    html+='<div class="atc'+(diff>60?' over':'')+'" id="atc">';
    html+='<div class="atc-top"><div class="atc-head">';
    html+='<div class="atc-status '+stCls+'"><span class="atc-dot"></span>'+stLbl+(where?'<span class="atc-where">'+where+'</span>':'')+(act.self?'<span class="atc-tag">Self-assigned</span>':'')+'</div>';
    html+='<div class="atc-title">'+esc(act.title)+'<span class="atc-due '+u.cls+'">'+u.s+'</span></div>';
    var dsc=employeePlainText(act.desc);
    if(dsc)html+='<div class="atc-desc">'+esc(dsc)+'</div>';
    html+='</div><div class="atc-acts">';
    html+='<button class="atc-btn" onclick="toggleT()">'+(trun?'⏸ Pause':'▶ Resume')+'</button>';
    html+='<button class="atc-btn" onclick="openDetail('+act.id+')">Details</button>';
    html+='<button class="atc-btn primary" onclick="openDetail('+act.id+')">✓ Submit</button>';
    html+='</div></div>';
    html+='<div class="atc-time"><div class="fc-timer" id="fc-timer">'+fmtMono(tsecs)+'</div>';
    html+='<div class="fc-compare" id="fc-ctx">'+atcCompare(exp,tsecs)+'</div></div>';
    html+=atcBar(exp,tsecs);
    html+='</div>';
  }

  var todayList=queue.slice(0,7);
  var inReview=TASKS.filter(function(t){return t.status==='submitted';}).length;
  html+='<div class="dash-workgrid"><div class="dash-queue">';
  html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:9px"><span style="font-size:13px;font-weight:700">Focus queue <span style="font-size:11px;color:var(--t3);font-weight:500">\u00b7 work in this order</span></span><button class="btn btn-ghost btn-sm" onclick="nav(\'tracker\',document.querySelector(\'[data-v=tracker]\'))">See all \u2192</button></div>';
  if(todayList.length){
    todayList.forEach(function(t,i){
      var u=urg(t.dms),fh=typeof focusHint==='function'?focusHint(t):null;
      html+='<div class="tr '+(t.active?'arow ':'')+' '+(t.status==='rejected'?'rrow ':'')+'" onclick="openDetail('+t.id+')">';
      html+='<div class="fq-n">'+(i+1)+'</div>';
      html+='<div class="tr-info"><div class="tr-t">'+esc(t.title)+(t.isPiece&&_mv?'<span class="wl-chip">'+_rup(t.myPricePaise)+'</span>':'')+(t.self?'<span class="badge b-self" style="font-size:10px">Self</span>':'')+(t.active?'<span style="font-size:10px;color:var(--blue);font-weight:600">\u25CF Active</span>':'')+'</div>';
      html+='<div class="tr-m">'+pb(t.priority)+'<span class="'+u.cls+'">'+u.s+'</span>'+(t.proj?'<span style="font-size:11.5px;color:var(--t3)">'+esc(t.proj)+'</span>':'')+'</div>';
      if(fh)html+='<div style="font-size:12px;color:'+fh[1]+';margin-top:3px;font-weight:500">'+esc(fh[0])+'</div>';
      html+='</div>'+sb(t.status)+'</div>';
    });
    if(inReview)html+='<div style="font-size:12px;color:var(--t3);padding:6px 4px">+ '+inReview+' task(s) in review \u2014 that wait doesn’t count against your time</div>';
  } else {
    html+='<div style="text-align:center;padding:28px;color:var(--t3);background:var(--sur);border:1px solid var(--b);border-radius:var(--r4)"><div style="font-size:28px;margin-bottom:6px">🎉</div><div style="font-weight:600">All work done!</div><div style="font-size:12px;margin-top:4px">No pending work right now.</div></div>';
  }
  html+='</div>';
  html+='<aside class="dash-summary card">'+
    '<div style="font-size:13px;font-weight:700;margin-bottom:3px">Work overview</div>'+
    '<div style="font-size:11.5px;color:var(--t3);margin-bottom:13px">A quick view of what needs attention.</div>'+
    '<div class="dash-stat"><span>Pending tasks</span><b>'+pend+'</b></div>'+
    '<div class="dash-stat"><span>Awaiting review</span><b style="color:var(--purple)">'+pendingReview+'</b></div>'+
    '<div class="dash-stat"><span>Self tasks</span><b style="color:var(--purple)">'+selfPending+'</b></div>'+
    '<div class="dash-stat"><span>Overdue</span><b style="color:var(--red)">'+overdue+'</b></div>'+
    '<div class="dash-stat"><span>Sent back</span><b style="color:var(--red)">'+rejected+'</b></div>'+
    '<button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;margin-top:10px" onclick="nav(\'tracker\',document.querySelector(\'[data-v=tracker]\'))">Open Task Tracker →</button>'+
  '</aside></div>';

  el.innerHTML=html;
}


/* Expected / Actual / Time left (or Over) — also refreshed every second by sync.js */
function atcCompare(exp,secs){
  var diff=secs-exp, over=diff>60;
  return '<div class="fc-cc"><div class="fc-cc-l">Expected</div><div class="fc-cc-v">'+fmtSh(exp)+'</div></div>'+
    '<div class="fc-cc"><div class="fc-cc-l">Worked</div><div class="fc-cc-v">'+fmtSh(secs)+'</div></div>'+
    '<div class="fc-cc"><div class="fc-cc-l">'+(over?'Over by':'Time left')+'</div><div class="fc-cc-v '+(over?'ov':'un')+'">'+fmtSh(Math.abs(diff))+'</div></div>';
}
function atcBar(exp,secs){
  var pct=exp>0?Math.round(secs/exp*100):0;
  return '<div class="atc-bar"><div id="fc-bar" style="width:'+Math.min(100,pct)+'%"></div></div>'+
    '<div class="atc-hint" id="fc-hint">'+pct+'% of the expected time used'+(pct>100?' — you are over the estimate':'')+'</div>';
}
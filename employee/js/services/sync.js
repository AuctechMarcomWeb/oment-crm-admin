// // ══════════════════════════════════════════════
// // WORK SESSION + TIMER + BREAK
// // ══════════════════════════════════════════════

// function startWork(){
//   ws=true;wsAt=Date.now();
//   var next=TASKS.find(function(t){return t.status==='todo';});
//   if(next)activateTask(next.id,true);
//   document.getElementById('brk-btn').style.display='flex';
//   rAll();toast('Work session started 💪','ok');
// }

// function endWork(){
//   ws=false;stopT();
//   TASKS.forEach(function(t){t.active=false;}); SUBTASKS.forEach(function(t){t.active=false;});
//   var bb=document.getElementById('brk-btn');if(bb)bb.style.display='none';
//   syncUserState();
//   updWP();rAll();toast('Session ended. Good work!');
// }

// function startT(task){
//   SW.reset();
//   SW.start(task.logged||0);
//   trun=true;clearInterval(tiv);
//   if(CU){
//     var parentId=task.isSubtask?task.deliverableId:task.id;
//     DataAPI.startTimer(CU.id,parentId,task.isSubtask?task.id:null).catch(function(err){ toast(err.message||'Could not start timer','err'); });
//   }
//   tiv=setInterval(function(){
//     if(!trun||onBrk)return;
//     tsecs=SW.elapsedSecs();
//     task.logged=tsecs;
//     rTmr();
//   },1000);
// }

// function stopT(){
//   if(trun){SW.pause();tsecs=SW.elapsedSecs();}
//   trun=false;clearInterval(tiv);
//   if(CU)DataAPI.stopTimer(CU.id);
// }

// function toggleT(){
//   var a=(TASKS.concat(SUBTASKS)).find(function(t){return t.active;});if(!a)return;
//   trun=!trun;
//   if(trun){SW.start();if(CU)DataAPI.startTimer(CU.id,a.isSubtask?a.deliverableId:a.id,a.isSubtask?a.id:null);}
//   else{SW.pause();tsecs=SW.elapsedSecs();if(CU)DataAPI.stopTimer(CU.id);}
//   a.tl.push({type:trun?'resume':'pause',text:trun?'Timer resumed':'Timer paused',time:'Now'});
//   updWP();rTmr();rDash();
// }

// function rTmr(){
//   var ft=document.getElementById('fc-timer');if(ft)ft.textContent=fmtMono(tsecs);
//   var dt=document.getElementById('det-timer');if(dt)dt.textContent=fmtMono(tsecs);
//   var st=document.getElementById('stat-time');if(st)st.textContent=fmtSh(tsecs);
//   updWP();
//   var a=(TASKS.concat(SUBTASKS)).find(function(t){return t.active;});
//   if(a&&a.isPiece&&typeof wlPriceCard==='function'&&tsecs%15===0){
//     var pw=document.getElementById('wl-price-wrap');if(pw)pw.innerHTML=wlPriceCard(a,tsecs);
//   }
//   if(a){
//     var exp=(a.exp||3600);var diff=tsecs-exp;
//     var ctx=document.getElementById('fc-ctx');
//     if(ctx){
//       var ov=diff>60,un=diff<-60;
//       ctx.innerHTML='<div class="fc-cc"><div class="fc-cc-l">Expected</div><div class="fc-cc-v">'+fmtSh(exp)+'</div></div>'+
//         '<div class="fc-sep"></div>'+
//         '<div class="fc-cc"><div class="fc-cc-l">Actual</div><div class="fc-cc-v '+(ov?'ov':un?'un':'')+'">'+fmtSh(tsecs)+'</div></div>'+
//         '<div class="fc-sep"></div>'+
//         '<div class="fc-cc"><div class="fc-cc-l">'+(ov?'Over':un?'Saved':'Status')+'</div><div class="fc-cc-v '+(ov?'ov':un?'un':'')+'">'+
//         (Math.abs(diff)<60?'✓':(ov?'+':'-')+fmtSh(Math.abs(diff)))+'</div></div>';
//     }
//   }
// }

// function updWP(){
//   var dot=document.getElementById('wp-dot'),lbl=document.getElementById('wp-lbl'),tm=document.getElementById('wp-tm');
//   if(!dot||!lbl)return;
//   if(onBrk){dot.className='wp-dot brk';lbl.textContent='On Break · '+(brkType||'');if(tm&&brkAt)tm.textContent=fmtMono(Math.floor((Date.now()-brkAt)/1000));}
//   else if(ws&&trun){dot.className='wp-dot working';lbl.textContent='Working';if(tm)tm.textContent=fmtMono(tsecs);}
//   else if(ws){dot.className='wp-dot paused';lbl.textContent='Paused';if(tm)tm.textContent=fmtMono(tsecs);}
//   else{dot.className='wp-dot idle';lbl.textContent='Not started';if(tm)tm.textContent='';}
// }

// function activateTask(id,silent){
//   var task=findWorkItem(id);if(!task)return;

//   if(task.isSubtask && task.adminStatus==='pending'){toast('Waiting for Admin approval before you can start this task','err');return;}
//   if(task.isSubtask && task.adminStatus==='rejected'){toast('This task was sent back. Resubmit it for Admin approval before starting again.','err');return;}
//   if(!task.isSubtask && task.status==='approved'){toast('This task is already approved','err');return;}
//   if(task.status==='submitted'){toast("Awaiting review — you can't restart it",'err');return;}

//   /* Clicking Start on the task that is already active must never open the
//      switch dialog. It is the same task, so Start becomes Pause/Resume. */
//   if(task.active){
//     toggleT();
//     if(!silent){rAll();toast(trun?'Task resumed':'Task paused','ok');}
//     else{updWP();rDash();updBadges();}
//     return;
//   }

//   /* Only another task can trigger a task-switch confirmation. */
//   var current=(TASKS.concat(SUBTASKS)).find(function(t){return t.active;});
//   if(current && current.id!==id){
//     sDlg('Switch Task?','Your timer is saved. Switch to new task?',function(){activateTask(id,silent);});
//     return;
//   }

//   if(typeof Wallet!=='undefined'&&CU){
//     var chk=Wallet.canStart(CU.id,task.isSubtask?task.deliverableId:id);
//     if(!chk.ok){toast(chk.reason,'err');if(!silent){openDetail(id);}return;}
//   }

//   TASKS.forEach(function(t){t.active=false;}); SUBTASKS.forEach(function(t){t.active=false;});
//   task.active=true;
//   if(task.status==='todo'){
//     task.status='inprogress';
//     task.tl.push({type:'start',text:'Started',time:'Now'});
//   }
//   if(!ws){ws=true;wsAt=Date.now();var bb=document.getElementById('brk-btn');if(bb)bb.style.display='flex';}
//   stopT();startT(task);
//   var att=todayAtt();if(att.tasks.indexOf(id)<0)att.tasks.push(id);
//   if(!silent){rAll();toast('Started: "'+esc(task.title.slice(0,32))+'…"','ok');}
//   else{updWP();rDash();updBadges();}
// }

// function confirmSwitch(id){
//   var task=findWorkItem(id);
//   if(task && task.active){
//     toggleT();
//     rAll();
//     toast(trun?'Task resumed':'Task paused','ok');
//     return;
//   }
//   var cur=(TASKS.concat(SUBTASKS)).find(function(t){return t.active;});
//   if(!cur){activateTask(id);return;}
//   sDlg('Switch Task?','Your timer is saved. Switch to new task?',function(){activateTask(id);});
// }

// // ── BREAK ──
// function oBrk(){
//   if(onBrk){endBrk();return;}
//   oMod('Take a Break',
//     '<div class="fg"><label class="fl">Break Type</label>'+
//     '<div class="ptog" id="bp"><button class="popt on" onclick="setPT(this,\'bp\');_bType=\'Lunch\'">🍱 Lunch</button>'+
//     '<button class="popt" onclick="setPT(this,\'bp\');_bType=\'Tea\'">☕ Tea</button>'+
//     '<button class="popt" onclick="setPT(this,\'bp\');_bType=\'Personal\'">🏃 Personal</button>'+
//     '<button class="popt" onclick="setPT(this,\'bp\');_bType=\'Other\'">⏸ Other</button></div></div>',
//   [{l:'Cancel',cls:'btn-ghost',a:cMod},{l:'Start Break',cls:'btn-solid',a:startBrk}]);
// }

// function startBrk(){
//   onBrk=true;brkAt=Date.now();brkType=_bType;
//   var a=(TASKS.concat(SUBTASKS)).find(function(t){return t.active;});if(a&&trun)stopT();
//   updWP();rAll();toast('Break started: '+brkType);cMod();
// }

// function endBrk(){
//   if(!onBrk)return;
//   var startedAt=new Date(brkAt).toISOString();
//   var endedAt=new Date().toISOString();
//   var secs=Math.round((Date.now()-brkAt)/1000);
//   if(CU){
//     DataAPI.addBreak(CU.id,{type:brkType,startAt:startedAt,endAt:endedAt,secs:secs})
//       .then(function(){syncUserState();}).catch(function(){});
//   }
//   onBrk=false;brkAt=null;brkType=null;
//   var a=(TASKS.concat(SUBTASKS)).find(function(t){return t.active;});if(a&&ws)startT(a);
//   updWP();rAll();toast('Break ended. Back to work! 💪');
// }



// ══════════════════════════════════════════════
// WORK SESSION + TIMER + BREAK
// ══════════════════════════════════════════════

function startWork(){
  ws=true;wsAt=Date.now();
  var next=TASKS.find(function(t){return t.status==='todo';});
  if(next)activateTask(next.id,true);
  document.getElementById('brk-btn').style.display='flex';
  rAll();toast('Work session started 💪','ok');
}

function endWork(){
  ws=false;stopT();
  TASKS.forEach(function(t){t.active=false;}); SUBTASKS.forEach(function(t){t.active=false;});
  var bb=document.getElementById('brk-btn');if(bb)bb.style.display='none';
  syncUserState();
  updWP();rAll();toast('Session ended. Good work!');
}

function startT(task){
  SW.reset();
  SW.start(task.logged||0);
  trun=true;clearInterval(tiv);
  if(CU){
    var parentId=task.isSubtask?task.deliverableId:task.id;
    DataAPI.startTimer(CU.id,parentId,task.isSubtask?task.id:null).catch(function(err){ toast(err.message||'Could not start timer','err'); });
  }
  tiv=setInterval(function(){
    if(!trun||onBrk)return;
    tsecs=SW.elapsedSecs();
    task.logged=tsecs;
    rTmr();
  },1000);
}

function stopT(){
  if(trun){SW.pause();tsecs=SW.elapsedSecs();}
  trun=false;clearInterval(tiv);
  if(CU)DataAPI.stopTimer(CU.id);
}

function toggleT(){
  var a=(TASKS.concat(SUBTASKS)).find(function(t){return t.active;});if(!a)return;
  trun=!trun;
  if(trun){SW.start();if(CU)DataAPI.startTimer(CU.id,a.isSubtask?a.deliverableId:a.id,a.isSubtask?a.id:null);}
  else{SW.pause();tsecs=SW.elapsedSecs();if(CU)DataAPI.stopTimer(CU.id);}
  a.tl.push({type:trun?'resume':'pause',text:trun?'Timer resumed':'Timer paused',time:'Now'});
  updWP();rTmr();rDash();
}

function rTmr(){
  var ft=document.getElementById('fc-timer');if(ft)ft.textContent=fmtMono(tsecs);
  var dt=document.getElementById('det-timer');if(dt)dt.textContent=fmtMono(tsecs);
  var st=document.getElementById('stat-time');if(st)st.textContent=fmtSh(tsecs);
  updWP();
  var a=(TASKS.concat(SUBTASKS)).find(function(t){return t.active;});
  if(a&&a.isPiece&&typeof wlPriceCard==='function'&&tsecs%15===0){
    var pw=document.getElementById('wl-price-wrap');if(pw)pw.innerHTML=wlPriceCard(a,tsecs);
  }
  if(a){
    var exp=(a.exp||3600);var diff=tsecs-exp;
    var ctx=document.getElementById('fc-ctx');
    if(ctx&&typeof atcCompare==='function'){
      ctx.innerHTML=atcCompare(exp,tsecs);
      var pct=exp>0?Math.round(tsecs/exp*100):0;
      var bar=document.getElementById('fc-bar');if(bar)bar.style.width=Math.min(100,pct)+'%';
      var hint=document.getElementById('fc-hint');if(hint)hint.textContent=pct+'% of the expected time used'+(pct>100?' \u2014 you are over the estimate':'');
      var card=document.getElementById('atc');if(card)card.classList.toggle('over',diff>60);
    }
  }
}

function updWP(){
  var dot=document.getElementById('wp-dot'),lbl=document.getElementById('wp-lbl'),tm=document.getElementById('wp-tm');
  if(!dot||!lbl)return;
  if(onBrk){dot.className='wp-dot brk';lbl.textContent='On Break · '+(brkType||'');if(tm&&brkAt)tm.textContent=fmtMono(Math.floor((Date.now()-brkAt)/1000));}
  else if(ws&&trun){dot.className='wp-dot working';lbl.textContent='Working';if(tm)tm.textContent=fmtMono(tsecs);}
  else if(ws){dot.className='wp-dot paused';lbl.textContent='Paused';if(tm)tm.textContent=fmtMono(tsecs);}
  else{dot.className='wp-dot idle';lbl.textContent='Not started';if(tm)tm.textContent='';}
}

function activateTask(id,silent,force){
  var task=findWorkItem(id);if(!task)return;

  if(task.isSubtask && task.adminStatus==='pending'){toast('Waiting for Admin approval before you can start this task','err');return;}
  if(task.isSubtask && task.adminStatus==='rejected'){toast('This task was sent back. Resubmit it for Admin approval before starting again.','err');return;}
  if(!task.isSubtask && task.status==='approved'){toast('This task is already approved','err');return;}
  if(task.status==='submitted'){toast("Awaiting review — you can't restart it",'err');return;}

  /* Clicking Start on the task that is already active must never open the
     switch dialog. It is the same task, so Start becomes Pause/Resume. */
  if(task.active){
    toggleT();
    if(!silent){rAll();toast(trun?'Task resumed':'Task paused','ok');}
    else{updWP();rDash();updBadges();}
    return;
  }

  /* Only another task can trigger a task-switch confirmation. */
  var current=(TASKS.concat(SUBTASKS)).find(function(t){return t.active;});
  /* force = the person already pressed Confirm, so don't ask again */
  if(current && current.id!==id && !force){
    sDlg('Switch Task?','Your timer is saved. Switch to new task?',function(){activateTask(id,silent,true);});
    return;
  }

  if(typeof Wallet!=='undefined'&&CU){
    var chk=Wallet.canStart(CU.id,task.isSubtask?task.deliverableId:id);
    if(!chk.ok){toast(chk.reason,'err');if(!silent){openDetail(id);}return;}
  }

  TASKS.forEach(function(t){t.active=false;}); SUBTASKS.forEach(function(t){t.active=false;});
  task.active=true;
  if(task.status==='todo'){
    task.status='inprogress';
    task.tl.push({type:'start',text:'Started',time:'Now'});
  }
  if(!ws){ws=true;wsAt=Date.now();var bb=document.getElementById('brk-btn');if(bb)bb.style.display='flex';}
  stopT();startT(task);
  var att=todayAtt();if(att.tasks.indexOf(id)<0)att.tasks.push(id);
  if(!silent){rAll();toast('Started: "'+esc(task.title.slice(0,32))+'…"','ok');}
  else{updWP();rDash();updBadges();}
}

function confirmSwitch(id){
  var task=findWorkItem(id);
  if(task && task.active){
    toggleT();
    rAll();
    toast(trun?'Task resumed':'Task paused','ok');
    return;
  }
  var cur=(TASKS.concat(SUBTASKS)).find(function(t){return t.active;});
  if(!cur){activateTask(id);return;}
  sDlg('Switch Task?','Your timer is saved. Switch to new task?',function(){activateTask(id,false,true);});
}

// ── BREAK ──
function oBrk(){
  if(onBrk){endBrk();return;}
  oMod('Take a Break',
    '<div class="fg"><label class="fl">Break Type</label>'+
    '<div class="ptog" id="bp"><button class="popt on" onclick="setPT(this,\'bp\');_bType=\'Lunch\'">🍱 Lunch</button>'+
    '<button class="popt" onclick="setPT(this,\'bp\');_bType=\'Tea\'">☕ Tea</button>'+
    '<button class="popt" onclick="setPT(this,\'bp\');_bType=\'Personal\'">🏃 Personal</button>'+
    '<button class="popt" onclick="setPT(this,\'bp\');_bType=\'Other\'">⏸ Other</button></div></div>',
  [{l:'Cancel',cls:'btn-ghost',a:cMod},{l:'Start Break',cls:'btn-solid',a:startBrk}]);
}

function startBrk(){
  onBrk=true;brkAt=Date.now();brkType=_bType;
  var a=(TASKS.concat(SUBTASKS)).find(function(t){return t.active;});if(a&&trun)stopT();
  updWP();rAll();toast('Break started: '+brkType);cMod();
}

function endBrk(){
  if(!onBrk)return;
  var startedAt=new Date(brkAt).toISOString();
  var endedAt=new Date().toISOString();
  var secs=Math.round((Date.now()-brkAt)/1000);
  if(CU){
    DataAPI.addBreak(CU.id,{type:brkType,startAt:startedAt,endAt:endedAt,secs:secs})
      .then(function(){syncUserState();}).catch(function(){});
  }
  onBrk=false;brkAt=null;brkType=null;
  var a=(TASKS.concat(SUBTASKS)).find(function(t){return t.active;});if(a&&ws)startT(a);
  updWP();rAll();toast('Break ended. Back to work! 💪');
}

// // ══════════════════════════════════════════════
// // WALLET (employee side) + piece-rate task widgets
// // ══════════════════════════════════════════════

// var _wlFilter = 'all';

// function _rup(paise){ return Utils.fmtRupee(paise||0).replace('.00',''); }

// /* ── WALLET PAGE ─────────────────────────────────────────────────────── */
// function rWallet(){
//   var el=document.getElementById('wallet-body'); if(!el||!CU) return;
//   if(typeof Wallet==='undefined'){ el.innerHTML='<div class="empty">Wallet module didn’t load</div>'; return; }
//   if(!Wallet.moneyVisibleToEmployees()){
//     el.innerHTML='<div class="empty"><div style="font-size:26px;margin-bottom:6px">\uD83D\uDD12</div><div style="font-weight:600;margin-bottom:4px">Not available</div><div style="font-size:12.5px;color:var(--t3)">Pay details are managed by your admin.</div></div>';
//     return;
//   }
//   el.innerHTML='<div class="empty">Loading\u2026</div>';

//   Promise.all([Wallet.getWallet(CU.id), Wallet.getDisputes({employeeId:CU.id})]).then(function(res){
//     var w=res[0], disputes=res[1];
//     var html='<div class="shd"><div><div class="stitle">Wallet</div><div class="ssub">Every task’s pay, and the reason behind every adjustment</div></div></div>';

//     // Hero
//     html+='<div class="wl-hero">';
//     html+='<div><div class="wl-hero-l">Balance (owed to you)</div><div class="wl-hero-v">'+_rup(w.balancePaise)+'</div>';
//     html+='<div class="wl-hero-s">'+(w.paidOutPaise?_rup(w.paidOutPaise)+' paid out so far':'No payouts yet')+'</div></div>';
//     html+='<div class="wl-hero-grid">';
//     html+='<div><div class="wl-hero-l">This month</div><div class="wl-hero-m">'+_rup(w.thisMonthPaise)+'</div></div>';
//     html+='<div><div class="wl-hero-l">Lost to slabs</div><div class="wl-hero-m" style="color:#FCA5A5">'+_rup(Math.abs(w.slabPaise))+'</div></div>';
//     html+='<div><div class="wl-hero-l">Open work</div><div class="wl-hero-m" style="color:#6EE7B7">'+_rup(w.committedPaise)+'</div><div class="wl-hero-s">if delivered on time</div></div>';
//     html+='</div></div>';

//     // How it works (short, always visible)
//     html+='<div class="wl-how"><b>How it works:</b> Each task has a fixed price. Deliver within the agreed time and you get all of it. Every extra <b>full</b> hour = one slab down (6% of the price). Review wait, blocked time and leave don’t count \u2014 only your timer does. If something looks wrong, tap <b>Dispute</b> on the entry.</div>';

//     // Open disputes
//     var open=disputes.filter(function(x){return x.status==='OPEN';});
//     var closed=disputes.filter(function(x){return x.status!=='OPEN';});
//     if(open.length){
//       html+='<div class="card" style="margin-bottom:13px;border-color:rgba(217,119,6,.35)">';
//       html+='<div class="wl-sec">\u2696\uFE0F Your disputes \u2014 awaiting admin reply ('+open.length+')</div>';
//       open.forEach(function(x){
//         html+='<div class="wl-disp"><div><div style="font-size:13px;font-weight:600">'+esc(x.taskTitle||'Manual entry')+' \u00b7 '+_rup(Math.abs(x.amountPaise))+'</div>';
//         html+='<div style="font-size:12px;color:var(--t2);margin-top:2px">'+esc(x.reason)+'</div></div>';
//         html+='<span class="badge b-ir">Pending</span></div>';
//       });
//       html+='</div>';
//     }

//     // Filter + ledger
//     html+='<div class="tbar" style="margin-bottom:10px">';
//     [['all','All'],['TASK_CREDIT','Credit'],['SLAB_ADJUSTMENT','Slab'],['DEDUCTION','Penalty'],['DISPUTE_CREDIT','Dispute credit'],['PAYOUT','Payout']].forEach(function(f){
//       html+='<button class="tbtn '+(_wlFilter===f[0]?'on':'')+'" onclick="_wlFilter=\''+f[0]+'\';rWallet()">'+f[1]+'</button>';
//     });
//     html+='</div>';

//     var rows=_wlFilter==='all'?w.entries:w.entries.filter(function(e){return e.type===_wlFilter;});
//     if(!rows.length){
//       html+='<div class="empty"><div style="font-size:26px;margin-bottom:6px">\uD83D\uDCB0</div><div style="font-weight:600;margin-bottom:4px">Nothing here yet</div><div style="font-size:12.5px;color:var(--t3)">When a priced task is approved, its pay appears here \u2014 with the reason.</div></div>';
//     } else {
//       rows.forEach(function(e){ html+=_wlRow(e); });
//     }

//     if(closed.length){
//       html+='<div class="wl-sec" style="margin-top:18px">Resolved disputes</div>';
//       closed.forEach(function(x){
//         var ok=x.status==='ACCEPTED';
//         html+='<div class="wl-disp"><div><div style="font-size:13px;font-weight:600">'+esc(x.taskTitle||'Manual entry')+' \u00b7 '+_rup(Math.abs(x.amountPaise))+'</div>';
//         html+='<div style="font-size:12px;color:var(--t2);margin-top:2px">Your reason: '+esc(x.reason)+'</div>';
//         html+='<div style="font-size:12px;color:'+(ok?'var(--glc)':'var(--t3)')+';margin-top:2px">Admin: '+esc(x.resolutionNote)+(ok?' \u2192 '+_rup(x.creditedPaise)+' credit':'')+'</div></div>';
//         html+='<span class="badge '+(ok?'b-done':'b-rej')+'">'+(ok?'Accepted':'Not accepted')+'</span></div>';
//       });
//     }
//     el.innerHTML=html;
//   }).catch(function(err){ el.innerHTML='<div class="empty">'+esc(err.message||'Wallet didn’t load')+'</div>'; });
// }

// function _wlRow(e){
//   var pos=e.amountPaise>0;
//   var meta={TASK_CREDIT:['\u2713','var(--gl)','var(--glc)','Task credit'],SLAB_ADJUSTMENT:['\u2193','var(--rl)','var(--rlc)','Late slab'],
//     DISPUTE_CREDIT:['\u2696','var(--bl)','var(--blc)','Dispute credit'],BONUS:['\u2605','var(--al)','var(--alc)','Bonus'],
//     ADJUSTMENT:['\u00b1','var(--s2)','var(--t2)','Adjustment'],DEDUCTION:['−','var(--rl)','var(--red)','Penalty deduction'],PAYOUT:['\u20B9','var(--s2)','var(--t2)','Payout']}[e.type]||['\u2022','var(--s2)','var(--t2)',e.type];
//   var canDispute=(e.type==='SLAB_ADJUSTMENT'||e.type==='TASK_CREDIT'||e.type==='ADJUSTMENT')&&!e.disputeStatus;
//   var h='<div class="wl-row">';
//   h+='<div class="wl-ic" style="background:'+meta[1]+';color:'+meta[2]+'">'+meta[0]+'</div>';
//   h+='<div style="flex:1;min-width:0">';
//   h+='<div class="wl-t"><span>'+esc(e.taskTitle||meta[3])+'</span><span class="wl-amt" style="color:'+(pos?'var(--green)':'var(--red)')+'">'+(pos?'+':'\u2212')+_rup(Math.abs(e.amountPaise))+'</span></div>';
//   h+='<div class="wl-why">'+esc(e.why)+'</div>';
//   h+='<div class="wl-m"><span>'+meta[3]+'</span>'+(e.project?'<span>\u00b7 '+esc(e.project)+'</span>':'')+'<span>\u00b7 '+_relLabel(e.createdAt)+'</span>';
//   if(e.disputeStatus)h+='<span class="wl-dsp-tag">'+(e.disputeStatus==='OPEN'?'Dispute pending':e.disputeStatus==='ACCEPTED'?'Dispute accepted':'Dispute closed')+'</span>';
//   else if(canDispute)h+='<button class="wl-link" onclick="oDispute(\''+e.id+'\')">Dispute</button>';
//   h+='</div></div></div>';
//   return h;
// }

// function oDispute(entryId){
//   oMod('Dispute this entry',
//     '<div style="font-size:12.5px;color:var(--t2);margin-bottom:10px;line-height:1.55">What’s wrong? Say it plainly \u2014 like "the brief arrived 40 min late" or "I forgot the timer, real time was 1h". The admin sees exactly this.</div>'+
//     '<textarea class="fta" id="dsp-reason" placeholder="Write the reason\u2026" style="min-height:90px"></textarea>',
//     [{l:'Cancel',cls:'btn-ghost',a:cMod},{l:'Send',cls:'btn-solid',a:function(){
//       var r=(document.getElementById('dsp-reason')||{}).value||'';
//       Wallet.raiseDispute(entryId,CU.id,r).then(function(){cMod();syncUserState();rWallet();updBadges();toast('Dispute sent \u2014 the admin will review it','ok');})
//         .catch(function(err){toast(err.message||'Not sent','err');});
//     }}]);
// }


// /* Price card — task detail ke andar */
// function wlPriceCard(task, liveSecs){
//   if(!task.isPiece) return '';
//   if(!(typeof Wallet!=='undefined'&&Wallet.moneyVisibleToEmployees())) return '';    
//   var raw=DataAPI.raw().deliverables.find(function(d){return d.id===task.id;}); if(!raw) return '';
//   var h='<div class="card wl-price" style="margin-bottom:13px">';
//   h+='<div class="wl-sec">\uD83D\uDCB0 Pay for this task</div>';

//   if(task.settlement){
//     var s=task.settlement;
//     h+='<div class="wl-price-row"><span>Task price</span><b>'+_rup(s.basePaise)+'</b></div>';
//     if(s.cutPaise)h+='<div class="wl-price-row" style="color:var(--red)"><span>Late slab</span><b>\u2212'+_rup(s.cutPaise)+'</b></div>';
//     h+='<div class="wl-price-row wl-price-final"><span>Mila</span><b>'+_rup(s.finalPaise)+'</b></div>';
//     h+='<div class="wl-why" style="margin-top:6px">'+esc(s.why)+'</div>';
//     h+='<button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="nav(\'wallet\',document.querySelector(\'[data-v=wallet]\'))">View in Wallet \u2192</button>';
//     return h+'</div>';
//   }

//   var pv=Wallet.slabPreview(raw, liveSecs!=null?liveSecs:raw.loggedSecs);
//   var share=task.myPricePaise, n=(raw.assigneeIds||[]).length;
//   var agreed=task.agreement.state==='AGREED';
//   h+='<div class="wl-price-big">'+_rup(pv.currentPaise)+(n>1?'<span class="wl-price-share">\u00b7 your share '+_rup(Math.round(pv.currentPaise/n))+'</span>':'')+'</div>';
//   if(!agreed){
//     h+='<div class="wl-why">This is confirmed once the estimate is agreed. For now: '+_rup(task.pricePaise)+' if done in '+fmtSh(task.agreement.adminSecs||task.exp)+'.</div>';
//   } else if(pv.atFloor){
//     h+='<div class="wl-why" style="color:var(--red)">Floor reached \u2014 it won’t go lower. '+esc(pv.why)+'</div>';
//   } else if(pv.steps>0){
//     h+='<div class="wl-why" style="color:var(--red)">'+esc(pv.why)+'</div>';
//     h+='<div class="wl-why">Agla slab '+fmtSh(pv.secsToNext)+' \u2192 '+_rup(pv.nextPaise)+'. If the work is done, submit now.</div>';
//   } else {
//     h+='<div class="wl-why">Agreed '+fmtSh(raw.estimateSecs)+'. Take '+fmtSh(pv.secsToNext)+' longer and it drops to '+_rup(pv.nextPaise)+' (every extra full hour \u2212'+(raw.slab?raw.slab.cutPct:6)+'%). Minimum '+_rup(pv.floorPaise)+'.</div>';
//   }
//   if(task.reworkCount)h+='<div class="wl-why" style="margin-top:4px">\u21BB '+task.reworkCount+' time(s) sent back \u2014 rework time counts too, with no extra pay.</div>';
//   h+='</div>';
//   return h;
// }

// function wlAgreementCard(task){
//   if(!task.isPiece||task.status==='approved'||task.status==='submitted') return '';
//   var a=task.agreement||{state:'NONE'};
//   var h='';
//   if(a.state==='PENDING'){
//     h+='<div class="card wl-agree" style="margin-bottom:13px;border-color:rgba(217,119,6,.4)">';
//     h+='<div class="wl-sec" style="color:var(--alc)">\u23F1 Agree the time first</div>';
//     h+='<div style="font-size:13px;line-height:1.6;margin-bottom:10px">Admin’s estimate: <b>'+fmtSh(a.adminSecs)+'</b>'+((typeof Wallet!=='undefined'&&Wallet.moneyVisibleToEmployees())?' for <b>'+_rup(task.pricePaise)+'</b>':'')+(a.note?'<div style="font-size:12px;color:var(--t2);margin-top:3px">Admin: '+esc(a.note)+'</div>':'')+'</div>';
//     h+='<div style="font-size:12px;color:var(--t3);margin-bottom:10px;line-height:1.5">Accept it if it looks right. If it will take longer, propose your own number with a one-line reason \u2014 the admin will accept or counter. The timer won’t run without an agreement, and slabs are counted from the agreed number.</div>';
//     h+='<div style="display:flex;gap:7px;flex-wrap:wrap"><button class="btn btn-solid btn-sm" onclick="wlAccept('+task.id+')">\u2713 '+fmtSh(a.adminSecs)+' is fine</button><button class="btn btn-ghost btn-sm" onclick="oPropose('+task.id+')">I need a different time</button></div>';
//     h+='</div>';
//   } else if(a.state==='COUNTERED'){
//     h+='<div class="card" style="margin-bottom:13px;border-color:rgba(37,99,235,.35)"><div class="wl-sec" style="color:var(--blc)">\u23F3 Waiting for the admin</div>';
//     h+='<div style="font-size:13px;line-height:1.6">You proposed <b>'+fmtSh(a.employeeSecs)+'</b> (the admin set '+fmtSh(a.adminSecs)+').<div style="font-size:12px;color:var(--t2);margin-top:3px">Your reason: '+esc(a.note)+'</div></div></div>';
//   } else if(a.state==='FLAGGED'){
//     h+='<div class="card" style="margin-bottom:13px;border-color:rgba(220,38,38,.35)"><div class="wl-sec" style="color:var(--rlc)">\uD83D\uDEA9 You flagged this \u2014 waiting for the admin</div>';
//     h+='<div style="font-size:12px;color:var(--t2)">'+esc(a.flagReason)+'</div></div>';
//   } else if(a.state==='AGREED'&&a.auto){
//     var age=(Date.now()-new Date(a.agreedAt||task.createdAt).getTime())/1000;
//     var win=(DataAPI.raw().payPolicy||{}).flagWindowSecs||900;
//     if(age<win&&task.status==='todo'){
//       h+='<div class="wl-note">Chhota task \u2014 estimate <b>'+fmtSh(task.exp)+'</b> is auto-agreed. If it looks unrealistic, <button class="wl-link" onclick="oFlag('+task.id+')">'+Math.ceil((win-age)/60)+'flag it within the next  min</button>.</div>';
//     }
//   }
//   return h;
// }

// /* Blocked — banner + button */
// function wlBlockedCard(task){
//   var h='';
//   if(task.blocked){
//     h+='<div class="card" style="margin-bottom:13px;background:var(--rl);border-color:rgba(220,38,38,.3)">';
//     h+='<div class="wl-sec" style="color:var(--rlc)">\uD83D\uDED1 This task is blocked</div>';
//     h+='<div style="font-size:13px;line-height:1.55;margin-bottom:6px">'+esc(task.blocked.reason)+'</div>';
//     h+='<div style="font-size:12px;color:var(--t2);margin-bottom:10px">'+_relLabel(task.blocked.since)+'. The timer is stopped \u2014 this time isn’t counted against you. The admin has been signalled.</div>';
//     h+='<button class="btn btn-solid btn-sm" onclick="wlUnblock('+task.id+')">Got it \u2014 unblock</button></div>';
//   } else if((task.status==='inprogress'||task.status==='todo'||task.status==='rejected')&&(!task.isPiece||task.agreement.state==='AGREED')){
//     h+='<div class="wl-note" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span style="flex:1">Waiting on something \u2014 a file, access, a client reply? Don’t hide it, say so. The timer stops and the admin sees it immediately.</span><button class="btn btn-ghost btn-sm" onclick="oBlocked('+task.id+')">\uD83D\uDED1 I\u2019m blocked</button></div>';
//   }
//   return h;
// }

// function wlAccept(id){
//   Wallet.acceptEstimate(id,CU.id).then(function(){syncUserState();var t=TASKS.find(function(x){return x.id===id;});if(t)rDetail(t);rAll();toast('Agreed \u2713 You can start now','ok');})
//     .catch(function(err){toast(err.message||'Didn’t work','err');});
// }
// function oPropose(id){
//   var t=TASKS.find(function(x){return x.id===id;}); if(!t) return;
//   var hint=Math.round(((t.agreement.adminSecs||t.exp)/3600)*10)/10;
//   oMod('Propose your estimate',
//     '<div class="fg"><label class="fl">How long will it take? (hours)</label><input class="fin" id="pp-hrs" type="number" step="0.5" min="0.5" value="'+hint+'"></div>'+
//     '<div class="fg"><label class="fl">Why? (one line, the admin sees exactly this)</label><textarea class="fta" id="pp-note" placeholder="e.g. 3 separate flows to test, a full regression won’t fit in 2h"></textarea></div>'+
//     '<div style="font-size:12px;color:var(--t3);line-height:1.5">Estimate honestly \u2014 the admin reviews it against your past task data.</div>',
//     [{l:'Cancel',cls:'btn-ghost',a:cMod},{l:'Send',cls:'btn-solid',a:function(){
//       var hrs=parseFloat((document.getElementById('pp-hrs')||{}).value)||0, note=(document.getElementById('pp-note')||{}).value||'';
//       Wallet.proposeEstimate(id,CU.id,Math.round(hrs*3600),note).then(function(){cMod();syncUserState();var f=TASKS.find(function(x){return x.id===id;});if(f)rDetail(f);toast('Sent to the admin','ok');})
//         .catch(function(err){toast(err.message||'Not sent','err');});
//     }}]);
// }
// function oFlag(id){
//   oMod('Is the estimate unrealistic?',
//     '<div class="fg"><label class="fl">Why? (one line)</label><textarea class="fta" id="fl-reason" placeholder="e.g. the brief has 5 screens, they won’t fit in 1h"></textarea></div>',
//     [{l:'Cancel',cls:'btn-ghost',a:cMod},{l:'Flag it',cls:'btn-red',a:function(){
//       var r=(document.getElementById('fl-reason')||{}).value||'';
//       Wallet.flagEstimate(id,CU.id,r).then(function(){cMod();syncUserState();var f=TASKS.find(function(x){return x.id===id;});if(f)rDetail(f);toast('Flagged \u2014 the admin will review it','ok');})
//         .catch(function(err){toast(err.message||'Didn’t work','err');});
//     }}]);
// }
// function oBlocked(id){
//   oMod('What are you blocked on?',
//     '<div class="fg"><label class="fl">What do you need? (the admin sees exactly this)</label><textarea class="fta" id="bl-reason" placeholder="e.g. client hasn’t sent API keys / no Figma access / need Priya’s review"></textarea></div>'+
//     '<div style="font-size:12px;color:var(--t3);line-height:1.5">The timer will stop. Blocked time is never counted against you.</div>',
//     [{l:'Cancel',cls:'btn-ghost',a:cMod},{l:'Block',cls:'btn-red',a:function(){
//       var r=(document.getElementById('bl-reason')||{}).value||'';
//       var a=TASKS.find(function(t){return t.active&&t.id===id;}); if(a){stopT();a.active=false;}
//       Wallet.markBlocked(id,CU.id,r).then(function(){cMod();syncUserState();var f=TASKS.find(function(x){return x.id===id;});if(f)rDetail(f);rAll();toast('The admin has been signalled','ok');})
//         .catch(function(err){toast(err.message||'Didn’t work','err');});
//     }}]);
// }
// function wlUnblock(id){
//   Wallet.unblock(id,CU.id,'Resolved by the employee').then(function(){syncUserState();var f=TASKS.find(function(x){return x.id===id;});if(f)rDetail(f);rAll();toast('Unblocked \u2014 start again','ok');})
//     .catch(function(err){toast(err.message||'Didn’t work','err');});
// }

// function focusOrder(){
//   var pr={high:3,medium:2,low:1};
//   function rank(t){
//     if(t.status==='rejected')return 0;
//     if(t.blocked)return 5;
//     if(t.isPiece&&t.agreement&&t.agreement.state!=='AGREED')return 4;
//     if(t.status==='inprogress')return 1;
//     return 2;
//   }
//   return TASKS.filter(function(t){return t.status!=='approved'&&t.status!=='submitted';})
//     .map(function(t){t._rank=rank(t);return t;})
//     .sort(function(a,b){
//       if(a._rank!==b._rank)return a._rank-b._rank;
//       var pa=pr[a.priority]||2,pb=pr[b.priority]||2;if(pa!==pb)return pb-pa;
//       return (a.dms||Infinity)-(b.dms||Infinity);
//     });
// }
// function focusHint(t){
//   if(t.status==='rejected')return['Sent back \u2014 fix this first','var(--red)'];
//   if(t.blocked)return['Blocked: '+t.blocked.reason,'var(--red)'];
//   if(t.isPiece&&t.agreement&&t.agreement.state==='PENDING')return['Estimate needs your acceptance','var(--amber)'];
//   if(t.isPiece&&t.agreement&&t.agreement.state==='COUNTERED')return['Waiting for the admin','var(--blue)'];
//   if(t.isPiece&&t.agreement&&t.agreement.state==='FLAGGED')return['Flagged \u2014 waiting for the admin','var(--blue)'];
//   if(t.status==='inprogress')return['In progress \u2014 finish it','var(--blue)'];
//   return null;
// }



// ══════════════════════════════════════════════
// WALLET (employee side) + piece-rate task widgets
// ══════════════════════════════════════════════

var _wlFilter = 'all';

function _rup(paise){ return Utils.fmtRupee(paise||0).replace('.00',''); }

/* ── WALLET PAGE ─────────────────────────────────────────────────────── */
function rWallet(){
  var el=document.getElementById('wallet-body'); if(!el||!CU) return;
  if(typeof Wallet==='undefined'){ el.innerHTML='<div class="empty">Wallet module didn’t load</div>'; return; }
  if(!Wallet.moneyVisibleToEmployees()){
    el.innerHTML='<div class="empty"><div style="font-size:26px;margin-bottom:6px">\uD83D\uDD12</div><div style="font-weight:600;margin-bottom:4px">Not available</div><div style="font-size:12.5px;color:var(--t3)">Pay details are managed by your admin.</div></div>';
    return;
  }
  el.innerHTML='<div class="empty">Loading\u2026</div>';

  Promise.all([Wallet.getWallet(CU.id), Wallet.getDisputes({employeeId:CU.id})]).then(function(res){
    var w=res[0], disputes=res[1];
    var html='<div class="shd"><div><div class="stitle">Wallet</div><div class="ssub">Every task’s pay, and the reason behind every adjustment</div></div></div>';

    // Hero
    html+='<div class="wl-hero">';
    html+='<div><div class="wl-hero-l">Balance (owed to you)</div><div class="wl-hero-v">'+_rup(w.balancePaise)+'</div>';
    html+='<div class="wl-hero-s">'+(w.paidOutPaise?_rup(w.paidOutPaise)+' paid out so far':'No payouts yet')+'</div></div>';
    html+='<div class="wl-hero-grid">';
    html+='<div><div class="wl-hero-l">This month</div><div class="wl-hero-m">'+_rup(w.thisMonthPaise)+'</div></div>';
    html+='<div><div class="wl-hero-l">Lost to slabs</div><div class="wl-hero-m" style="color:#FCA5A5">'+_rup(Math.abs(w.slabPaise))+'</div></div>';
    html+='<div><div class="wl-hero-l">Open work</div><div class="wl-hero-m" style="color:#6EE7B7">'+_rup(w.committedPaise)+'</div><div class="wl-hero-s">if delivered on time</div></div>';
    html+='</div></div>';

    // How it works (short, always visible)
    html+='<div class="wl-how"><b>How it works:</b> Each task has a fixed price. Deliver within the agreed time and you get all of it. Every extra <b>full</b> hour = one slab down (6% of the price). Review wait, blocked time and leave don’t count \u2014 only your timer does. If something looks wrong, tap <b>Dispute</b> on the entry.</div>';

    // Open disputes
    var open=disputes.filter(function(x){return x.status==='OPEN';});
    var closed=disputes.filter(function(x){return x.status!=='OPEN';});
    if(open.length){
      html+='<div class="card" style="margin-bottom:13px;border-color:rgba(217,119,6,.35)">';
      html+='<div class="wl-sec">\u2696\uFE0F Your disputes \u2014 awaiting admin reply ('+open.length+')</div>';
      open.forEach(function(x){
        html+='<div class="wl-disp"><div><div style="font-size:13px;font-weight:600">'+esc(x.taskTitle||'Manual entry')+' \u00b7 '+_rup(Math.abs(x.amountPaise))+'</div>';
        html+='<div style="font-size:12px;color:var(--t2);margin-top:2px">'+esc(x.reason)+'</div></div>';
        html+='<span class="badge b-ir">Pending</span></div>';
      });
      html+='</div>';
    }

    // Filter + ledger
    html+='<div class="tbar" style="margin-bottom:10px">';
    [['all','All'],['TASK_CREDIT','Credit'],['SLAB_ADJUSTMENT','Slab'],['DEDUCTION','Penalty'],['DISPUTE_CREDIT','Dispute credit'],['PAYOUT','Payout']].forEach(function(f){
      html+='<button class="tbtn '+(_wlFilter===f[0]?'on':'')+'" onclick="_wlFilter=\''+f[0]+'\';rWallet()">'+f[1]+'</button>';
    });
    html+='</div>';

    var rows=_wlFilter==='all'?w.entries:w.entries.filter(function(e){return e.type===_wlFilter;});
    if(!rows.length){
      html+='<div class="empty"><div style="font-size:26px;margin-bottom:6px">\uD83D\uDCB0</div><div style="font-weight:600;margin-bottom:4px">Nothing here yet</div><div style="font-size:12.5px;color:var(--t3)">When a priced task is approved, its pay appears here \u2014 with the reason.</div></div>';
    } else {
      rows.forEach(function(e){ html+=_wlRow(e); });
    }

    if(closed.length){
      html+='<div class="wl-sec" style="margin-top:18px">Resolved disputes</div>';
      closed.forEach(function(x){
        var ok=x.status==='ACCEPTED';
        html+='<div class="wl-disp"><div><div style="font-size:13px;font-weight:600">'+esc(x.taskTitle||'Manual entry')+' \u00b7 '+_rup(Math.abs(x.amountPaise))+'</div>';
        html+='<div style="font-size:12px;color:var(--t2);margin-top:2px">Your reason: '+esc(x.reason)+'</div>';
        html+='<div style="font-size:12px;color:'+(ok?'var(--glc)':'var(--t3)')+';margin-top:2px">Admin: '+esc(x.resolutionNote)+(ok?' \u2192 '+_rup(x.creditedPaise)+' credit':'')+'</div></div>';
        html+='<span class="badge '+(ok?'b-done':'b-rej')+'">'+(ok?'Accepted':'Not accepted')+'</span></div>';
      });
    }
    el.innerHTML=html;
  }).catch(function(err){ el.innerHTML='<div class="empty">'+esc(err.message||'Wallet didn’t load')+'</div>'; });
}

function _wlRow(e){
  var pos=e.amountPaise>0;
  var meta={TASK_CREDIT:['\u2713','var(--gl)','var(--glc)','Task credit'],SLAB_ADJUSTMENT:['\u2193','var(--rl)','var(--rlc)','Late slab'],
    DISPUTE_CREDIT:['\u2696','var(--bl)','var(--blc)','Dispute credit'],BONUS:['\u2605','var(--al)','var(--alc)','Bonus'],
    ADJUSTMENT:['\u00b1','var(--s2)','var(--t2)','Adjustment'],DEDUCTION:['−','var(--rl)','var(--red)','Penalty deduction'],PAYOUT:['\u20B9','var(--s2)','var(--t2)','Payout']}[e.type]||['\u2022','var(--s2)','var(--t2)',e.type];
  var canDispute=(e.type==='SLAB_ADJUSTMENT'||e.type==='TASK_CREDIT'||e.type==='ADJUSTMENT')&&!e.disputeStatus;
  var h='<div class="wl-row">';
  h+='<div class="wl-ic" style="background:'+meta[1]+';color:'+meta[2]+'">'+meta[0]+'</div>';
  h+='<div style="flex:1;min-width:0">';
  h+='<div class="wl-t"><span>'+esc(e.taskTitle||meta[3])+'</span><span class="wl-amt" style="color:'+(pos?'var(--green)':'var(--red)')+'">'+(pos?'+':'\u2212')+_rup(Math.abs(e.amountPaise))+'</span></div>';
  h+='<div class="wl-why">'+esc(e.why)+'</div>';
  h+='<div class="wl-m"><span>'+meta[3]+'</span>'+(e.project?'<span>\u00b7 '+esc(e.project)+'</span>':'')+'<span>\u00b7 '+_relLabel(e.createdAt)+'</span>';
  if(e.disputeStatus)h+='<span class="wl-dsp-tag">'+(e.disputeStatus==='OPEN'?'Dispute pending':e.disputeStatus==='ACCEPTED'?'Dispute accepted':'Dispute closed')+'</span>';
  else if(canDispute)h+='<button class="wl-link" onclick="oDispute(\''+e.id+'\')">Dispute</button>';
  h+='</div></div></div>';
  return h;
}

function oDispute(entryId){
  oMod('Dispute this entry',
    '<div style="font-size:12.5px;color:var(--t2);margin-bottom:10px;line-height:1.55">What’s wrong? Say it plainly \u2014 like "the brief arrived 40 min late" or "I forgot the timer, real time was 1h". The admin sees exactly this.</div>'+
    '<textarea class="fta" id="dsp-reason" placeholder="Write the reason\u2026" style="min-height:90px"></textarea>',
    [{l:'Cancel',cls:'btn-ghost',a:cMod},{l:'Send',cls:'btn-solid',a:function(){
      var r=(document.getElementById('dsp-reason')||{}).value||'';
      Wallet.raiseDispute(entryId,CU.id,r).then(function(){cMod();syncUserState();rWallet();updBadges();toast('Dispute sent \u2014 the admin will review it','ok');})
        .catch(function(err){toast(err.message||'Not sent','err');});
    }}]);
}


/* Price card — inside the task detail */
function wlPriceCard(task, liveSecs){
  if(!task.isPiece) return '';
  if(!(typeof Wallet!=='undefined'&&Wallet.moneyVisibleToEmployees())) return '';    
  var raw=DataAPI.raw().deliverables.find(function(d){return d.id===task.id;}); if(!raw) return '';
  var h='<div class="card wl-price" style="margin-bottom:13px">';
  h+='<div class="wl-sec">\uD83D\uDCB0 Pay for this task</div>';

  if(task.settlement){
    var s=task.settlement;
    h+='<div class="wl-price-row"><span>Task price</span><b>'+_rup(s.basePaise)+'</b></div>';
    if(s.cutPaise)h+='<div class="wl-price-row" style="color:var(--red)"><span>Late slab</span><b>\u2212'+_rup(s.cutPaise)+'</b></div>';
    h+='<div class="wl-price-row wl-price-final"><span>Received</span><b>'+_rup(s.finalPaise)+'</b></div>';
    h+='<div class="wl-why" style="margin-top:6px">'+esc(s.why)+'</div>';
    h+='<button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="nav(\'wallet\',document.querySelector(\'[data-v=wallet]\'))">View in Wallet \u2192</button>';
    return h+'</div>';
  }

  var pv=Wallet.slabPreview(raw, liveSecs!=null?liveSecs:raw.loggedSecs);
  var share=task.myPricePaise, n=(raw.assigneeIds||[]).length;
  var agreed=task.agreement.state==='AGREED';
  h+='<div class="wl-price-big">'+_rup(pv.currentPaise)+(n>1?'<span class="wl-price-share">\u00b7 your share '+_rup(Math.round(pv.currentPaise/n))+'</span>':'')+'</div>';
  if(!agreed){
    h+='<div class="wl-why">This is confirmed once the estimate is agreed. For now: '+_rup(task.pricePaise)+' if done in '+fmtSh(task.agreement.adminSecs||task.exp)+'.</div>';
  } else if(pv.atFloor){
    h+='<div class="wl-why" style="color:var(--red)">Floor reached \u2014 it won’t go lower. '+esc(pv.why)+'</div>';
  } else if(pv.steps>0){
    h+='<div class="wl-why" style="color:var(--red)">'+esc(pv.why)+'</div>';
    h+='<div class="wl-why">Next slab '+fmtSh(pv.secsToNext)+' \u2192 '+_rup(pv.nextPaise)+'. If the work is done, submit now.</div>';
  } else {
    h+='<div class="wl-why">Agreed '+fmtSh(raw.estimateSecs)+'. Take '+fmtSh(pv.secsToNext)+' longer and it drops to '+_rup(pv.nextPaise)+' (every extra full hour \u2212'+(raw.slab?raw.slab.cutPct:6)+'%). Minimum '+_rup(pv.floorPaise)+'.</div>';
  }
  if(task.reworkCount)h+='<div class="wl-why" style="margin-top:4px">\u21BB '+task.reworkCount+' time(s) sent back \u2014 rework time counts too, with no extra pay.</div>';
  h+='</div>';
  return h;
}

function wlAgreementCard(task){
  if(!task.isPiece||task.status==='approved'||task.status==='submitted') return '';
  var a=task.agreement||{state:'NONE'};
  var h='';
  if(a.state==='PENDING'){
    h+='<div class="card wl-agree" style="margin-bottom:13px;border-color:rgba(217,119,6,.4)">';
    h+='<div class="wl-sec" style="color:var(--alc)">\u23F1 Agree the time first</div>';
    h+='<div style="font-size:13px;line-height:1.6;margin-bottom:10px">Admin’s estimate: <b>'+fmtSh(a.adminSecs)+'</b>'+((typeof Wallet!=='undefined'&&Wallet.moneyVisibleToEmployees())?' for <b>'+_rup(task.pricePaise)+'</b>':'')+(a.note?'<div style="font-size:12px;color:var(--t2);margin-top:3px">Admin: '+esc(a.note)+'</div>':'')+'</div>';
    h+='<div style="font-size:12px;color:var(--t3);margin-bottom:10px;line-height:1.5">Accept it if it looks right. If it will take longer, propose your own number with a one-line reason \u2014 the admin will accept or counter. The timer won’t run without an agreement, and slabs are counted from the agreed number.</div>';
    h+='<div style="display:flex;gap:7px;flex-wrap:wrap"><button class="btn btn-solid btn-sm" onclick="wlAccept('+task.id+')">\u2713 '+fmtSh(a.adminSecs)+' is fine</button><button class="btn btn-ghost btn-sm" onclick="oPropose('+task.id+')">I need a different time</button></div>';
    h+='</div>';
  } else if(a.state==='COUNTERED'){
    h+='<div class="card" style="margin-bottom:13px;border-color:rgba(37,99,235,.35)"><div class="wl-sec" style="color:var(--blc)">\u23F3 Waiting for the admin</div>';
    h+='<div style="font-size:13px;line-height:1.6">You proposed <b>'+fmtSh(a.employeeSecs)+'</b> (the admin set '+fmtSh(a.adminSecs)+').<div style="font-size:12px;color:var(--t2);margin-top:3px">Your reason: '+esc(a.note)+'</div></div></div>';
  } else if(a.state==='FLAGGED'){
    h+='<div class="card" style="margin-bottom:13px;border-color:rgba(220,38,38,.35)"><div class="wl-sec" style="color:var(--rlc)">\uD83D\uDEA9 You flagged this \u2014 waiting for the admin</div>';
    h+='<div style="font-size:12px;color:var(--t2)">'+esc(a.flagReason)+'</div></div>';
  } else if(a.state==='AGREED'&&a.auto){
    var age=(Date.now()-new Date(a.agreedAt||task.createdAt).getTime())/1000;
    var win=(DataAPI.raw().payPolicy||{}).flagWindowSecs||900;
    if(age<win&&task.status==='todo'){
      h+='<div class="wl-note">Small task \u2014 estimate <b>'+fmtSh(task.exp)+'</b> is auto-agreed. If it looks unrealistic, <button class="wl-link" onclick="oFlag('+task.id+')">'+Math.ceil((win-age)/60)+'flag it within the next  min</button>.</div>';
    }
  }
  return h;
}

/* Blocked — banner + button */
function wlBlockedCard(task){
  var h='';
  if(task.blocked){
    h+='<div class="card" style="margin-bottom:13px;background:var(--rl);border-color:rgba(220,38,38,.3)">';
    h+='<div class="wl-sec" style="color:var(--rlc)">\uD83D\uDED1 This task is blocked</div>';
    h+='<div style="font-size:13px;line-height:1.55;margin-bottom:6px">'+esc(task.blocked.reason)+'</div>';
    h+='<div style="font-size:12px;color:var(--t2);margin-bottom:10px">'+_relLabel(task.blocked.since)+'. The timer is stopped \u2014 this time isn’t counted against you. The admin has been signalled.</div>';
    h+='<button class="btn btn-solid btn-sm" onclick="wlUnblock('+task.id+')">Got it \u2014 unblock</button></div>';
  } else if((task.status==='inprogress'||task.status==='todo'||task.status==='rejected')&&(!task.isPiece||task.agreement.state==='AGREED')){
    h+='<div class="wl-note" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span style="flex:1">Waiting on something \u2014 a file, access, a client reply? Don’t hide it, say so. The timer stops and the admin sees it immediately.</span><button class="btn btn-ghost btn-sm" onclick="oBlocked('+task.id+')">\uD83D\uDED1 I\u2019m blocked</button></div>';
  }
  return h;
}

function wlAccept(id){
  Wallet.acceptEstimate(id,CU.id).then(function(){syncUserState();var t=TASKS.find(function(x){return x.id===id;});if(t)rDetail(t);rAll();toast('Agreed \u2713 You can start now','ok');})
    .catch(function(err){toast(err.message||'Didn’t work','err');});
}
function oPropose(id){
  var t=TASKS.find(function(x){return x.id===id;}); if(!t) return;
  var hint=Math.round(((t.agreement.adminSecs||t.exp)/3600)*10)/10;
  oMod('Propose your estimate',
    '<div class="fg"><label class="fl">How long will it take? (hours)</label><input class="fin" id="pp-hrs" type="number" step="0.5" min="0.5" value="'+hint+'"></div>'+
    '<div class="fg"><label class="fl">Why? (one line, the admin sees exactly this)</label><textarea class="fta" id="pp-note" placeholder="e.g. 3 separate flows to test, a full regression won’t fit in 2h"></textarea></div>'+
    '<div style="font-size:12px;color:var(--t3);line-height:1.5">Estimate honestly \u2014 the admin reviews it against your past task data.</div>',
    [{l:'Cancel',cls:'btn-ghost',a:cMod},{l:'Send',cls:'btn-solid',a:function(){
      var hrs=parseFloat((document.getElementById('pp-hrs')||{}).value)||0, note=(document.getElementById('pp-note')||{}).value||'';
      Wallet.proposeEstimate(id,CU.id,Math.round(hrs*3600),note).then(function(){cMod();syncUserState();var f=TASKS.find(function(x){return x.id===id;});if(f)rDetail(f);toast('Sent to the admin','ok');})
        .catch(function(err){toast(err.message||'Not sent','err');});
    }}]);
}
function oFlag(id){
  oMod('Is the estimate unrealistic?',
    '<div class="fg"><label class="fl">Why? (one line)</label><textarea class="fta" id="fl-reason" placeholder="e.g. the brief has 5 screens, they won’t fit in 1h"></textarea></div>',
    [{l:'Cancel',cls:'btn-ghost',a:cMod},{l:'Flag it',cls:'btn-red',a:function(){
      var r=(document.getElementById('fl-reason')||{}).value||'';
      Wallet.flagEstimate(id,CU.id,r).then(function(){cMod();syncUserState();var f=TASKS.find(function(x){return x.id===id;});if(f)rDetail(f);toast('Flagged \u2014 the admin will review it','ok');})
        .catch(function(err){toast(err.message||'Didn’t work','err');});
    }}]);
}
function oBlocked(id){
  oMod('What are you blocked on?',
    '<div class="fg"><label class="fl">What do you need? (the admin sees exactly this)</label><textarea class="fta" id="bl-reason" placeholder="e.g. client hasn’t sent API keys / no Figma access / need Priya’s review"></textarea></div>'+
    '<div style="font-size:12px;color:var(--t3);line-height:1.5">The timer will stop. Blocked time is never counted against you.</div>',
    [{l:'Cancel',cls:'btn-ghost',a:cMod},{l:'Block',cls:'btn-red',a:function(){
      var r=(document.getElementById('bl-reason')||{}).value||'';
      var a=TASKS.find(function(t){return t.active&&t.id===id;}); if(a){stopT();a.active=false;}
      Wallet.markBlocked(id,CU.id,r).then(function(){cMod();syncUserState();var f=TASKS.find(function(x){return x.id===id;});if(f)rDetail(f);rAll();toast('The admin has been signalled','ok');})
        .catch(function(err){toast(err.message||'Didn’t work','err');});
    }}]);
}
function wlUnblock(id){
  Wallet.unblock(id,CU.id,'Resolved by the employee').then(function(){syncUserState();var f=TASKS.find(function(x){return x.id===id;});if(f)rDetail(f);rAll();toast('Unblocked \u2014 start again','ok');})
    .catch(function(err){toast(err.message||'Didn’t work','err');});
}

function focusOrder(){
  var pr={high:3,medium:2,low:1};
  function rank(t){
    if(t.status==='rejected')return 0;
    if(t.blocked)return 5;
    if(t.isPiece&&t.agreement&&t.agreement.state!=='AGREED')return 4;
    if(t.status==='inprogress')return 1;
    return 2;
  }
  return TASKS.filter(function(t){return t.status!=='approved'&&t.status!=='submitted';})
    .map(function(t){t._rank=rank(t);return t;})
    .sort(function(a,b){
      if(a._rank!==b._rank)return a._rank-b._rank;
      var pa=pr[a.priority]||2,pb=pr[b.priority]||2;if(pa!==pb)return pb-pa;
      return (a.dms||Infinity)-(b.dms||Infinity);
    });
}
function focusHint(t){
  if(t.status==='rejected')return['Sent back \u2014 fix this first','var(--red)'];
  if(t.blocked)return['Blocked: '+t.blocked.reason,'var(--red)'];
  if(t.isPiece&&t.agreement&&t.agreement.state==='PENDING')return['Estimate needs your acceptance','var(--amber)'];
  if(t.isPiece&&t.agreement&&t.agreement.state==='COUNTERED')return['Waiting for the admin','var(--blue)'];
  if(t.isPiece&&t.agreement&&t.agreement.state==='FLAGGED')return['Flagged \u2014 waiting for the admin','var(--blue)'];
  if(t.status==='inprogress')return['In progress \u2014 finish it','var(--blue)'];
  return null;
}
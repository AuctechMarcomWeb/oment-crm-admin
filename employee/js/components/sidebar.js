// ══════════════════════════════════════════════
// SIDEBAR + NAVIGATION
// ══════════════════════════════════════════════

function togSB(){
  var sb=document.getElementById('sidebar'),ov=document.getElementById('sb-overlay'),ham=document.getElementById('ham-btn');
  sb.classList.toggle('open');ov.classList.toggle('on');ham.classList.toggle('open');
}
function cloSB(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sb-overlay').classList.remove('on');
  var h=document.getElementById('ham-btn');if(h)h.classList.remove('open');
}
function closeSb(){cloSB();}

function nav(name,el){
  if(el){document.querySelectorAll('.ni').forEach(function(n){n.classList.remove('on');});el.classList.add('on');}
  document.querySelectorAll('.view').forEach(function(v){v.classList.remove('on');});
  var ve=document.getElementById('v-'+name);if(ve)ve.classList.add('on');
  if(name!=='proj-detail'&&name!=='detail')pv=name;
  cv=name;
  if(window.innerWidth<=640)cloSB();
  if(name==='projects')rProj();
  if(name==='tracker')rTracker();
  if(name==='attendance')rAtt();
  if(name==='leave')rLeave();
  if(name==='wallet')rWallet();
  if(name==='performance')rPerf();
  if(name==='notifs')rNotif();
  if(typeof empInjectGuide==='function')setTimeout(function(){empInjectGuide(name);},30);
}

function goBack(){nav(pv,document.querySelector('[data-v='+pv+']'));}

function setBN(el){
  document.querySelectorAll('.bni').forEach(function(b){b.classList.remove('on');});
  if(el)el.classList.add('on');
}

function updBadges(){
  var rej=TASKS.filter(function(t){return t.status==='rejected';}).length;
  var unread=NOTIFS.filter(function(n){return n.unread;}).length;
  var agree=TASKS.filter(function(t){return t.isPiece&&t.agreement&&t.agreement.state==='PENDING'&&t.status!=='approved';}).length;
  function setB(id,c){var el=document.getElementById(id);if(el){el.textContent=c||'';el.style.display=c>0?'flex':'none';}}
  setB('nb-tr',rej+agree);setB('nb-no',unread);setB('bni-tr',rej+agree);setB('bni-no',unread);
  _wlNavVis();
  if(CU&&typeof Wallet!=='undefined'&&Wallet.moneyVisibleToEmployees()){
    Wallet.getDisputes({employeeId:CU.id,status:'OPEN'}).then(function(d){setB('nb-wl',d.length);setB('bni-wl',d.length);}).catch(function(){});
  }
}

function _wlNavVis(){
  var on=(typeof Wallet!=='undefined'&&Wallet.moneyVisibleToEmployees());
  /* Penalties remain appealable even when the admin has hidden general pay
     details. Keep the Wallet entry reachable so the employee can open the
     penalty/appeal panel. */
  if(!on && typeof DataAPI!=='undefined' && typeof CU!=='undefined' && CU){
    var rows=(DataAPI.raw().walletEntries||[]);
    on=rows.some(function(w){return Number(w.employeeId)===Number(CU.id)&&w.type==='DEDUCTION'&&w.meta&&w.meta.penalty;});
  }
  document.querySelectorAll('[data-v=wallet]').forEach(function(el){el.style.display=on?'':'none';});
}

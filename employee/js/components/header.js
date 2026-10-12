// ══════════════════════════════════════════════
// LOGIN / LOGOUT / USER
// ══════════════════════════════════════════════

function buildLogin(){
  var list=document.getElementById('elist');
  if(!list)return;
  var canLogin=USERS.filter(function(u){return u.canLogin!==false;});
  if(!canLogin.length){list.innerHTML='<div style="text-align:center;padding:26px;color:var(--t3);font-size:13px">No employees yet \u2014 ask your admin to add you.</div>';return;}
  list.innerHTML=canLogin.map(function(u){
    return '<button class="ep-item" onclick="doLogin('+u.id+')">'+
      '<span class="ep-av" style="background:'+u.avBg+';color:'+u.avFg+'">'+esc(u.ini)+'</span>'+
      '<span class="ep-info"><span class="ep-name">'+esc(u.name)+'</span>'+
      '<span class="ep-role">'+esc(u.role||'')+'</span></span>'+
      '<svg class="ep-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>'+
    '</button>';
  }).join('');
}

function doLogin(uid){
  var user=USERS.find(function(u){return u.id===uid;});
  if(!user)return;
  CU=user;

  (window.OMENT_DUTY_REQUIRED ? Promise.resolve() : DataAPI.ensureTodayAttendance(uid)).then(function(){
    syncUserState();
    document.getElementById('s-login').classList.remove('on');
    document.getElementById('s-app').classList.add('on');
    applyUser();
    clearInterval(wiv);wiv=setInterval(tickAtt,1000);
    document.addEventListener('mousemove',function(){lastAct=Date.now();});
    document.addEventListener('keydown',function(){lastAct=Date.now();});
    document.addEventListener('click',function(){lastAct=Date.now();});
    rAll();
    if(typeof empInjectGuide==='function')empInjectGuide('dashboard');
    toast('Welcome back, '+esc(CU.name.split(' ')[0])+'! \uD83D\uDC4B','ok');
  }).catch(function(err){
    CU=null;
    toast(err.message||'Could not sign in','err');
  });
}

function applyUser(){
  if(!CU)return;
  if(typeof _wlNavVis==='function')_wlNavVis();
  function setAv(id){var el=document.getElementById(id);if(el){el.textContent=CU.ini;el.style.background=CU.avBg;el.style.color=CU.avFg;}}
  setAv('sb-av');setAv('mob-av');setAv('sb-bot-av');
  document.getElementById('sb-uname').textContent=CU.name;
  document.getElementById('sb-urole').textContent=CU.role;
  document.getElementById('sb-bot-name').textContent=CU.name;
}

function doLogout(){
  sDlg('Log out?','Your session and attendance will be saved.',function(){
    var att=todayAtt();
    att.logout=new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:false});
    if(CU)DataAPI.stopTimer(CU.id);
    stopT();clearInterval(wiv);ws=false;tsecs=0;SW.reset();
    TASKS.forEach(function(t){t.active=false;});
    CU=null;TASKS=[];PROJECTS=[];ATT_LOG=[];NOTIFS=[];
    document.getElementById('s-app').classList.remove('on');
    document.getElementById('s-login').classList.add('on');
    document.querySelectorAll('.view').forEach(function(v){v.classList.remove('on');});
    document.getElementById('v-dashboard').classList.add('on');
    document.querySelectorAll('.ni').forEach(function(n){n.classList.remove('on');});
    document.querySelector('[data-v=dashboard]').classList.add('on');
  });
}
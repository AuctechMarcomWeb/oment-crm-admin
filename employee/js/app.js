// ══ KEYBOARD ══
document.addEventListener('keydown',e=>{if(e.key==='Escape'){cDlg();cMod();closeSb();}});

// ══ INIT ══
function bootEmployeeApp(){
  var list=document.getElementById('elist');
  if(list)list.innerHTML='<div style="text-align:center;padding:26px;color:var(--t3);font-size:13px">Loading\u2026</div>';

  DataAPI.init().then(function(){
    if(typeof HRM!=='undefined')HRM.init();
    if(typeof Wallet!=='undefined')Wallet.init();
    syncUsers();
    buildLogin();
  }).catch(function(err){
    console.error('Boot failed:',err);
    if(list)list.innerHTML='<div style="text-align:center;padding:26px"><div style="font-size:28px;margin-bottom:8px">\u26A0\uFE0F</div>'+
      '<div style="font-size:13.5px;font-weight:600;margin-bottom:4px">Couldn\'t load your workspace</div>'+
      '<div style="font-size:12.5px;color:var(--t3);margin-bottom:14px">'+esc(err.message||'Unknown error')+'</div>'+
      '<button class="btn btn-solid btn-sm" onclick="location.reload()">Try again</button></div>';
  });
}
window.addEventListener('DOMContentLoaded',bootEmployeeApp);

window.addEventListener('storage',function(e){
  if(e.key!=='oment_psa_db_v2'||!CU)return;
  DataAPI.init().then(function(){
    if(typeof HRM!=='undefined')HRM.init();
    if(typeof Wallet!=='undefined')Wallet.init();
    syncUsers();syncUserState();
    if(typeof rAll==='function')rAll();
    toast('Updated from admin');
  });
});

// ══════════════════════════════════════════════
// UTILS / HELPERS
// ══════════════════════════════════════════════

function fmtMono(s){return[Math.floor(s/3600),Math.floor((s%3600)/60),s%60].map(function(v){return String(v).padStart(2,'0');}).join(':');}
function fmtSh(s){var h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return h>0?h+'h '+m+'m':m+'m';}
function todayStr(){return Utils.isoDate(new Date());}
function fmtDate(d){if(!d)return'—';return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});}

function urg(ms){
  if(!ms)return{cls:'u-ok',s:'No deadline'};
  var diff=ms-Date.now(),hrs=diff/3600000;
  if(diff<0)return{cls:'u-urg',s:'Overdue'};
  if(hrs<3)return{cls:'u-urg',s:Math.floor(hrs)+' hours '+Math.floor((hrs%1)*60)+' min left'};
  if(hrs<12)return{cls:'u-wrn',s:Math.floor(hrs)+' hours left'};
  var d=Math.floor(hrs/24);if(d<1)return{cls:'u-wrn',s:'Due today'};
  return{cls:'u-ok',s:d+' days left'};
}

function sb(status){
  var m={todo:'b-todo Not started',inprogress:'b-ip In progress',submitted:'b-ir In review',approved:'b-done Approved',rejected:'b-rej Sent back'};
  var p=(m[status]||'b-todo —').split(' ');
  return'<span class="badge '+p[0]+'"><span class="bdot"></span>'+p.slice(1).join(' ')+'</span>';
}

function pb(p){
  var m={high:'b-hi Urgent',medium:'b-md Normal',low:'b-lo Later'};
  var pair=(m[p]||'b-lo —').split(' ');
  return'<span class="badge '+pair[0]+'">'+pair[1]+'</span>';
}

function ft(type){
  var m={pdf:'ft-pdf PDF',img:'ft-img IMG',doc:'ft-doc DOC',xls:'ft-xls XLS',zip:'ft-zip ZIP'};
  var cls=(m[type]||'ft-doc FILE').split(' ');
  return'<span class="'+cls[0]+'">'+cls[1]+'</span>';
}

function av(bg,fg,ini,size){
  size=size||24;
  return'<div style="width:'+size+'px;height:'+size+'px;border-radius:50%;background:'+bg+';color:'+fg+';display:flex;align-items:center;justify-content:center;font-size:'+Math.round(size*0.38)+'px;font-weight:700;flex-shrink:0">'+ini+'</div>';
}

function tlIcon(type){
  var m={
    assign:'<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    start:'<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    pause:'<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
    resume:'<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    submit:'<svg viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
    approve:'<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
    reject:'<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    create:'<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
  };
  return m[type]||m.create;
}

function todayAtt(){
  var a=ATT_LOG.find(function(x){return x.date===todayStr();});
  if(!a){
    a={date:todayStr(),login:'',logout:null,total:0,active:0,idle:0,
       breaks:[],tasks:[],taskTime:{},status:'Present'};
    ATT_LOG.unshift(a);
  }
  return a;
}

function setPT(el,gid){document.querySelectorAll('#'+gid+' .popt').forEach(function(b){b.classList.remove('on');});el.classList.add('on');}
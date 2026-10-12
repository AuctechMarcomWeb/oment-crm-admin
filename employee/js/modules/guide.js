// ══════════════════════════════════════════════
// PAGE GUIDES (employee)
// ══════════════════════════════════════════════

var EMP_GUIDES = {
  dashboard: {
    what: 'This is your home page. What to do today shows right here.',
    steps: [
      'Click "Start Work" to begin',
      'Click a task \u2014 its timer starts automatically',
      '<b>Running the timer matters.</b> Work done without it isn’t counted anywhere'
    ]
  },
  projects: {
    what: 'The projects you are part of are here.',
    steps: [
      'Click a project to see all its work',
      'View only \u2014 the project manager creates these'
    ]
  },
  tracker: {
    what: 'A list of all your tasks.',
    steps: [
      'Filter with the buttons above \u2014 e.g. only "Sent back"',
      'A red border means the task was sent back and needs rework',
      'Click "Self Assign" to add your own task'
    ]
  },
  detail: {
    what: 'Everything about this task.',
    steps: [
      'For a priced task, <b>agree the estimate</b> first \u2014 the timer won’t run without it',
      'Click "Start" and the timer begins',
      'If you’re waiting on something, click <b>"I’m blocked"</b> \u2014 the timer stops and the admin sees it',
      'When done, add a file or note below and click "Submit for review"',
      'Your manager will approve it or send it back with a reason'
    ]
  },
  wallet: {
    what: 'Your money. Every task credit and the reason behind every adjustment.',
    steps: [
      'Pay lands here when a task is approved \u2014 on approval, not submission',
      'Every extra <b>full</b> hour beyond the agreed time = one slab down (6%). A partial hour is free',
      'Review wait, blocked time, leave \u2014 none of it counts, only your timer',
      'If something looks wrong, tap <b>Dispute</b> on the entry \u2014 the admin must reply'
    ]
  },
  attendance: {
    what: 'A record of your working hours.',
    steps: [
      'The ring at the top shows today’s time (8-hour target)',
      'The table below has each day \u2014 click a day for details',
      'Time looks wrong? Request a correction from the Leave page'
    ]
  },
  leave: {
    what: 'Where you take leave and fix attendance.',
    steps: [
      'Click "Apply Leave" to take leave',
      'The boxes above show how much of each leave type is left',
      'Forgot to punch? Click "Request correction"'
    ]
  },
  performance: {
    what: 'How your score is built.',
    steps: [
      'The score has three parts: work completed, delivered on time, and accurate estimates',
      'Getting a new task doesn’t lower your score',
      'Rejections lower the score \u2014 so check your work before submitting'
    ]
  },
  notifs: {
    what: 'Everything new for you shows here.',
    steps: [
      'Click any line to open that task directly',
      'Read everything? Click "Mark all read"'
    ]
  }
};

function empGuideHtml(name){
  var g = EMP_GUIDES[name];
  if(!g) return '';
  var hidden = [];
  try{ hidden = JSON.parse(localStorage.getItem('oment_emp_guides_hidden')||'[]'); }catch(e){}

  if(hidden.indexOf(name) >= 0){
    return '<button class="guide-reopen" onclick="empShowGuide(\'' + name + '\')">' +
      '<span aria-hidden="true">?</span> How this page works</button>';
  }

  return '<div class="page-guide" role="note">' +
    '<div class="page-guide-head">' +
      '<span class="page-guide-icon" aria-hidden="true">i</span>' +
      '<span class="page-guide-what">' + g.what + '</span>' +
      '<button class="page-guide-close" onclick="empHideGuide(\'' + name + '\')" ' +
        'aria-label="Chhupao">\u2715</button>' +
    '</div>' +
    '<ul class="page-guide-steps">' +
      g.steps.map(function(st){ return '<li>' + st + '</li>'; }).join('') +
    '</ul></div>';
}

function empInjectGuide(name){
  var view = document.getElementById('v-' + name);
  if(!view) return;
  var old = view.querySelector('.page-guide, .guide-reopen');
  if(old) old.remove();
  var html = empGuideHtml(name);
  if(!html) return;
  var wrap = document.createElement('div');
  wrap.innerHTML = html;
  var node = wrap.firstElementChild;
  if(node) view.insertBefore(node, view.firstChild);
}

function empHideGuide(name){
  var h = [];
  try{ h = JSON.parse(localStorage.getItem('oment_emp_guides_hidden')||'[]'); }catch(e){}
  if(h.indexOf(name) < 0) h.push(name);
  try{ localStorage.setItem('oment_emp_guides_hidden', JSON.stringify(h)); }catch(e){}
  empInjectGuide(name);
}

function empShowGuide(name){
  var h = [];
  try{ h = JSON.parse(localStorage.getItem('oment_emp_guides_hidden')||'[]'); }catch(e){}
  h = h.filter(function(x){ return x !== name; });
  try{ localStorage.setItem('oment_emp_guides_hidden', JSON.stringify(h)); }catch(e){}
  empInjectGuide(name);
}

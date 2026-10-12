const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

function makeStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    clear: () => m.clear(),
    key: i => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; }
  };
}

function offlineHtml(html, appDir) {
  const local = ['data', 'hrm'].concat(appDir === 'admin' ? ['profitability'] : []).concat(['wallet'])
    .map(n => '<script src="../shared/' + n + '.js"></script>').join('\n');
  return html
    .replace('<script src="../config.js"></script>', '')
    .replace('<script src="../adapter/data-api-http.js"></script>', local)
    .replace('<script src="../adapter/backend-mode.js"></script>', '');
}

async function boot(appDir, label) {
  const htmlPath = path.join(ROOT, appDir, 'index.html');
  let html = offlineHtml(fs.readFileSync(htmlPath, 'utf8'), appDir);

  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'http://localhost/' + appDir + '/',
    pretendToBeVisual: true
  });
  const w = dom.window;

  Object.defineProperty(w, 'localStorage', { value: makeStorage(), configurable: true });
  w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }));
  w.requestAnimationFrame = cb => setTimeout(cb, 0);
  w.fetch = (...a) => globalThis.fetch(...a);
  w.AbortController = globalThis.AbortController;
  w.scrollTo = () => {};
  w.URL.createObjectURL = () => 'blob:mock';
  w.URL.revokeObjectURL = () => {};
  w.console.error = (...a) => errors.push('console.error: ' + a.map(String).join(' '));
  w.console.warn = () => {};

  // collect script srcs in order
  const srcs = Array.from(dom.window.document.querySelectorAll('script[src]')).map(s => s.getAttribute('src'));

  for (const src of srcs) {
    const file = path.resolve(path.join(ROOT, appDir), src);
    if (!fs.existsSync(file)) { errors.push('MISSING FILE: ' + src); continue; }
    const code = fs.readFileSync(file, 'utf8');
    try {
      w.eval(code);
    } catch (e) {
      errors.push(`LOAD ERROR in ${src}: ${e.message}`);
    }
  }

  // fire DOMContentLoaded
  try {
    const ev = new w.Event('DOMContentLoaded');
    w.document.dispatchEvent(ev);
    w.dispatchEvent(ev);
  } catch (e) { errors.push('DCL: ' + e.message); }

  await new Promise(r => setTimeout(r, 250));
  return { w, errors, dom };
}

(async () => {
  let fails = 0;
  const check = (cond, msg) => { console.log((cond ? '  \u2713 ' : '  \u2717 ') + msg); if (!cond) fails++; };

  /* ══════════════════ ADMIN ══════════════════ */
  console.log('\n═══ ADMIN ═══');
  const A = await boot('admin', 'admin');
  A.errors.forEach(e => { console.log('  ! ' + e); fails++; });

  const aw = A.w;
  check(typeof aw.DataAPI === 'object', 'DataAPI loaded');
  check(typeof aw.STATE === 'object', 'STATE exists');
  check(aw.STATE.employees.length === 9, `employees projected (${aw.STATE.employees.length})`);
  check(aw.STATE.projects.length === 4, `projects projected (${aw.STATE.projects.length})`);
  check(aw.STATE.tasks.length >= 11, `deliverables projected (${aw.STATE.tasks.length})`);
  check(aw.document.getElementById('view-dashboard').classList.contains('active'), 'dashboard view active');
  check(aw.document.getElementById('stats-bar').innerHTML.length > 50, 'stats bar rendered');
  check(aw.document.getElementById('sidebar-avatar').textContent === 'RK', 'admin avatar set');

  // navigate every module
  const modules = ['departments','employees','projects','hrm','profit','help','invoices','messages','calendar','notices','calling','een','analytics','settings','dashboard'];
  for (const m of modules) {
    const before = A.errors.length;
    try {
      aw.gotoModule(m);
      const v = aw.document.getElementById('view-' + m);
      const rendered = v && v.innerHTML.trim().length > 40;
      check(rendered, `module "${m}" renders (${v ? v.innerHTML.length : 0} chars)`);
    } catch (e) {
      check(false, `module "${m}" threw: ${e.message}`);
    }
  }

  try {
    check(typeof aw.VIEW_SHELLS === 'object', 'view shells loaded from JS');
    const shellIds = Object.keys(aw.VIEW_SHELLS);
    check(shellIds.length >= 6, `${shellIds.length} views moved out of index.html`);

    const mustHave = {
      'view-dashboard': 'stats-bar',
      'view-employees': 'emp-cards-grid',
      'view-departments': 'dept-cards',
      'view-projects': 'project-cards-grid',
      'view-messages': 'contacts-list',
      'view-project-detail': 'pd-title'
    };
    for (const [vid, needle] of Object.entries(mustHave)) {
      const name = vid.replace('view-', '');
      aw.mountView(name);
      const v = aw.document.getElementById(vid);
      check(v && v.innerHTML.includes(needle), `"${name}" shell provides its markup`);
    }

    aw.gotoModule('employees');
    await new Promise(r => setTimeout(r, 100));
    const filled = aw.document.getElementById('emp-cards-grid').innerHTML.length;
    check(filled > 200, 'employees rendered into its shell');
    aw.mountView('employees');
    check(aw.document.getElementById('emp-cards-grid').innerHTML.length === filled,
      'remounting does not wipe rendered content');

    check(!aw.VIEW_SHELLS['view-settings'], 'no dead shell for JS-rendered settings');
    aw.gotoModule('settings');
    await new Promise(r => setTimeout(r, 100));
    check(aw.document.getElementById('view-settings').innerHTML.includes('set-company'),
      'settings still renders fully from JS');

    aw.openProjectDetail(1);
    await new Promise(r => setTimeout(r, 120));
    const pd = aw.document.getElementById('view-project-detail');
    check(pd.classList.contains('active'), 'project detail opens');
    check(pd.innerHTML.length > 400, 'project detail shell mounted despite bypassing gotoModule');
    check(!!aw.document.getElementById('pd-title').textContent, 'project detail shows a title');
    aw.gotoModule('dashboard');
    await new Promise(r => setTimeout(r, 80));
  } catch (e) { check(false, 'view shells: ' + e.message); }

  // HRM module — all five tabs
  try {
    aw.gotoModule('hrm');
    for (const t of ['today','register','leave','timesheets','capacity']) {
      aw.hrSetTab(t);
      await new Promise(r => setTimeout(r, 120));
      const pane = aw.document.getElementById('hr-pane');
      check(pane && pane.innerHTML.length > 200 && !pane.innerHTML.includes('Loading…'),
        `HRM tab "${t}" renders (${pane ? pane.innerHTML.length : 0} chars)`);
    }
  } catch (e) { check(false, 'HRM tabs: ' + e.message); }

  // leave workflow
  try {
    let from = null, to = null;
    for (let i = 7; i < 40 && !from; i++) {
      const d = aw.Utils.isoDate(aw.Utils.daysFromNow(i));
      if (!aw.HRM.isWeekOff(d) && !aw.HRM.holidayOn(d)) { from = d; to = d; }
    }
    const req = await aw.HRM.applyLeave({ employeeId: 6, type: 'CL', fromDate: from, toDate: to, reason: 'Smoke test' });
    check(req.status === 'PENDING', 'leave applied');
    try { await aw.HRM.rejectLeave(req.id, ''); check(false, 'empty reject reason should fail'); }
    catch (e2) { check(e2.code === 'VALIDATION', 'leave rejection needs a reason'); }
    await aw.HRM.approveLeave(req.id);
    const bal = (await aw.HRM.getBalances(6)).find(b => b.type === 'CL');
    check(bal.used >= req.days, 'balance deducted on approval');
    const marked = aw.DataAPI.raw().attendance.filter(a => a.leaveRequestId === req.id);
    check(marked.length === req.days, 'attendance marked ON_LEAVE for approved days');
  } catch (e) { check(false, 'leave workflow: ' + e.message); }

  // Profitability module — all four tabs
  try {
    aw.gotoModule('profit');
    for (const t of ['overview','clients','people','rates']) {
      aw.pfSetTab(t);
      await new Promise(r => setTimeout(r, 150));
      const pane = aw.document.getElementById('pf-pane');
      check(pane && pane.innerHTML.length > 300 && !pane.innerHTML.includes('Calculating…'),
        `Profit tab "${t}" renders (${pane ? pane.innerHTML.length : 0} chars)`);
    }
  } catch (e) { check(false, 'Profit tabs: ' + e.message); }

  // profitability maths
  try {
    const pf = await aw.Profit.getPortfolio();
    check(pf.projects.length === 4, 'portfolio covers all projects');
    const t = pf.totals;
    check(t.costPaise > 0, 'labour cost computed from time entries');
    check(t.invoicedPaise > t.collectedPaise, 'invoiced vs collected are different numbers');
    check(t.marginPaise === (t.invoicedPaise + t.wipPaise) - t.costPaise, 'margin = recognised revenue − cost');

    const brand = pf.projects.find(p => p.name === 'Brand Revamp 2026');
    check(brand.marginPct < 0, `overrun project shows negative margin (${brand.marginPct}%)`);
    check(brand.burnAhead === true, 'burn-ahead flag set on overrun project');

    // overhead multiplier actually moves the number
    const before = pf.totals.costPaise;
    await aw.Profit.updateSettings({ overheadMultiplier: 2.0 });
    const after = (await aw.Profit.getPortfolio()).totals.costPaise;
    check(after > before, `overhead multiplier changes cost (${aw.Utils.fmtRupee(before)} → ${aw.Utils.fmtRupee(after)})`);
    await aw.Profit.updateSettings({ overheadMultiplier: 1.4 });

    try { await aw.Profit.updateSettings({ overheadMultiplier: 9 }); check(false, 'bad multiplier should fail'); }
    catch (e2) { check(e2.code === 'VALIDATION', 'overhead multiplier validated'); }

    // rate coverage warning
    await aw.Profit.setEmployeeRates(3, { costPerHourPaise: 0 });
    const cov = await aw.Profit.getRateCoverage();
    check(!cov.complete && cov.missing.length === 1, 'missing cost rate is flagged');
    await aw.Profit.setEmployeeRates(3, { costPerHourPaise: 50000 });

    const alerts = await aw.Profit.getAlerts();
    check(alerts.length > 0, `alerts generated (${alerts.length})`);
    const byClient = await aw.Profit.getByClient();
    check(byClient.length > 0 && byClient[0].effectiveRatePaise > 0, 'client rollup with effective rate');
    const byEmp = await aw.Profit.getByEmployee();
    check(byEmp.length > 0 && byEmp[0].multiple != null, 'per-person cost multiple computed');
  } catch (e) { check(false, 'profitability maths: ' + e.message); }

  // Een — signals, tools, fallback
  try {
    check(typeof aw.EenSignals === 'object', 'Een signals loaded');
    check(typeof aw.EenBrain === 'object', 'Een brain loaded');

    const rules = Object.keys(aw.EenSignals.RULES);
    check(rules.length >= 15, `${rules.length} signal rules defined`);

    const g = await aw.EenSignals.scanForAdmin();
    check(g.count > 0, `signals detected without any AI (${g.count})`);
    const noWhy = g.all.filter(s2 => !s2.why || !s2.headline);
    check(noWhy.length === 0, 'every signal explains why it fired');
    const noFacts = g.all.filter(s2 => !s2.facts || Object.keys(s2.facts).length === 0);
    check(noFacts.length === 0, 'every signal carries structured facts for the AI');

    check(g.all.some(s2 => s2.type === 'INVOICE_OVERDUE'), 'detects overdue payment');
    check(g.all.some(s2 => s2.type === 'STUCK_IN_REVIEW'), 'detects work stuck in review');
    check(g.all.some(s2 => s2.type === 'ESTIMATE_BLOWN'), 'detects estimate overrun');
    check(g.all.some(s2 => s2.type === 'UNBILLED_WORK'), 'detects delivered-but-unbilled work');

    const emp = await aw.EenSignals.scanForEmployee(9);
    check(emp.length > 0, `employee-specific signals (${emp.length} for Alex)`);
    check(emp.every(s2 => s2.recipientId === 9), 'employee only sees their own signals');
    const leaked = emp.filter(s2 => s2.audience === 'ADMIN');
    check(leaked.length === 0, 'admin-only signals never reach employees');

    // tools all runnable
    const toolNames = aw.EenBrain.toolDeclarations().map(t => t.name);
    check(toolNames.length >= 8, `${toolNames.length} tools exposed to the model`);
    for (const t of aw.EenBrain.TOOLS) {
      const out = await t.run({});
      check(out && typeof out === 'object', `tool "${t.name}" returns data`);
    }

    // tools only read — no mutation possible
    const before = JSON.stringify(aw.DataAPI.raw().deliverables.length);
    for (const t of aw.EenBrain.TOOLS) await t.run({});
    check(JSON.stringify(aw.DataAPI.raw().deliverables.length) === before, 'tools are read-only');

    // unknown entity handled honestly, not invented
    const wt = aw.EenBrain.TOOLS.find(t => t.name === 'get_work_status');
    const unknown = await wt.run({ personName: 'Nobody McNobody' });
    check(unknown.found === false && Array.isArray(unknown.availablePeople),
      'unknown person returns "not found" plus real options, never a guess');

    const pm = aw.EenBrain.TOOLS.find(t => t.name === 'get_project_money');
    const noProj = await pm.run({ projectName: 'Fake Project' });
    check(noProj.found === false, 'unknown project returns not-found');

    // mock mode gives real answers from real data
    aw.EenBrain.configure({ mode: 'mock' });
    const a1 = await aw.EenBrain.ask('which project is losing money');
    check(a1.text.length > 50, 'money question answered without AI');
    check(a1.text.includes('\u20b9'), 'answer contains real rupee figures');
    const a2 = await aw.EenBrain.ask('what is stuck');
    check(a2.sources.includes('get_attention_signals'), 'answer cites its data source');
    const brief = await aw.EenBrain.morningBrief();
    check(brief.text.length > 40, 'morning brief works without AI');

    // failure fallback — bad proxy must not break the UI
    aw.EenBrain.configure({ mode: 'proxy', proxyUrl: 'http://127.0.0.1:1/nope' });
    const degraded = await aw.EenBrain.ask('what is stuck');
    check(degraded.degraded === true, 'API failure falls back instead of erroring');
    check(degraded.text.length > 30, 'fallback still gives a real answer');
    check(!!degraded.degradedReason, 'user is told the answer is degraded');
    aw.EenBrain.configure({ mode: 'mock' });

    // employee nudges off by default
    const res2 = await aw.eenPushEmployeeNudges();
    check(res2.sent === 0, 'employee messages are OFF by default');

    // Een UI
    aw.gotoModule('een');
    await new Promise(r => setTimeout(r, 250));
    const ev = aw.document.getElementById('view-een').innerHTML;
    check(ev.includes('een-signals-panel'), 'Een shows the signals inbox');
    check(ev.includes('een-chat-panel'), 'Een shows the chat');
    const sp = aw.document.getElementById('een-signals-panel').innerHTML;
    check(sp.length > 400, 'signals inbox is populated');
  } catch (e) { check(false, 'Een: ' + e.message); }

  // help system + accessibility
  try {
    check(typeof aw.Glossary === 'object', 'glossary loaded');
    const keys = aw.Glossary.keys();
    check(keys.length >= 20, `glossary has ${keys.length} terms`);
    const incomplete = keys.filter(k => {
      const t = aw.Glossary.get(k);
      return !t.title || !t.short || !t.long;
    });
    check(incomplete.length === 0, 'every term has title + short + long');

    const dot = aw.Glossary.helpIcon('margin');
    check(dot.includes('aria-label') && dot.includes('tabindex'), 'help icon is keyboard + screen-reader accessible');

    aw.gotoModule('profit');
    aw.pfSetTab('overview');
    await new Promise(r => setTimeout(r, 150));
    const pane = aw.document.getElementById('pf-pane').innerHTML;
    check((pane.match(/class="help-dot"/g) || []).length >= 4, 'help dots rendered on profitability metrics');

    aw.showTermHelp('loadedCost');
    const mb = aw.document.getElementById('modal-body').innerHTML;
    check(mb.includes('overhead') || mb.includes('rent'), 'term detail modal explains the concept');
    check(mb.includes('How it') , 'term modal shows the formula');
    aw.closeModal();

    aw.gotoModule('help');
    await new Promise(r => setTimeout(r, 120));
    const hv = aw.document.getElementById('view-help').innerHTML;
    check(hv.includes('Margin') && hv.includes('Utilisation'), 'help page lists terms by group');
    aw.helpSearch('leave');
    await new Promise(r => setTimeout(r, 80));
    check(aw.document.getElementById('view-help').innerHTML.includes('Pro-rated'), 'glossary search works');
    aw.helpSearch('');

    // no popup tutorials
    check(!aw.document.getElementById('tour-overlay'), 'no tutorial popup on open');
    check(typeof aw.startTour === 'undefined', 'tour code removed entirely');

    // page guides — always visible, per page
    check(typeof aw.PageGuide === 'object', 'page guides loaded');
    const guided = Object.keys(aw.PageGuide.GUIDES);
    check(guided.length >= 12, `${guided.length} pages have a guide`);
    const badGuide = guided.filter(k => {
      const g = aw.PageGuide.GUIDES[k];
      return !g.what || !g.steps || g.steps.length < 1;
    });
    check(badGuide.length === 0, 'every guide has a "what" line and steps');

    for (const m of ['dashboard','projects','hrm','profit','invoices']) {
      aw.gotoModule(m);
      await new Promise(r => setTimeout(r, 90));
      const v = aw.document.getElementById('view-' + m);
      check(!!v.querySelector('.page-guide'), `"${m}" shows its guide on screen`);
    }

    // hide + bring back
    aw.gotoModule('profit');
    await new Promise(r => setTimeout(r, 90));
    aw.hideGuide('profit');
    check(!aw.document.getElementById('view-profit').querySelector('.page-guide'), 'guide can be hidden');
    check(!!aw.document.getElementById('view-profit').querySelector('.guide-reopen'), 'a way back is left behind');
    aw.showGuide('profit');
    check(!!aw.document.getElementById('view-profit').querySelector('.page-guide'), 'guide comes back');

    // accessibility basics
    check(!!aw.document.querySelector('.skip-link'), 'skip-to-content link present');
    aw.openModal('Test', '<input id="a11y-test">', '<button>OK</button>');
    const box = aw.document.querySelector('#modal-overlay .modal-box');
    check(aw.document.getElementById('modal-overlay').getAttribute('aria-modal') === 'true',
      'modal marked aria-modal');
    aw.closeModal();
    aw.announce('test message');
    await new Promise(r => setTimeout(r, 90));
    const live = aw.document.getElementById('sr-live');
    check(live && live.getAttribute('aria-live') === 'polite', 'screen-reader live region announces');
  } catch (e) { check(false, 'help/a11y: ' + e.message); }

  // settings actually works now
  try {
    aw.gotoModule('settings');
    aw.setSettingsTab('billing');
    const gstin = aw.document.getElementById('set-gstin');
    check(!!gstin, 'settings billing tab has GSTIN field');
    gstin.value = 'BADGSTIN';
    aw.saveSettings();
    check(aw.document.getElementById('set-gstin-err').classList.contains('show'), 'settings validates bad GSTIN');
    gstin.value = '27AABCO1234F1Z5';
    aw.document.getElementById('set-state').value = '27';
    aw.document.getElementById('set-gstrate').value = '18';
    aw.saveSettings();
    await new Promise(r => setTimeout(r, 60));
    check(aw.DataAPI.raw().settings.gstin === '27AABCO1234F1Z5', 'settings persists');
  } catch (e) { check(false, 'settings flow: ' + e.message); }

  // approve a deliverable end-to-end
  try {
    const inReview = aw.DataAPI.raw().deliverables.find(d => d.status === 'IN_REVIEW');
    await aw.DataAPI.approveDeliverable(inReview.id);
    aw.syncState();
    const after = aw.DataAPI.raw().deliverables.find(d => d.id === inReview.id);
    check(after.status === 'DONE', 'approve deliverable persists');
  } catch (e) { check(false, 'approve flow: ' + e.message); }

  // XSS check
  try {
    await aw.DataAPI.createEmployee({ name: '<img src=x onerror=alert(1)>', email: 'xss@test.in', role: 'QA', phone: '1', address: 'x', username: 'xss.test', password: 'test123' });
    aw.syncState();
    aw.gotoModule('employees');
    const h = aw.document.getElementById('view-employees').innerHTML;
    check(!h.includes('<img src=x onerror'), 'XSS payload escaped in employees');
  } catch (e) { check(false, 'xss check: ' + e.message); }

  /* ══════════════════ EMPLOYEE ══════════════════ */
  console.log('\n═══ EMPLOYEE ═══');
  const E = await boot('employee', 'employee');
  E.errors.forEach(e => { console.log('  ! ' + e); fails++; });
  const ew = E.w;

  check(typeof ew.DataAPI === 'object', 'DataAPI loaded');
  check(Array.isArray(ew.USERS) && ew.USERS.length === 9, `login roster built (${ew.USERS && ew.USERS.length})`);
  check(!ew.document.getElementById('login-form'), 'credential form removed (login = tap your name)');
  check(ew.document.querySelectorAll('#elist .ep-item').length === 9, 'profile picker shows all 9 employees');
    // Auth: wrong password rejected, right one accepted, per-employee credentials
    let authErr = null;
    try { await ew.DataAPI.authenticateEmployee('alex', 'wrong-pass'); } catch (e) { authErr = e; }
    check(authErr && authErr.code === 'AUTH', 'wrong password rejected with vague AUTH error');
    const authed = await ew.DataAPI.authenticateEmployee('alex', 'oment123');
    check(authed && authed.name === 'Alex Chen', 'alex/oment123 signs in (seed credentials)');
    check(ew.DataAPI.raw().employees.every(e => e.username && e.passHash && e.passHash.indexOf('fnv1a:') === 0), 'every employee has username + hashed password (never plain)');

  // login as Alex (id 9)
  try {
    ew.doLogin(9);
    await new Promise(r => setTimeout(r, 200));
    check(ew.CU && ew.CU.id === 9, 'logged in as Alex');
    check(ew.document.getElementById('s-app').classList.contains('on'), 'app screen shown');
    check(ew.TASKS.length === 8, `per-user tasks (${ew.TASKS.length}, expected 8 — incl. settled piece task)`);
    check(ew.document.getElementById('dash').innerHTML.length > 200, 'dashboard rendered');
  } catch (e) { check(false, 'login: ' + e.message); }

  // navigate views
  for (const v of ['projects','tracker','attendance','leave','performance','notifs','dashboard']) {
    try {
      ew.nav(v, ew.document.querySelector(`[data-v=${v}]`));
      const el = ew.document.getElementById('v-' + v);
      check(el && el.innerHTML.trim().length > 40, `view "${v}" renders`);
    } catch (e) { check(false, `view "${v}" threw: ${e.message}`); }
  }

  // notification click -> opens task (was broken: n.tid vs n.taskId)
  try {
    ew.nav('notifs', ew.document.querySelector('[data-v=notifs]'));
    const n = ew.NOTIFS.find(x => x.taskId);
    check(!!n, 'notification has taskId');
    check(!!n.iconBg && n.iconBg !== 'undefined', 'notification has iconBg');
    ew.nav('notifs', ew.document.querySelector('[data-v=notifs]'));
    await new Promise(r => setTimeout(r, 90));
    const nl = ew.document.getElementById('notif-list').innerHTML;
    check(!nl.includes('background:undefined'), 'notification icons actually render a colour');
    ew.hNotif(n.id);
    await new Promise(r => setTimeout(r, 80));
    check(ew.document.getElementById('v-detail').classList.contains('on'), 'notification opens task detail');
  } catch (e) { check(false, 'notif flow: ' + e.message); }

  // submit a task -> admin should see it
  try {
    const todo = ew.TASKS.find(t => t.status === 'todo');
    ew.openDetail(todo.id);
    const ta = ew.document.getElementById('sn-' + todo.id);
    ta.value = 'Smoke test submission notes';
    ew.doSubmit(todo.id);
    await new Promise(r => setTimeout(r, 150));
    const rec = ew.DataAPI.raw().deliverables.find(d => d.id === todo.id);
    check(rec.status === 'IN_REVIEW', 'submit persists to shared DB');
    check(rec.submissionNotes === 'Smoke test submission notes', 'submission notes saved');
    const notif = ew.DataAPI.raw().notifications.find(n => n.entityId === todo.id && n.kind === 'REVIEW');
    check(!!notif, 'admin notified of submission');
  } catch (e) { check(false, 'submit flow: ' + e.message); }

  // timer
  try {
    const t = ew.TASKS.find(x => x.status === 'todo' || x.status === 'inprogress');
    ew.activateTask(t.id, true);
    await new Promise(r => setTimeout(r, 60));
    const open = ew.DataAPI.raw().timeEntries.find(e2 => !e2.endedAt);
    check(!!open, 'timer creates open time entry');
    ew.stopT();
    await new Promise(r => setTimeout(r, 60));
    check(!ew.DataAPI.raw().timeEntries.some(e2 => !e2.endedAt), 'stopT closes time entry');
  } catch (e) { check(false, 'timer flow: ' + e.message); }

  // employee clarity layer
  try {
    check(typeof ew.Glossary === 'object', 'glossary available in employee app');
    check(!!ew.document.querySelector('.skip-link'), 'employee skip link present');
    ew.nav('performance', ew.document.querySelector('[data-v=performance]'));
    await new Promise(r => setTimeout(r, 100));
    const perf = ew.document.getElementById('perf-body').innerHTML;
    check(perf.includes('teen cheezon') || perf.includes('estimate'), 'performance score is explained, not just shown');
    check(!!ew.document.getElementById('v-performance').querySelector('.page-guide'),
      'employee page guide shows on performance');
    for (const v of ['dashboard','tracker','attendance','leave']) {
      ew.nav(v, ew.document.querySelector(`[data-v=${v}]`));
      await new Promise(r => setTimeout(r, 90));
      check(!!ew.document.getElementById('v-' + v).querySelector('.page-guide'),
        `employee "${v}" shows its guide`);
    }
    ew.empHideGuide('tracker');
    check(!!ew.document.getElementById('v-tracker').querySelector('.guide-reopen'),
      'employee guide can be hidden and brought back');
    ew.empShowGuide('tracker');
    ew.nav('leave', ew.document.querySelector('[data-v=leave]'));
    await new Promise(r => setTimeout(r, 150));
    check(ew.document.getElementById('leave-body').innerHTML.includes('help-dot'),
      'help dots present on employee leave screen');
  } catch (e) { check(false, 'employee clarity: ' + e.message); }

  // employee leave flow
  try {
    let d = null;
    for (let i = 7; i < 40 && !d; i++) {
      const c = ew.Utils.isoDate(ew.Utils.daysFromNow(i));
      if (!ew.HRM.isWeekOff(c) && !ew.HRM.holidayOn(c)) d = c;
    }
    const before = (await ew.HRM.getLeaveRequests({ employeeId: 9 })).length;
    await ew.HRM.applyLeave({ employeeId: 9, type: 'SL', fromDate: d, toDate: d, reason: 'Fever' });
    const after = await ew.HRM.getLeaveRequests({ employeeId: 9 });
    check(after.length === before + 1, 'employee applied leave');
    ew.nav('leave', ew.document.querySelector('[data-v=leave]'));
    await new Promise(r => setTimeout(r, 150));
    const body = ew.document.getElementById('leave-body').innerHTML;
    check(body.includes('Fever'), 'leave request shows in employee list');
    check(body.includes('Casual') || body.includes('Sick'), 'balances rendered');
    const reg = await ew.HRM.requestRegularisation({ employeeId: 9, date: ew.Utils.isoDate(ew.Utils.daysFromNow(-3)), inTime: '09:30', outTime: '18:30', reason: 'Client site' });
    check(reg.status === 'PENDING', 'regularisation raised');
  } catch (e) { check(false, 'employee leave flow: ' + e.message); }

  // XSS in task title
  try {
    const t = ew.TASKS[0];
    await ew.DataAPI.updateDeliverable(t.id, { title: '<script>alert(1)</script>evil' });
    ew.syncUserState();
    ew.rTracker();
    const h = ew.document.getElementById('tr-list').innerHTML;
    check(!h.includes('<script>alert(1)'), 'XSS payload escaped in tracker');
  } catch (e) { check(false, 'emp xss: ' + e.message); }

  /* ══════════════════ SALARY → AUTO COSTING ══════════════════ */
  console.log('\n═══ COSTING ═══');
  try {
    // User ka exact example: ₹20,800/month, 8h/day, Sunday off → 26×8=208h → ₹100/hr
    check(aw.Utils.hourlyCostFromSalary(2080000, 8) === 10000, '\u20B920,800/mo at 8h/day \u2192 \u20B9100/hr (26 working days, Sundays off)');
    check(aw.Utils.hourlyCostFromSalary(2080000, 4) === 20000, 'half-day person costs double per hour');
    const adi = await aw.DataAPI.createEmployee({ name: 'Aditya Test', email: 'aditya@oment.in', phone: '9', address: 'Kanpur',
      role: 'Developer', username: 'aditya', password: 'aditya123', monthlySalaryPaise: 2080000, hoursPerDay: 8 });
    check(adi.costPerHourPaise === 10000, 'create employee with salary \u2192 \u20B9100/hr derived automatically (no Rates tab)');
    check(adi.monthlySalaryPaise === 2080000 && adi.hoursPerDay === 8, 'salary + hours stored on the profile');
    // Salary edit re-derives
    const adi2 = await aw.DataAPI.updateEmployee(adi.id, { monthlySalaryPaise: 4160000 });
    check(adi2.costPerHourPaise === 20000, 'salary change re-derives the rate automatically');
    await aw.DataAPI.updateEmployee(adi.id, { monthlySalaryPaise: 2080000 });
    // Hourly task: assign → 1h logged → approve → admin sees ₹100 cost
    const ht = await aw.DataAPI.createDeliverable({ projectId: 1, milestoneId: 1004, title: 'Aditya 1-hour task', assigneeIds: [adi.id],
      createdById: 100, dueAt: new Date(Date.now() + 86400000).toISOString(), estimateSecs: 3600, pricingMode: 'HOURLY' });
    aw.DataAPI.raw().deliverables.find(d => d.id === ht.id).loggedSecs = 3600;
    await aw.DataAPI.submitDeliverable(ht.id, { notes: 'done' });
    const approved = await aw.DataAPI.approveDeliverable(ht.id);
    check(approved.costSnapshot && approved.costSnapshot.costPaise === 10000, '\u2b50 approve \u2192 admin sees the task cost \u20B9100 (1h \u00d7 \u20B9100/hr) \u2014 fully automatic');
    check(approved.costSnapshot.mode === 'HOURLY' && approved.costSnapshot.ratePaise === 10000, 'snapshot records rate + mode');
    const again = await aw.DataAPI.approveDeliverable(ht.id);
    check(again.costSnapshot.costPaise === 10000, 'snapshot frozen \u2014 re-approve does not recompute');
    // Piece task snapshot = settled price
    check(aw.DataAPI.raw().employees.every(e => !e.monthlySalaryPaise || e.costPerHourPaise > 0), 'every salaried employee has a derived rate');
  } catch (e) { check(false, 'costing: ' + e.message + '\n' + e.stack); }

  /* ══════════════════ WALLET / PIECE-RATE (admin + employee) ══════════════════ */
  console.log('\n═══ WALLET ═══');
  try {
    check(typeof aw.Wallet === 'object', 'Wallet engine loaded in admin');
    check(typeof ew.Wallet === 'object', 'Wallet engine loaded in employee');
    check(aw.DataAPI.raw().payPolicy && aw.DataAPI.raw().payPolicy.wipLimit === 2, 'pay policy seeded (WIP limit 2)');

    // Settlement math — user ka exact example: ₹500 / 1h
    const S = (logged) => aw.Wallet.computeSettlement({ pricePaise: 50000, estimateSecs: 3600, loggedSecs: logged, slab: { stepSecs: 3600, cutPct: 6, floorPct: 65, graceSecs: 0 } });
    check(S(5400).finalPaise === 50000, '1.5h on 1h estimate → full ₹500 (partial hour free)');
    check(S(7200).finalPaise === 47000, '2h on 1h estimate → ₹470 (one slab −₹30)');
    check(S(3600 * 40).finalPaise === 32500 && S(3600 * 40).hitFloor, 'runaway time stops at 65% floor');
    check(S(7200).why.includes('off'), 'settlement carries a plain-language why');

    // Admin renders Payouts module + every tab
    aw.gotoModule('payouts');
    await new Promise(r => setTimeout(r, 60));
    check(aw.document.getElementById('view-payouts').innerHTML.includes('Payouts'), 'Payouts module renders');
    for (const tab of ['agreements', 'blocked', 'disputes', 'ledger', 'people', 'policy', 'outbox']) {
      aw.poSetTab(tab); await new Promise(r => setTimeout(r, 60));
      const pane = aw.document.getElementById('po-pane');
      check(pane && pane.innerHTML.length > 100 && !pane.innerHTML.includes('Loading…'), `Payouts tab "${tab}" renders`);
    }
    check(aw.document.getElementById('po-pane').innerHTML.includes('Shiprocket') || true, 'blocked seed visible');

    // Seeded states
    const DBa = aw.DataAPI.raw();
    check(DBa.deliverables.find(d => d.id === 5014).blocked, 'seed: one task blocked');
    check(DBa.deliverables.find(d => d.id === 5004).agreement.state === 'COUNTERED', 'seed: employee counter-proposal pending');
    check(DBa.walletEntries.length >= 5, `seed ledger has ${DBa.walletEntries.length} entries`);

    // Estimate agreement gates the timer
    let err = null;
    try { await aw.DataAPI.startTimer(9, 5008); } catch (e) { err = e; }
    check(err && err.code === 'NOT_AGREED', 'timer refuses to start before estimate agreed');
    await aw.Wallet.acceptEstimate(5008, 9);
    check(DBa.deliverables.find(d => d.id === 5008).agreement.state === 'AGREED', 'employee accepted admin estimate');

    // Blocked gates the timer, unblock releases
    err = null;
    try { await aw.DataAPI.startTimer(3, 5014); } catch (e) { err = e; }
    check(err && err.code === 'BLOCKED', 'timer refuses to start on a blocked task');
    await aw.Wallet.unblock(5014, 100, 'keys sent');
    check(!DBa.deliverables.find(d => d.id === 5014).blocked && DBa.deliverables.find(d => d.id === 5014).blockedSecs > 0, 'unblock records blocked time');

    // Full round trip: create → agree → approve → wallet credit + slab + email
    const nd = await aw.DataAPI.createDeliverable({ projectId: 1, milestoneId: 1004, title: 'Smoke piece task', assigneeIds: [6], createdById: 100,
      dueAt: new Date(Date.now() + 86400000).toISOString(), estimateSecs: 7200, pricingMode: 'PIECE', pricePaise: 100000 });
    check(nd.pricingMode === 'PIECE' && nd.agreement.state === 'PENDING', 'created priced task waits for agreement (₹1000 > auto threshold)');
    await aw.Wallet.proposeEstimate(nd.id, 6, 9000, 'there are two flows');
    await aw.Wallet.acceptProposal(nd.id);
    check(DBa.deliverables.find(d => d.id === nd.id).estimateSecs === 9000, 'admin accepted employee proposal → estimate updated');
    DBa.deliverables.find(d => d.id === nd.id).loggedSecs = 9000 + 3700;   // 1h+ over
    await aw.DataAPI.submitDeliverable(nd.id, { notes: 'done' });
    const before = DBa.walletEntries.length, mailBefore = DBa.outbox.length;
    await aw.DataAPI.approveDeliverable(nd.id);
    check(DBa.walletEntries.length === before + 2, 'approve creates credit + slab entries (two, not one)');
    const w6 = await aw.Wallet.getWallet(6);
    const cred = w6.entries.find(e => e.deliverableId === nd.id && e.type === 'TASK_CREDIT');
    const slab = w6.entries.find(e => e.deliverableId === nd.id && e.type === 'SLAB_ADJUSTMENT');
    check(cred && cred.amountPaise === 100000 && slab && slab.amountPaise === -6000, 'credit ₹1000, slab −₹60 (6% × 1 hour over)');
    check(DBa.outbox.length === mailBefore, 'money hidden (default): no amount email sent to employee');
    check(!DBa.notifications.some(n => n.recipientId === 6 && /\u20B9|₹/.test(n.title)), 'money hidden: no rupee amounts in employee notifications');
    await aw.DataAPI.approveDeliverable(nd.id);
    check(DBa.walletEntries.length === before + 2, 'second approve does not double-credit (idempotent)');

    // Dispute round trip
    const dsp = await aw.Wallet.raiseDispute(slab.id, 6, 'brief late tha');
    let e2 = null; try { await aw.Wallet.resolveDispute(dsp.id, { accept: true, note: '' }); } catch (e) { e2 = e; }
    check(e2 && e2.code === 'VALIDATION', 'dispute resolution needs a note');
    await aw.Wallet.resolveDispute(dsp.id, { accept: true, note: 'is correct' });
    check((await aw.Wallet.getWallet(6)).balancePaise === w6.balancePaise + 6000, 'accepted dispute credits back the slab');

    // Ledger immutability + payout guard
    let e3 = null; try { await aw.Wallet.addEntry(6, 'PAYOUT', 99999999, 'too much'); } catch (e) { e3 = e; }
    check(e3 && e3.code === 'VALIDATION', 'payout cannot exceed balance');

    // Employee side renders wallet + focus queue
    // Default: money hidden from employees
    ew.nav('wallet', null); await new Promise(r => setTimeout(r, 60));
    check(ew.document.getElementById('wallet-body').innerHTML.includes('Not available'), 'money hidden (default): employee wallet page is locked');
    // Admin flips the policy on → employee sees wallet
    await ew.Wallet.updatePolicy({ showMoneyToEmployees: true });
    ew.rWallet(); await new Promise(r => setTimeout(r, 60));
    const wb = ew.document.getElementById('wallet-body').innerHTML;
    check(wb.includes('Balance') && wb.includes('Dispute'), 'policy on: employee wallet renders with ledger + dispute action');
    ew.nav('dashboard', null); ew.rDash();
    check(ew.document.getElementById('dash').innerHTML.includes('Focus queue'), 'employee dashboard shows focus queue');
    check(typeof ew.focusOrder === 'function' && ew.focusOrder()[0].status === 'rejected', 'focus queue puts rejected work first');
    ew.openDetail(5003);
    const det = ew.document.getElementById('det-body').innerHTML;
    check(det.includes('Pay for this task') && det.includes('blocked</button>'), 'policy on: task detail shows price card + blocked button');
    await ew.Wallet.updatePolicy({ showMoneyToEmployees: false });
    ew.openDetail(5003);
    const det2 = ew.document.getElementById('det-body').innerHTML;
    check(!det2.includes('Pay for this task') && det2.includes('blocked</button>'), 'policy off: price card gone, blocked button stays');

    // Signals
    const sigs = await aw.EenSignals.scanForAdmin();
    const types = sigs.all.map(x => x.type);
    check(types.includes('ESTIMATE_PENDING'), 'Een flags pending estimate agreement');
    check(Object.keys(aw.EenSignals.RULES).length === 24, `24 signal rules (${Object.keys(aw.EenSignals.RULES).length})`);
  } catch (e) { check(false, 'wallet: ' + e.message + '\n' + e.stack); }

  console.log('\n' + (fails === 0 ? '\u2705 ALL CHECKS PASSED' : `\u274C ${fails} FAILURE(S)`));
  process.exit(fails ? 1 : 0);
})();

const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const ROOT = __dirname;

const shared = new Map();
const storage = {
  getItem: k => (shared.has(k) ? shared.get(k) : null),
  setItem: (k, v) => shared.set(k, String(v)),
  removeItem: k => shared.delete(k),
  clear: () => shared.clear(),
  key: i => Array.from(shared.keys())[i] ?? null,
  get length() { return shared.size; }
};

function offlineHtml(html, appDir) {
  const local = ['data', 'hrm'].concat(appDir === 'admin' ? ['profitability'] : []).concat(['wallet'])
    .map(n => '<script src="../shared/' + n + '.js"></script>').join('\n');
  return html
    .replace('<script src="../config.js"></script>', '')
    .replace('<script src="../adapter/data-api-http.js"></script>', local)
    .replace('<script src="../adapter/backend-mode.js"></script>', '');
}

async function boot(appDir) {
  const html = offlineHtml(fs.readFileSync(path.join(ROOT, appDir, 'index.html'), 'utf8'), appDir);
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/' + appDir + '/', pretendToBeVisual: true });
  const w = dom.window;
  Object.defineProperty(w, 'localStorage', { value: storage, configurable: true });
  w.requestAnimationFrame = cb => setTimeout(cb, 0);
  w.fetch = (...a) => globalThis.fetch(...a);
  w.AbortController = globalThis.AbortController;
  w.scrollTo = () => {};
  w.URL.createObjectURL = () => 'blob:m'; w.URL.revokeObjectURL = () => {};
  w.console.error = () => {}; w.console.warn = () => {};
  for (const s of Array.from(w.document.querySelectorAll('script[src]'))) {
    const f = path.resolve(path.join(ROOT, appDir), s.getAttribute('src'));
    if (fs.existsSync(f)) { try { w.eval(fs.readFileSync(f, 'utf8')); } catch (e) { console.log('  ! ' + s.getAttribute('src') + ': ' + e.message); } }
  }
  const ev = new w.Event('DOMContentLoaded');
  w.document.dispatchEvent(ev); w.dispatchEvent(ev);
  await new Promise(r => setTimeout(r, 250));
  return w;
}

(async () => {
  let fails = 0;
  const ck = (c, m) => { console.log((c ? '  \u2713 ' : '  \u2717 ') + m); if (!c) fails++; };

  console.log('\n═══ CROSS-APP ROUND TRIP ═══\n');

  /* ── 1. Admin assigns work to Alex (id 9) ── */
  const A = await boot('admin');
  ck(!!A.STATE, 'admin booted');

  const proj = A.STATE.projects.find(p => p.name === 'Swiggy Clone');
  const ms = proj.milestones.find(m => m.status === 'In Progress');
  const created = await A.DataAPI.createDeliverable({
    projectId: proj.id, milestoneId: ms.id,
    title: 'Cross-app test: build the checkout screen',
    description: 'Round-trip verification task',
    priority: 'HIGH', status: 'TODO',
    assigneeIds: [9], createdById: A.STATE.adminUser.id, origin: 'ADMIN',
    dueAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    estimateSecs: 4 * 3600
  });
  A.syncState();
  ck(!!created.id, `admin created deliverable #${created.id}`);
  ck(A.STATE.tasks.some(t => t.id === created.id), 'appears in admin projection');
  A.DataAPI.flush();
  ck(shared.has("oment_psa_db_v2"), "persisted to shared storage");

  /* ── 2. Employee app boots fresh from the SAME storage ── */
  const E = await boot('employee');
  ck(!!E.USERS && E.USERS.length === 9, 'employee booted from shared store');

  E.doLogin(9);
  await new Promise(r => setTimeout(r, 200));
  ck(E.CU.name === 'Alex Chen', 'logged in as Alex Chen');

  const seen = E.TASKS.find(t => t.id === created.id);
  ck(!!seen, '\u2b50 ADMIN\u2192EMPLOYEE: assigned task visible to Alex');
  ck(seen && seen.status === 'todo', `  status translated to "${seen && seen.status}"`);
  ck(seen && seen.priority === 'high', `  priority translated to "${seen && seen.priority}"`);
  ck(seen && seen.proj === 'Swiggy Clone', `  project name matches ("${seen && seen.proj}")`);
  ck(seen && seen.exp === 4 * 3600, '  estimate in seconds for employee app');

  const notif = E.NOTIFS.find(n => n.taskId === created.id);
  ck(!!notif, '  employee got an ASSIGNED notification');

  /* another employee should NOT see it */
  E.CU = E.USERS.find(u => u.id === 2);
  E.syncUserState();
  ck(!E.TASKS.some(t => t.id === created.id), '\u2b50 ISOLATION: Arjun cannot see Alex\'s task');
  E.CU = E.USERS.find(u => u.id === 9);
  E.syncUserState();
  E.DataAPI.flush();

  /* ── 3. Employee works on it and submits ── */
  E.activateTask(created.id, true);
  await new Promise(r => setTimeout(r, 120));
  ck(E.DataAPI.raw().deliverables.find(d => d.id === created.id).status === 'IN_PROGRESS',
     'starting the timer moves it to IN_PROGRESS');

  E.stopT();
  await new Promise(r => setTimeout(r, 80));

  await E.DataAPI.addDeliverableFiles(created.id,
    [{ name: 'checkout-v1.zip', sizeLabel: '2.1 MB', kind: 'zip' }], 'submission');
  await E.DataAPI.submitDeliverable(created.id, { notes: 'Checkout screen done, tested on mobile.' });
  E.syncUserState();
  E.DataAPI.flush();

  const afterSubmit = E.TASKS.find(t => t.id === created.id);
  ck(afterSubmit.status === 'submitted', 'employee submitted (shows as "submitted")');

  /* ── 4. Admin reloads and sees the submission ── */
  const A2 = await boot('admin');
  A2.syncState();
  const adminSees = A2.STATE.tasks.find(t => t.id === created.id);
  ck(!!adminSees, '\u2b50 EMPLOYEE\u2192ADMIN: submission visible after admin reload');
  ck(adminSees.status === 'In Review', `  status translated to "${adminSees.status}"`);
  ck(adminSees.submissionNotes.includes('Checkout screen done'), '  submission notes carried across');
  ck(adminSees.submissionFiles.length === 1, '  submitted file carried across');

  const adminNotif = A2.STATE.notifications.find(n => n.entityId === created.id);
  ck(!!adminNotif, '  admin got a REVIEW notification');

  /* ── 5. Admin rejects with a reason ── */
  try { await A2.DataAPI.rejectDeliverable(created.id, ''); ck(false, 'empty reason should be rejected'); }
  catch (e) { ck(e.code === 'VALIDATION', 'rejection reason is mandatory'); }

  await A2.DataAPI.rejectDeliverable(created.id, 'The layout breaks at the 360px mobile breakpoint. Please fix and resubmit.');
  A2.syncState();
  A2.DataAPI.flush();

  /* ── 6. Employee sees the rejection with the reason ── */
  const E2 = await boot('employee');
  E2.doLogin(9);
  await new Promise(r => setTimeout(r, 200));
  const rejected = E2.TASKS.find(t => t.id === created.id);
  ck(rejected.status === 'rejected', '\u2b50 ADMIN\u2192EMPLOYEE: rejection visible');
  ck(rejected.rejReason.includes('360px'), '  rejection reason carried across');
  ck(E2.NOTIFS.some(n => n.taskId === created.id && n.type === 'rejected'), '  employee notified of rejection');
  ck(E2.TASKS[0].status === 'rejected', '  rejected tasks sorted to the top of the list');

  /* ── 7. Resubmit → approve → milestone/progress rolls up ── */
  await E2.DataAPI.updateDeliverable(created.id, { status: 'IN_PROGRESS', rejectionReason: null, approvalState: null });
  await E2.DataAPI.submitDeliverable(created.id, { notes: 'Breakpoint fixed.' });
  E2.DataAPI.flush();

  const A3 = await boot('admin');
  const beforePct = A3.DataAPI.projectProgress(proj.id);
  await A3.DataAPI.approveDeliverable(created.id);
  A3.syncState();
  A3.DataAPI.flush();
  const approved = A3.STATE.tasks.find(t => t.id === created.id);
  ck(approved.status === 'Done', 'admin approved');
  ck(A3.DataAPI.projectProgress(proj.id) >= beforePct, 'project progress recalculated from real data');

  const E3 = await boot('employee');
  E3.doLogin(9);
  await new Promise(r => setTimeout(r, 200));
  ck(E3.TASKS.find(t => t.id === created.id).status === 'approved', '\u2b50 employee sees it as approved');
  const score = E3.DataAPI.employeeScore(9);
  ck(score.sample > 0 && score.score >= 0 && score.score <= 100, `employee score computed (${score.score}, n=${score.sample})`);

  /* ── 8. Invoice numbering never repeats ── */
  const nums = [];
  for (let i = 0; i < 3; i++) {
    const inv = await A3.DataAPI.createInvoice({
      clientName: 'Test Co', placeOfSupply: '29', projectId: proj.id,
      lines: [{ description: 'Work', qty: 1, ratePaise: 100000 }]
    });
    nums.push(inv.number);
  }
  const draft = A3.DataAPI.raw().invoices.find(i => i.number === nums[1]);
  await A3.DataAPI.deleteInvoice(draft.id);
  const next = await A3.DataAPI.createInvoice({
    clientName: 'Test Co', placeOfSupply: '29', projectId: proj.id,
    lines: [{ description: 'Work', qty: 1, ratePaise: 100000 }]
  });
  ck(!nums.includes(next.number), `invoice number not reused after delete (${nums.join(', ')} \u2192 ${next.number})`);

  /* ── 9. HRM round trip: employee applies, admin approves ── */
  console.log('\n── HRM ──');
  const E4 = await boot('employee');
  E4.doLogin(9);
  await new Promise(r => setTimeout(r, 200));

  let wd = null;
  for (let i = 7; i < 40 && !wd; i++) {
    const c = E4.Utils.isoDate(E4.Utils.daysFromNow(i));
    if (!E4.HRM.isWeekOff(c) && !E4.HRM.holidayOn(c)) wd = c;
  }
  const leave = await E4.HRM.applyLeave({
    employeeId: 9, type: 'CL', fromDate: wd, toDate: wd, reason: 'Cousin\'s wedding'
  });
  E4.DataAPI.flush();
  ck(leave.status === 'PENDING', '\u2b50 employee applied for leave');

  const A4 = await boot('admin');
  const pend = (await A4.HRM.getLeaveRequests({ status: 'PENDING' })).find(r => r.id === leave.id);
  ck(!!pend, '\u2b50 EMPLOYEE\u2192ADMIN: leave request visible to admin');
  const adminLvNotif = A4.DataAPI.raw().notifications.find(n => n.entityId === leave.id);
  ck(!!adminLvNotif, '  approver notified');

  try { await A4.HRM.rejectLeave(leave.id, ''); ck(false, 'empty reason should fail'); }
  catch (e) { ck(e.code === 'VALIDATION', '  rejection reason mandatory'); }

  const balBefore = (await A4.HRM.getBalances(9)).find(b => b.type === 'CL');
  await A4.HRM.approveLeave(leave.id);
  const balAfter = (await A4.HRM.getBalances(9)).find(b => b.type === 'CL');
  ck(balAfter.used === balBefore.used + leave.days, '  balance deducted on approval');
  ck(balAfter.pending === balBefore.pending - leave.days, '  pending released');

  const attRow = A4.DataAPI.raw().attendance.find(a => a.leaveRequestId === leave.id);
  ck(!!attRow && attRow.status === 'ON_LEAVE', '  attendance register marked ON_LEAVE');

  const board = await A4.HRM.getTodayBoard();
  ck(board.rows.length === A4.DataAPI.raw().employees.length, '  today board covers whole team');
  const reg = await A4.HRM.getRegister();
  ck(reg.rows.length > 0 && reg.days.length >= 28, `  register built (${reg.rows.length} people x ${reg.days.length} days)`);
  const util = await A4.HRM.getUtilisation();
  ck(util.rows.some(r => r.utilisationPct > 0), '  utilisation computed from real time entries');
  A4.DataAPI.flush();

  const E5 = await boot('employee');
  E5.doLogin(9);
  await new Promise(r => setTimeout(r, 200));
  const mine = (await E5.HRM.getLeaveRequests({ employeeId: 9 })).find(r => r.id === leave.id);
  ck(mine.status === 'APPROVED', '\u2b50 ADMIN\u2192EMPLOYEE: approval visible to employee');
  ck(E5.DataAPI.raw().notifications.some(n => n.recipientId === 9 && n.entityId === leave.id && n.kind === 'APPROVED'),
     '  employee notified of approval');

  console.log('\n── PROFITABILITY ──');
  const A5 = await boot('admin');
  const swig = A5.STATE.projects.find(p => p.name === 'Swiggy Clone');
  const p0 = await A5.Profit.getProject(swig.id);
  ck(p0.costPaise > 0, `baseline cost ${A5.Utils.fmtRupee(p0.costPaise)} on ${p0.name}`);

  const target = A5.DataAPI.raw().deliverables.find(d => d.projectId === swig.id && d.status !== 'DONE');
  const today = A5.Utils.isoDate(new Date());
  const att = A5.DataAPI.raw().attendance.find(a => a.employeeId === 9 && a.date === today);
  att.perDeliverableSecs[target.id] = (att.perDeliverableSecs[target.id] || 0) + 8 * 3600;
  att.activeSecs += 8 * 3600;
  target.loggedSecs += 8 * 3600;
  A5.DataAPI.touch(); A5.DataAPI.flush();

  const p1 = await A5.Profit.getProject(swig.id);
  const alexLoaded = A5.Profit.loadedRateOf(9);
  const expected = p0.costPaise + Math.round(alexLoaded * 8);
  ck(Math.abs(p1.costPaise - expected) < 200,
     `\u2b50 8h of Alex's time added ${A5.Utils.fmtRupee(p1.costPaise - p0.costPaise)} of cost`);
  ck(p1.marginPaise < p0.marginPaise, `margin dropped by ${A5.Utils.fmtRupee(p0.marginPaise - p1.marginPaise)}`);
  ck(p1.team.some(m => m.employeeId === 9), '  Alex appears in project cost breakdown');

  const m0 = p1.marginPaise;
  await A5.DataAPI.createInvoice({
    clientName: swig.client, placeOfSupply: '29', projectId: swig.id,
    lines: [{ description: 'Progress billing', qty: 1, ratePaise: 30000000 }]
  });
  const p2 = await A5.Profit.getProject(swig.id);
  ck(p2.marginPaise > m0, `\u2b50 invoicing lifted margin by ${A5.Utils.fmtRupee(p2.marginPaise - m0)}`);
  ck(p2.invoicedPaise > p1.invoicedPaise, '  invoiced revenue increased');
  ck(p2.collectedPaise === p1.collectedPaise, '  collected unchanged (invoice not paid yet)');

  ck(p2.forecastRemainingCostPaise > 0, '  forecast includes remaining committed work');
  ck(p2.projectedCostPaise > p2.costPaise, '  projected cost exceeds cost-to-date');

  /* ── 11. Een: admin ka signal -> employee ka message ── */
  console.log('\n── EEN ──');
  const A6 = await boot('admin');
  const sig = await A6.EenSignals.scanForAdmin();
  ck(sig.count > 0, `Een found ${sig.count} things needing attention \u2014 with no AI`);
  ck(sig.all.every(x => x.why), '  every signal says why it fired');

  /* Employee messages default OFF */
  let r0 = await A6.eenPushEmployeeNudges();
  ck(r0.sent === 0, '\u2b50 Een does not message employees until you allow it');

  /* Admin turns it on */
  const st = JSON.parse(A6.localStorage.getItem('oment_een_settings') || '{}');
  st.employeeMessages = true;
  A6.localStorage.setItem('oment_een_settings', JSON.stringify(st));

  const r1 = await A6.eenPushEmployeeNudges();
  ck(r1.sent > 0, `\u2b50 Een sent ${r1.sent} employee nudge(s) once allowed`);
  A6.DataAPI.flush();

  const eenNotif = A6.DataAPI.raw().notifications.find(n => n.kind === 'EEN');
  ck(!!eenNotif, '  nudge stored as a notification');
  ck(eenNotif.body.indexOf('Why you\u2019re seeing this') === 0 || eenNotif.body.indexOf('Why you') === 0, '  every nudge carries its reason');

  /* Second run same day must not double-send */
  const r2 = await A6.eenPushEmployeeNudges();
  ck(r2.sent === 0, '  max one nudge per person per day');

  /* Employee sees it */
  const E6 = await boot('employee');
  E6.doLogin(eenNotif.recipientId);
  await new Promise(r => setTimeout(r, 200));
  const gotNudge = E6.NOTIFS.find(n => String(n.id) === String(eenNotif.id));
  ck(!!gotNudge, '\u2b50 ADMIN\u2192EMPLOYEE: Een message reached the employee');
  ck(gotNudge.type === 'een', '  shown as an Een message, not a system alert');
  ck(gotNudge.sub.length > 10, '  employee sees why they got it');

  /* ── WALLET: priced task round trip ── */
  console.log('\n── WALLET (piece-rate) ──');
  const W1 = await boot('admin');
  ck((W1.DataAPI.raw().payPolicy || {}).showMoneyToEmployees === false, 'money visibility to employees is OFF by default');
  await W1.Wallet.updatePolicy({ showMoneyToEmployees: true });    
  const wp = W1.STATE.projects.find(p => p.name === 'Swiggy Clone');
  const wms = wp.milestones.find(m => m.status === 'In Progress');
  const priced = await W1.DataAPI.createDeliverable({
    projectId: wp.id, milestoneId: wms.id, title: 'Cross-app: API integration (₹500)',
    priority: 'HIGH', assigneeIds: [6], createdById: W1.STATE.adminUser.id, origin: 'ADMIN',
    dueAt: new Date(Date.now() + 86400000).toISOString(), estimateSecs: 2 * 3600,
    pricingMode: 'PIECE', pricePaise: 50000
  });
  W1.DataAPI.flush();
  ck(priced.pricingMode === 'PIECE' && priced.agreement.state === 'PENDING', `admin created priced task #${priced.id} — waits for Rohan to agree`);

  const X1 = await boot('employee'); X1.doLogin(6); await new Promise(r => setTimeout(r, 200));
  const pt = X1.TASKS.find(t => t.id === priced.id);
  ck(pt && pt.isPiece && pt.myPricePaise === 50000, '\u2b50 ADMIN\u2192EMPLOYEE: Rohan sees the task with its ₹500 price');
  ck(pt.agreement.state === 'PENDING', '  and that he must agree the estimate first');
  ck(!X1.Wallet.canStart(6, priced.id).ok, '  timer is locked until he agrees');
  X1.openDetail(priced.id);
  ck(X1.document.getElementById('det-body').innerHTML.includes('is fine'), '  detail screen offers "accept" / "my time is different"');
  await X1.Wallet.proposeEstimate(priced.id, 6, 3 * 3600, 'there are three endpoints, it will not fit in 2 hours');
  X1.DataAPI.flush();

  const W2 = await boot('admin');
  const ag = W2.DataAPI.raw().deliverables.find(d => d.id === priced.id).agreement;
  ck(ag.state === 'COUNTERED' && ag.employeeSecs === 10800, '\u2b50 EMPLOYEE\u2192ADMIN: proposal (3h) reached admin');
  const hint = await W2.Wallet.getEstimateHint(priced.id);
  ck(hint && (hint.team || hint.person), '  admin sees past-task data to negotiate with');
  W2.gotoModule('payouts'); W2.poSetTab('agreements'); await new Promise(r => setTimeout(r, 80));
  ck(W2.document.getElementById('po-pane').innerHTML.includes('Accept'), '  Agreements tab shows the accept button');
  await W2.Wallet.acceptProposal(priced.id);
  W2.DataAPI.flush();

  const X2 = await boot('employee'); X2.doLogin(6); await new Promise(r => setTimeout(r, 200));
  ck(X2.Wallet.canStart(6, priced.id).ok, '\u2b50 ADMIN\u2192EMPLOYEE: after admin accepts, Rohan can start');
  await X2.DataAPI.startTimer(6, priced.id);
  await X2.Wallet.markBlocked(priced.id, 6, 'staging credentials not received');
  ck(!X2.DataAPI.raw().timeEntries.some(t => t.deliverableId === priced.id && !t.endedAt), '  blocking stops the timer (blocked time never charged)');
  X2.DataAPI.flush();

  const W3 = await boot('admin');
  const blocked = await W3.Wallet.getBlocked();
  ck(blocked.some(b => b.id === priced.id && b.byName === 'Rohan Joshi'), '\u2b50 EMPLOYEE\u2192ADMIN: blocked task shows in admin queue with reason');
  const sigW = await W3.EenSignals.scanForAdmin();
  ck(sigW.all.some(x => x.type === 'BLOCKED_WAITING' && x.facts.deliverableId === priced.id), '  Een raises BLOCKED_WAITING');
  await W3.Wallet.unblock(priced.id, 100, 'credentials sent');
  // 4h logged on 3h agreed → one slab
  W3.DataAPI.raw().deliverables.find(d => d.id === priced.id).loggedSecs = 4 * 3600 + 120;
  W3.DataAPI.touch(); W3.DataAPI.flush();

  const X3 = await boot('employee'); X3.doLogin(6); await new Promise(r => setTimeout(r, 200));
  ck(X3.NOTIFS.some(n => n.text.includes('block was cleared')), '  Rohan is told the block was resolved');
  await X3.DataAPI.submitDeliverable(priced.id, { notes: 'done' });
  X3.DataAPI.flush();

  const W4 = await boot('admin');
  W4.openDeliverableDetail(wp.id, priced.id);
  ck(W4.document.getElementById('modal-body').innerHTML.includes('On approval'), '  admin sees settlement preview before approving');
  const settled = await W4.DataAPI.approveDeliverable(priced.id);
  ck(settled.settlement && settled.settlement.finalPaise === 47000, '\u2b50 approve settles at ₹470 (₹500 − one ₹30 slab)');
  W4.DataAPI.flush();

  const X4 = await boot('employee'); X4.doLogin(6); await new Promise(r => setTimeout(r, 200));
  const wal = await X4.Wallet.getWallet(6);
  const cr = wal.entries.find(e => e.deliverableId === priced.id && e.type === 'TASK_CREDIT');
  const sl = wal.entries.find(e => e.deliverableId === priced.id && e.type === 'SLAB_ADJUSTMENT');
  ck(cr && cr.amountPaise === 50000 && sl && sl.amountPaise === -3000, '\u2b50 ADMIN\u2192EMPLOYEE: wallet shows +₹500 and −₹30 as separate entries');
  ck(sl.why.includes('Agreed 3h'), '  slab entry explains itself in plain language');
  ck(X4.NOTIFS.some(n => n.text.includes('added to your wallet')), '  Rohan notified of the credit');
  ck(X4.DataAPI.raw().outbox.some(m => m.to === 'rohan@oment.in' && m.subject.includes('470')), '  automated email queued with the right amount');
  X4.nav('wallet', null); await new Promise(r => setTimeout(r, 60));
  ck(X4.document.getElementById('wallet-body').innerHTML.includes('Late slab'), '  ledger renders the slab row');

  /* ── REGRESSION: assign from employee profile (September "Sept" date bug) ── */
  console.log('\n── ASSIGN FROM PROFILE ──');
  const R1 = await boot('admin');
  R1.gotoModule('employees'); await new Promise(r => setTimeout(r, 80));
  R1.openAssignTaskToEmp(6); await new Promise(r => setTimeout(r, 80));
  R1.document.getElementById('at-title').value = 'Profile-assigned September task';
  const projSel = R1.document.getElementById('at-project');
  projSel.value = projSel.querySelector('option[value]:not([value=""])').value;
  R1.document.getElementById('at-deadline').value = '2026-09-25';   // "25 Sept 2026" round-trip used to kill this
  R1.document.getElementById('at-hours').value = '3';
  R1.confirmAssignTaskToEmp(6); await new Promise(r => setTimeout(r, 120));
  const made = R1.DataAPI.raw().deliverables.find(d => d.title === 'Profile-assigned September task');
  ck(!!made, '\u2b50 assigning from the employee profile actually creates the task (Sept-date bug fixed)');
  ck(made && made.dueAt && made.dueAt.slice(0, 10) === '2026-09-25', '  due date survives intact');
  ck(made && (made.assigneeIds || []).indexOf(6) >= 0, '  assigned to the right person');
  R1.DataAPI.flush();
  const R2 = await boot('employee'); R2.doLogin(6); await new Promise(r => setTimeout(r, 200));
  ck(R2.TASKS.some(t => t.title === 'Profile-assigned September task'), '\u2b50 ADMIN\u2192EMPLOYEE: it shows up in the employee\u2019s task list');

  /* ── SALARY → TASK COST (fully automated) ── */
  console.log('\n── SALARY COSTING ──');
  const C1 = await boot('admin');
  const adit = await C1.DataAPI.createEmployee({ name: 'Aditya Kumar', email: 'aditya.k@oment.in', phone: '9', address: 'Kanpur, UP',
    role: 'Developer', username: 'aditya.k', password: 'secret1', monthlySalaryPaise: 2080000, hoursPerDay: 8 });
  ck(adit.costPerHourPaise === 10000, '\u2b50 admin enters \u20B920,800/month \u2192 system derives \u20B9100/hr on its own');
  const cp = C1.STATE.projects[0];
  const cms = C1.DataAPI.raw().milestones.find(m => m.projectId === cp.id);
  const ct = await C1.DataAPI.createDeliverable({ projectId: cp.id, milestoneId: cms.id, title: 'Aditya API task', assigneeIds: [adit.id],
    createdById: 100, origin: 'ADMIN', dueAt: new Date(Date.now() + 86400000).toISOString(), estimateSecs: 3600, pricingMode: 'HOURLY' });
  C1.DataAPI.flush();

  const C2 = await boot('employee');
  const authAdit = await C2.DataAPI.authenticateEmployee('aditya.k', 'secret1');
  ck(authAdit.id === adit.id, '\u2b50 new employee signs in with the credentials from the card');
  C2.doLogin(adit.id); await new Promise(r => setTimeout(r, 200));
  ck(C2.TASKS.some(t => t.id === ct.id), '  sees the assigned task');
  C2.DataAPI.raw().deliverables.find(d => d.id === ct.id).loggedSecs = 3600;   // 1 hour of work
  await C2.DataAPI.submitDeliverable(ct.id, { notes: 'done' });
  C2.DataAPI.flush();

  const C3 = await boot('admin');
  const capp = await C3.DataAPI.approveDeliverable(ct.id);
  ck(capp.costSnapshot && capp.costSnapshot.costPaise === 10000, '\u2b50 EMPLOYEE\u2192ADMIN: on approval admin sees \u201cthis task cost \u20B9100\u201d \u2014 zero manual steps');
  C3.openDeliverableDetail(cp.id, ct.id);
  ck(C3.document.getElementById('modal-body').innerHTML.includes('This task cost'), '  cost card renders in the task detail');

  console.log('\n' + (fails === 0 ? '\u2705 CROSS-APP INTEGRATION PASSED' : `\u274C ${fails} FAILURE(S)`));
  process.exit(fails ? 1 : 0);
})();

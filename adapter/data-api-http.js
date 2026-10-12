/* ============================================================================
   OMENT PSA — HTTP adapter (drop-in replacement for shared/data.js and the
   local engines, talking to the server instead of localStorage)
   ----------------------------------------------------------------------------
   HOW TO SWITCH AN APP TO THE BACKEND (2 edits per index.html):

     1. Set the API base (before any other script):
          <script>window.OMENT_API_BASE = 'http://localhost:4000/api';</script>
     2. REPLACE these five script tags:
          ../shared/data.js, ../shared/wallet.js, ../shared/hrm.js,
          ../shared/profitability.js, ../shared/een-signals.js
        with ONE:
          <script src="../server/frontend-adapter/data-api-http.js"></script>
        (utils.js, schema.js, seed.js, glossary.js, guides.js stay — they are
        pure client-side helpers.)

   WHAT IT DOES
   • Exposes DataAPI, HRM, Profit, Wallet, EenSignals with the exact method
     names and signatures the apps already call (the engine's own surface —
     see DATAAPI.md). Every call goes to POST /api/rpc.
   • DataAPI.raw() stays synchronous: the adapter caches the role-filtered
     snapshot the server sends with every mutation (and on init), so all
     existing render code works unchanged.
   • Login: DataAPI.authenticateEmployee(username, password) hits
     /api/auth/login and stores the JWT — the employee app's existing login
     form works as-is. The admin app has no login UI, so on 401 the adapter
     overlays a minimal sign-in form by itself.
   • Money/permission errors arrive as {code, message} exactly like before —
     toasts keep working.

   NOT over HTTP (by design): EenSignals runs locally against the cached
   snapshot (same file logic is inlined server-side too via /api/signals if
   you prefer). Pure helpers (computeSettlement, slabPreview, canStart,
   focusQueue…) are answered from the snapshot for zero-latency UI.
   ============================================================================ */
(function (root) {
  'use strict';
  var BASE = String(root.OMENT_API_BASE || 'http://localhost:5000/api').replace(/\/+$/, '');
  var APP = (typeof document !== 'undefined' && document.getElementById('s-login')) ? 'employee' : 'admin';
  var TOKEN_KEY = 'oment_jwt_' + APP;
  var SNAP = null;                     // role-filtered DB snapshot
  var token = null;
  try { token = root.localStorage.getItem(TOKEN_KEY); } catch (e) {}

  function setToken(t) { token = t; try { t ? root.localStorage.setItem(TOKEN_KEY, t) : root.localStorage.removeItem(TOKEN_KEY); } catch (e) {} }

  function httpErr(payload, status) {
    var e = new Error((payload && payload.error && payload.error.message) || ('HTTP ' + status));
    e.code = (payload && payload.error && payload.error.code) || 'HTTP_' + status;
    return e;
  }

  function req(method, path, body) {
    return fetch(BASE + path, {
      method: method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
      body: body === undefined ? undefined : JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (res.status === 401 && !path.startsWith('/auth/')) { setToken(null); showAdminLoginIfNeeded(); }
        if (!res.ok) throw httpErr(json, res.status);
        if (json.snapshot) SNAP = json.snapshot;
        return json;
      });
    });
  }

  function rpc(api, method, args) {
    return req('POST', '/rpc', { api: api, method: method, args: args }).then(function (j) { return j.result; });
  }

  function refreshSnapshot() {
    return req('GET', '/snapshot').then(function (j) { SNAP = j.snapshot; return SNAP; });
  }

  /* ── build the four surfaces: every method proxies to RPC ── */
  function proxy(apiName, methods, localOverrides) {
    var out = {};
    methods.forEach(function (m) {
      out[m] = function () { return rpc(apiName, m, Array.prototype.slice.call(arguments)); };
    });
    Object.assign(out, localOverrides || {});
    return out;
  }

  var DATA_METHODS = ['getSettings', 'updateSettings', 'getEmployees', 'getEmployee', 'createEmployee', 'updateEmployee', 'deleteEmployee',
    'getDepartments', 'createDepartment', 'updateDepartment', 'deleteDepartment',
    'getProjects', 'getProject', 'createProject', 'updateProject', 'deleteProject', 'addProjectMember', 'removeProjectMember',
    'getMilestones', 'createMilestone', 'updateMilestone', 'deleteMilestone',
    'getDeliverables', 'getDeliverable', 'createDeliverable', 'updateDeliverable', 'deleteDeliverable',
    'submitDeliverable', 'approveDeliverable', 'rejectDeliverable', 'reassignDeliverable',
    'addDeliverableComment', 'addDeliverableFiles', 'removeDeliverableFile',
    'getSubtasks', 'createSubtask', 'updateSubtask', 'approveSubtask', 'rejectSubtask', 'deleteSubtask',
    'startTimer', 'stopTimer', 'getOpenTimer',
    'getAttendance', 'ensureTodayAttendance', 'updateAttendance', 'addBreak',
    'getInvoices', 'peekInvoiceNumber', 'createInvoice', 'updateInvoice', 'sendInvoice', 'recordPayment', 'cancelInvoice', 'deleteInvoice', 'getUninvoicedMilestones',
    'getRecurringInvoices', 'createRecurringInvoice', 'updateRecurringInvoice', 'deleteRecurringInvoice',
    'milestonePay', 'creditMilestonePay',
    'getNotices', 'createNotice', 'updateNotice', 'sendNotice', 'markNoticeRead', 'deleteNotice',
    'getConversations', 'sendMessage', 'markConversationRead', 'startConversation', 'startPeerConversation',
    'getCalendarEvents', 'createCalendarEvent', 'deleteCalendarEvent',
    'getNotifications', 'markNotificationRead', 'markAllNotificationsRead',
    'getActivity', 'getCallLogs', 'getRevenueSeries', 'getKpis'];

  var DataAPI = proxy('DataAPI', DATA_METHODS, {
    init: function () {
      function needLogin() {
        setToken(null); SNAP = null;
        if (APP === 'admin') { showAdminLoginIfNeeded(); return new Promise(function () {}); }
        return false;
      }
      if (!token) return Promise.resolve(needLogin());
      return refreshSnapshot().then(function () { return true; }, function (e) {
        if (e && (e.code === 'AUTH' || e.code === 'HTTP_401')) return needLogin();
        throw e;
      });
    },
    raw: function () { return SNAP || emptyDB(); },
    flush: function () {   },
    touch: function () { return SNAP; },
    /* Settings → Reset: wipes the server database (admin only) */
    reset: function (mode) {
      return req('POST', '/admin/reset', { mode: mode || 'demo', confirm: 'RESET' }).then(function (j) { if (j.snapshot) SNAP = j.snapshot; return true; });
    },
    setLatency: function () {},
    authenticateEmployee: function (username, password) {
      return req('POST', '/auth/login', { username: username, password: password }).then(function (j) {
        setToken(j.token);
        return refreshSnapshot().then(function () { return j.user; });
      });
    },
    logout: function () { setToken(null); SNAP = null; },
    changePassword: function (oldPassword, newPassword) {
      return req('POST', '/auth/change-password', { oldPassword: oldPassword, newPassword: newPassword }).then(function () { return true; });
    }
  });

  var HRM = proxy('HRM', ['getPolicy', 'updatePolicy', 'getHolidays', 'addHoliday', 'deleteHoliday', 'getBalances', 'creditCompOff',
    'getLeaveRequests', 'applyLeave', 'approveLeave', 'rejectLeave', 'cancelLeave',
    'getRegularisations', 'requestRegularisation', 'approveRegularisation', 'rejectRegularisation',
    'getTodayBoard', 'getRegister', 'getTimesheet', 'getUtilisation',
    'workingDaysBetween', 'dayFlags', 'holidayOn', 'isWeekOff'], {
    init: function () {},
    LEAVE_TYPES: {
      CL:  { key:'CL',  label:'Casual Leave',    annual:12, paid:true,  color:'#2563EB', carryForward:false },
      SL:  { key:'SL',  label:'Sick Leave',      annual:12, paid:true,  color:'#D97706', carryForward:false },
      EL:  { key:'EL',  label:'Earned Leave',    annual:15, paid:true,  color:'#059669', carryForward:true, hidden:true  },
      COMP:{ key:'COMP',label:'Comp Off',        annual:0,  paid:true,  color:'#7C3AED', carryForward:false, hidden:true },
      LOP: { key:'LOP', label:'Loss of Pay',     annual:0,  paid:false, color:'#DC2626', carryForward:false, hidden:true }
    },
    LEAVE_STATUS: {
      PENDING:   { key:'PENDING',   label:'Pending',   tone:'amber' },
      APPROVED:  { key:'APPROVED',  label:'Approved',  tone:'green' },
      REJECTED:  { key:'REJECTED',  label:'Rejected',  tone:'red'   },
      CANCELLED: { key:'CANCELLED', label:'Cancelled', tone:'grey'  }
    }
  });

  var Profit = proxy('Profit', ['getSettings', 'updateSettings', 'setEmployeeRates', 'getRateCoverage', 'getProject', 'getPortfolio',
    'getByClient', 'getByEmployee', 'getAlerts', 'loadedRateOf'], { init: function () {} });

  var Wallet = proxy('Wallet', ['getPolicy', 'updatePolicy', 'setPricing', 'acceptEstimate', 'proposeEstimate', 'flagEstimate',
    'acceptProposal', 'counterEstimate', 'getEstimateHint', 'markBlocked', 'unblock', 'getBlocked',
    'getWallet', 'getLedger', 'addEntry', 'recordEmployeePayment', 'reversePayment', 'applyPenalty', 'getPenaltyRecords', 'raisePenaltyAppeal', 'resolvePenaltyAppeal', 'getPenaltyAppeals', 'raiseDispute', 'resolveDispute', 'getDisputes',
    'getCompanySummary', 'getEstimateBehaviour', 'getOutbox', 'focusQueue'], {
    init: function () {},
    ENTRY_TYPES: {
      TASK_CREDIT:     { key:'TASK_CREDIT',     label:'Task credit',       sign: +1 },
      SLAB_ADJUSTMENT: { key:'SLAB_ADJUSTMENT', label:'Late-slab price',   sign: -1 },
      DISPUTE_CREDIT:  { key:'DISPUTE_CREDIT',  label:'Dispute credit',    sign: +1 },
      BONUS:           { key:'BONUS',           label:'Bonus',             sign: +1 },
      ADJUSTMENT:      { key:'ADJUSTMENT',      label:'Manual adjustment', sign:  0 },
      DEDUCTION:       { key:'DEDUCTION',       label:'Penalty deduction', sign: -1 },
      PAYOUT:          { key:'PAYOUT',          label:'Payout',            sign: -1 }
    },
    AGREEMENT: {
      NONE:      { key:'NONE',      label:'No estimate',         tone:'grey'  },
      PENDING:   { key:'PENDING',   label:'Waiting for you',     tone:'amber' },
      COUNTERED: { key:'COUNTERED', label:'Employee proposed',   tone:'blue'  },
      FLAGGED:   { key:'FLAGGED',   label:'Flagged unrealistic', tone:'red'   },
      AGREED:    { key:'AGREED',    label:'Agreed',              tone:'green' }
    },
    /* pure helpers — snapshot se sync answers, UI zero-latency */
    moneyVisibleToEmployees: function () { var p = (SNAP || {}).payPolicy; return !!(p && p.showMoneyToEmployees); },
    slabFromPolicy: function () { var p = (SNAP || {}).payPolicy || {}; return { stepSecs: p.slabStepSecs, cutPct: p.slabCutPct, floorPct: p.floorPct, graceSecs: p.graceSecs }; },
    canStart: function (employeeId, deliverableId) {
      var DB = SNAP || emptyDB();
      var d = (DB.deliverables || []).find(function (x) { return String(x.id) === String(deliverableId); });
      if (!d) return { ok: false, reason: 'Task not found', code: 'NOT_FOUND' };
      if (d.blocked) return { ok: false, reason: 'Blocked: ' + (d.blocked.reason || ''), code: 'BLOCKED' };
      if (d.pricingMode === 'PIECE' && d.agreement && d.agreement.state !== 'AGREED')
        return { ok: false, reason: 'Agree the estimate first', code: 'NOT_AGREED' };
      var wip = (DB.deliverables || []).filter(function (x) { return x.status === 'IN_PROGRESS' && (x.assigneeIds || []).indexOf(employeeId) >= 0; }).length;
      var lim = ((DB.payPolicy || {}).wipLimit) || 2;
      if (wip >= lim && d.status !== 'IN_PROGRESS') return { ok: false, reason: wip + ' tasks already in progress (limit ' + lim + ')', code: 'WIP_LIMIT' };
      return { ok: true };
    },
    /* Pure previews — the SAME math as shared/wallet.js, run on the cached
       snapshot so the Payouts screen can show "on approval: ₹…" instantly. */
    computeSettlement: function (d) {
      var U = root.Utils, S = root.Schema;
      var rupee = function (p) { return U.fmtRupee(p).replace('.00', ''); };
      var fmtT = function (secs) { return S.TIME.fmtShort(secs); };
      var slab = d.slab || {};
      var base = d.pricePaise || 0, est = d.estimateSecs || 0, chargeable = d.loggedSecs || 0;
      var grace = slab.graceSecs || 0;
      var overSecs = Math.max(0, chargeable - est - grace);
      var step = slab.stepSecs || 3600;
      var steps = est > 0 ? Math.floor(overSecs / step) : 0;
      var cutPct = slab.cutPct == null ? 6 : slab.cutPct;
      var floorPct = slab.floorPct == null ? 65 : slab.floorPct;
      var floorPaise = Math.round(base * floorPct / 100);
      var cutPaise = Math.round(base * cutPct / 100) * steps;
      var finalPaise = Math.max(floorPaise, base - cutPaise);
      var appliedCut = base - finalPaise;
      var hitFloor = steps > 0 && (base - cutPaise) < floorPaise;
      var why;
      if (!est) why = 'No agreed estimate, so the full price applies.';
      else if (steps === 0) why = 'Agreed ' + fmtT(est) + ', took ' + fmtT(chargeable) + ' \u2014 within time. Full price.';
      else why = 'Agreed ' + fmtT(est) + ', took ' + fmtT(chargeable) + ' (' + fmtT(overSecs) + ' extra). ' +
        steps + ' slab' + (steps > 1 ? 's' : '') + ' \u00d7 ' + cutPct + '% = ' + rupee(appliedCut) + ' off' +
        (hitFloor ? ' (floor ' + floorPct + '% floor reached)' : '') + '.';
      return { basePaise: base, finalPaise: finalPaise, cutPaise: appliedCut, estimateSecs: est, chargeableSecs: chargeable,
        overSecs: overSecs, steps: steps, cutPct: cutPct, stepSecs: step, floorPaise: floorPaise, hitFloor: hitFloor, why: why };
    },
    slabPreview: function (d, liveLoggedSecs) {
      var copy = JSON.parse(JSON.stringify(d));
      copy.loggedSecs = liveLoggedSecs != null ? liveLoggedSecs : (d.loggedSecs || 0);
      var s = Wallet.computeSettlement(copy);
      var slab = d.slab || {};
      var step = slab.stepSecs || 3600;
      var nextAt = (d.estimateSecs || 0) + (slab.graceSecs || 0) + (s.steps + 1) * step;
      var secsToNext = Math.max(0, nextAt - copy.loggedSecs);
      var nextPaise = Math.max(s.floorPaise, s.basePaise - Math.round(s.basePaise * s.cutPct / 100) * (s.steps + 1));
      var atFloor = s.finalPaise <= s.floorPaise;
      return { currentPaise: s.finalPaise, nextPaise: nextPaise, secsToNext: atFloor ? null : secsToNext,
        steps: s.steps, atFloor: atFloor, floorPaise: s.floorPaise, why: s.why };
    }
  });

  /* EenSignals — load the real shared/een-signals.js AFTER this file and it
     will run locally against DataAPI.raw() (the snapshot). Server-side scan
     is also available at GET /api/signals. */

  function emptyDB() {
    return { employees: [], departments: [], projects: [], milestones: [], deliverables: [], subtasks: [], timeEntries: [], attendance: [], invoices: [], notices: [], conversations: [], calendarEvents: [], notifications: [], activity: [], callLogs: [], holidays: [], leaveRequests: [], regularisations: [], compOffLedger: [], walletEntries: [], disputes: [], outbox: [], settings: {}, payPolicy: {}, hrPolicy: {}, adminUser: null };
  }

  /* ── minimal admin login overlay (admin app has no login screen) ── */
  /* ── Sign-in / forgot password / reset password UI (both apps) ─────────
     mountAuth(el, { role, onLogin(json) }) renders into `el`. If the page URL
     has ?reset=<token> (link from the email) it opens the new-password form. */
  function escH(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function resetTokenInUrl() {
    try { return new URLSearchParams(location.search).get('reset'); } catch (e) { return null; }
  }
  function clearResetFromUrl() {
    try { var u = new URL(location.href); u.searchParams.delete('reset'); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) {}
  }
  function mountAuth(el, opts) {
    var INP = 'width:100%;box-sizing:border-box;margin-bottom:10px;padding:11px 12px;border-radius:10px;border:1px solid #D4D4D8;font-size:14px;background:#fff;color:#18181B';
    var BTN = 'width:100%;padding:11px;border-radius:10px;border:0;background:#18181B;color:#fff;font-size:14px;font-weight:600;cursor:pointer';
    var LNK = 'background:none;border:0;padding:0;color:#2563EB;font-size:12.5px;cursor:pointer;text-decoration:underline';
    var mode = resetTokenInUrl() ? 'reset' : 'login';
    function msg(text, ok) { return '<div id="oa-msg" style="' + (text ? '' : 'display:none;') + 'color:' + (ok ? '#047857' : '#C62B23') + ';font-size:12.5px;margin-bottom:10px;line-height:1.5">' + escH(text || '') + '</div>'; }
    function show(text, ok) { var m = el.querySelector('#oa-msg'); if (!m) return; m.textContent = text; m.style.color = ok ? '#047857' : '#C62B23'; m.style.display = text ? 'block' : 'none'; }
    function busy(b, label) { var x = el.querySelector('#oa-btn'); if (x) { x.disabled = b; x.textContent = label; } }
    function render(note, noteOk) {
      if (mode === 'login') {
        el.innerHTML = '<form id="oa-form" autocomplete="on">' +
          '<input id="oa-u" placeholder="Username" autocomplete="username" autocapitalize="none" style="' + INP + '">' +
          '<input id="oa-p" type="password" placeholder="Password" autocomplete="current-password" style="' + INP + '">' +
          msg(note, noteOk) +
          '<button id="oa-btn" style="' + BTN + '">Sign in</button>' +
          '<div style="margin-top:12px;text-align:center"><button type="button" id="oa-forgot" style="' + LNK + '">Forgot password?</button></div></form>';
      } else if (mode === 'forgot') {
        el.innerHTML = '<form id="oa-form"><div style="font-size:13px;color:#52525B;margin-bottom:12px;line-height:1.5">Enter your username or email. We\u2019ll email you a link to choose a new password.</div>' +
          '<input id="oa-u" placeholder="Username or email" autocapitalize="none" style="' + INP + '">' +
          msg(note, noteOk) +
          '<button id="oa-btn" style="' + BTN + '">Send reset link</button>' +
          '<div style="margin-top:12px;text-align:center"><button type="button" id="oa-back" style="' + LNK + '">Back to sign in</button></div></form>';
      } else {
        el.innerHTML = '<form id="oa-form"><div style="font-size:13px;color:#52525B;margin-bottom:12px">Choose a new password (at least 6 characters).</div>' +
          '<input id="oa-p" type="password" placeholder="New password" autocomplete="new-password" style="' + INP + '">' +
          '<input id="oa-p2" type="password" placeholder="Repeat new password" autocomplete="new-password" style="' + INP + '">' +
          msg(note, noteOk) +
          '<button id="oa-btn" style="' + BTN + '">Save new password</button>' +
          '<div style="margin-top:12px;text-align:center"><button type="button" id="oa-back" style="' + LNK + '">Back to sign in</button></div></form>';
      }
      var f = el.querySelector('#oa-form');
      var fg = el.querySelector('#oa-forgot'); if (fg) fg.onclick = function () { mode = 'forgot'; render(); };
      var bk = el.querySelector('#oa-back'); if (bk) bk.onclick = function () { mode = 'login'; clearResetFromUrl(); render(); };
      var first = el.querySelector('input'); if (first) setTimeout(function () { try { first.focus(); } catch (e) {} }, 30);
      f.addEventListener('submit', function (ev) {
        ev.preventDefault(); show('');
        if (mode === 'login') {
          busy(true, 'Signing in\u2026');
          req('POST', '/auth/login', { username: el.querySelector('#oa-u').value, password: el.querySelector('#oa-p').value })
            .then(function (j) {
              if (opts.role === 'ADMIN' && j.role !== 'ADMIN') throw new Error('This is an employee account \u2014 use the employee app.');
              if (opts.role === 'EMPLOYEE' && j.role !== 'EMPLOYEE') throw new Error('This is the admin account \u2014 use the admin panel.');
              setToken(j.token);
              return opts.onLogin(j);
            })
            .catch(function (e) { busy(false, 'Sign in'); show(e.message || 'Could not sign in'); });
        } else if (mode === 'forgot') {
          var id = el.querySelector('#oa-u').value.trim();
          if (!id) return show('Enter your username or email');
          busy(true, 'Sending\u2026');
          req('POST', '/auth/forgot-password', { username: id })
            .then(function () { mode = 'login'; render('If that account has an email address, a reset link is on its way. Check your inbox (and spam).', true); })
            .catch(function (e) { busy(false, 'Send reset link'); show(e.message); });
        } else {
          var p1 = el.querySelector('#oa-p').value, p2 = el.querySelector('#oa-p2').value;
          if (p1.length < 6) return show('Password must be at least 6 characters');
          if (p1 !== p2) return show('The two passwords don\u2019t match');
          busy(true, 'Saving\u2026');
          req('POST', '/auth/reset-password', { token: resetTokenInUrl(), newPassword: p1 })
            .then(function () { clearResetFromUrl(); mode = 'login'; render('Password changed. Sign in with your new password.', true); })
            .catch(function (e) { busy(false, 'Save new password'); show(e.message); });
        }
      });
    }
    render();
  }

  function showAdminLoginIfNeeded() {
    if (typeof document === 'undefined' || document.getElementById('oment-login-ov')) return;
    if (document.getElementById('s-login')) return;    
    var ov = document.createElement('div');
    ov.id = 'oment-login-ov';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:inherit;padding:16px';
    ov.innerHTML = '<div style="background:#fff;color:#18181B;border-radius:16px;padding:28px;width:340px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3)">' +
      '<div style="font-size:18px;font-weight:700;margin-bottom:4px">Oment admin</div>' +
      '<div style="font-size:12.5px;color:#71717A;margin-bottom:16px">Sign in to continue</div><div id="oment-auth"></div></div>';
    document.body.appendChild(ov);
    mountAuth(document.getElementById('oment-auth'), { role: 'ADMIN', onLogin: function () { location.reload(); } });
  }
  if (typeof document !== 'undefined') {
    var chk = function () { if (!token || (APP === 'admin' && resetTokenInUrl())) showAdminLoginIfNeeded(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', chk); else chk();
  }

  root.DataAPI = DataAPI;
  root.HRM = HRM;
  root.Profit = Profit;
  root.Wallet = Wallet;
  /* ── Extra server features (email, trackers, PDF, AI, admin tools) ── */
  function qs(o) { var p = []; Object.keys(o || {}).forEach(function (k) { if (o[k] !== undefined && o[k] !== null && o[k] !== '') p.push(encodeURIComponent(k) + '=' + encodeURIComponent(o[k])); }); return p.length ? '?' + p.join('&') : ''; }
  function res(j) { return j.result; }
  /* ── Derived numbers the screens read synchronously (progress bars,
     scores). Same code as shared/data.js, run on the cached snapshot — over
     HTTP they would arrive as Promises and every bar/score showed 0. ── */
  var Derived = (function () {
    var DB = null, U = root.Utils;
    function findOr404(list, id) { return (list || []).find(function (x) { return String(x.id) === String(id); }) || null; }
    var API_ = {
    /* Progress of one deliverable, 0–100, from real work:
         done 100 · in review 90 · started: time logged against the estimate
         (and finished sub-tasks), between 5 and 85 · not started 0.
       A running timer counts too, so the bar moves while someone works. */
    deliverableProgress: function (dOrId) {
      var d = typeof dOrId === 'object' ? dOrId : (DB.deliverables || []).find(function (x) { return String(x.id) === String(dOrId); });
      if (!d) return 0;
      if (d.status === 'DONE') return 100;
      if (d.status === 'IN_REVIEW') return 90;
      var logged = d.loggedSecs || 0;
      (DB.timeEntries || []).forEach(function (t) {
        if (String(t.deliverableId) === String(d.id) && !t.endedAt && t.startedAt) logged += Math.max(0, (Date.now() - Date.parse(t.startedAt)) / 1000);
      });
      var subs = (DB.subtasks || []).filter(function (s) { return String(s.deliverableId) === String(d.id); });
      var subPct = subs.length ? subs.filter(function (s) { return s.status === 'DONE'; }).length / subs.length * 85 : 0;
      var timePct = d.estimateSecs > 0 ? Math.min(1, logged / d.estimateSecs) * 85 : (logged > 0 ? 30 : 0);
      var started = logged > 0 || d.status === 'IN_PROGRESS' || d.status === 'REJECTED' || subPct > 0;
      if (!started) return Math.max(0, Math.min(85, d.progressPct || 0));
      return Math.round(Math.max(5, timePct, subPct, Math.min(85, d.progressPct || 0)));
    },
    /* Project progress: every deliverable's progress, weighted by its
       estimated hours (bigger tasks count more). Projects without
       deliverables use their milestones' status. */
    projectProgress: function (projectId) {
      var pid = Number(projectId);
      var ds = DB.deliverables.filter(function (d) { return d.projectId === pid; });
      if (ds.length) {
        var w = 0, sum = 0;
        ds.forEach(function (d) {
          var wt = d.estimateSecs > 0 ? d.estimateSecs : 3600;
          w += wt; sum += wt * API_.deliverableProgress(d);
        });
        return Math.round(sum / w);
      }
      var ms = DB.milestones.filter(function (m) { return m.projectId === pid; });
      if (!ms.length) return 0;
      return Math.round(ms.reduce(function (s, m) {
        return s + (m.status === 'DONE' ? 100 : m.status === 'IN_PROGRESS' ? 25 : 0);
      }, 0) / ms.length);
    },
    /* done/total = finished deliverables; pct = real progress of its work */
    milestoneProgress: function (milestoneId) {
      var ds = DB.deliverables.filter(function (d) { return d.milestoneId === Number(milestoneId); });
      if (!ds.length) return { done: 0, total: 0, pct: 0 };
      var done = ds.filter(function (d) { return d.status === 'DONE'; }).length;
      var w = 0, sum = 0;
      ds.forEach(function (d) { var wt = d.estimateSecs > 0 ? d.estimateSecs : 3600; w += wt; sum += wt * API_.deliverableProgress(d); });
      return { done: done, total: ds.length, pct: Math.round(sum / w) };
    },
    employeeScore: function (employeeId) {
      /* Score 0–100 from four REAL signals. A part with no data yet is left
         out and its weight goes to the others — nobody gets free points for
         having no work, and nobody is punished just for being new.
           Delivery   35%  share of assigned work actually finished
                           (partial credit: in review 80%, in progress 40%)
           On time    25%  tasks finished by their due date; open tasks that
                           are already past due count as late
           Accuracy   15%  time taken vs the agreed estimate
           Attendance 25%  days present in the last 30 working days
                           (weekly offs, holidays and approved leave excluded)
         Minus 3 points for every time work was sent back (max 15). */
      var id = Number(employeeId);
      var emp = findOr404(DB.employees, id);
      var ds = (DB.deliverables || []).filter(function (d) { return (d.assigneeIds || []).indexOf(id) >= 0; });
      var finished = ds.filter(function (d) { return d.status === 'DONE'; });
      var parts = [];

      var delivery = null;
      if (ds.length) {
        var credit = ds.reduce(function (s, d) {
          if (d.status === 'DONE') return s + 1;
          if (d.status === 'IN_REVIEW') return s + 0.8;
          if (d.status === 'IN_PROGRESS') return s + 0.4;
          if (d.status === 'REJECTED') return s + 0.2;
          return s;                                        // TODO — not started yet
        }, 0);
        delivery = Math.round(credit / ds.length * 100);
        parts.push([delivery, 35]);
      }

      var doneAt = function (d) {
        if (d.completedAt) return d.completedAt;
        var a = (d.timeline || []).filter(function (t) { return t.type === 'approve'; }).pop();
        return a ? a.time : null;
      };
      var now = Date.now();
      var dueRows = ds.filter(function (d) {
        return d.dueAt && (d.status === 'DONE' || new Date(d.dueAt).getTime() < now);
      });
      var onTime = null;
      if (dueRows.length) {
        onTime = Math.round(dueRows.filter(function (d) {
          if (d.status !== 'DONE') return false;           // still open and already late
          var t = doneAt(d);
          return !t || new Date(t) <= new Date(d.dueAt);
        }).length / dueRows.length * 100);
        parts.push([onTime, 25]);
      }

      var estRows = finished.filter(function (d) { return d.estimateSecs > 0 && d.loggedSecs > 0; });
      var accuracy = null;
      if (estRows.length) {
        accuracy = Math.round(estRows.reduce(function (s, d) {
          var ratio = d.loggedSecs / d.estimateSecs;
          return s + Math.max(0, 100 - Math.abs(1 - ratio) * 100);
        }, 0) / estRows.length);
        parts.push([accuracy, 15]);
      }

      var weekOff = (DB.hrPolicy && DB.hrPolicy.weekOff) || [0, 6];
      var hol = {};
      (DB.holidays || []).forEach(function (h) { if (!h.optional) hol[h.date] = true; });
      var leaves = (DB.leaveRequests || []).filter(function (r) { return r.employeeId === id && r.status === 'APPROVED'; });
      var onLeave = function (iso) {
        return leaves.some(function (r) { return (r.dates || []).indexOf(iso) >= 0 || (r.fromDate <= iso && r.toDate >= iso); });
      };
      var recs = {};
      (DB.attendance || []).forEach(function (a) { if (a.employeeId === id) recs[a.date] = a; });
      var today = U.isoDate(new Date());
      var joined = emp && emp.joinedAt ? U.isoDate(emp.joinedAt) : null;
      var workDays = 0, presentDays = 0;
      for (var i = 0; i < 30; i++) {
        var dt = new Date(); dt.setDate(dt.getDate() - i);
        var iso = U.isoDate(dt);
        if (joined && iso < joined) break;
        var r = recs[iso];
        var came = !!(r && (r.status === 'PRESENT' || r.status === 'HALF_DAY' || r.firstInAt));
        if (iso === today && !came) continue;                // today isn't over yet
        if (weekOff.indexOf(dt.getDay()) >= 0 || hol[iso] || onLeave(iso) || (r && r.status === 'ON_LEAVE')) continue;
        workDays++;
        if (came) presentDays += (r.status === 'HALF_DAY' ? 0.5 : 1);
      }
      var attendance = null;
      if (workDays) {
        attendance = Math.round(presentDays / workDays * 100);
        parts.push([attendance, 25]);
      }

      var rejected = ds.reduce(function (s, d) {
        return s + Math.max(d.reworkCount || 0, d.approvalState === 'REJECTED' ? 1 : 0);
      }, 0);

      if (!parts.length) {
        return { score: 0, delivery: null, onTime: null, accuracy: null, attendance: null,
                 presentDays: 0, workDays: 0, sample: 0, tasks: 0, rejected: 0, confident: false };
      }
      var wSum = parts.reduce(function (s, p) { return s + p[1]; }, 0);
      var raw = parts.reduce(function (s, p) { return s + p[0] * p[1]; }, 0) / wSum;
      var score = Math.round(raw - Math.min(15, rejected * 3));

      return {
        score: Math.max(0, Math.min(100, score)),
        delivery: delivery, onTime: onTime, accuracy: accuracy, attendance: attendance,
        presentDays: presentDays, workDays: workDays,
        sample: ds.length + workDays, tasks: ds.length, rejected: rejected,
        confident: ds.length >= 3 && workDays >= 10
      };
    }
    };
    return function () {
      var S = SNAP || {};
      DB = { milestones: S.milestones || [], deliverables: S.deliverables || [], employees: S.employees || [], projects: S.projects || [], timeEntries: S.timeEntries || [], subtasks: S.subtasks || [],
             attendance: S.attendance || [], holidays: S.holidays || [], leaveRequests: S.leaveRequests || [], hrPolicy: S.hrPolicy || null };
      return API_;
    };
  })();
  ['projectProgress', 'milestoneProgress', 'deliverableProgress', 'employeeScore'].forEach(function (m) {
    DataAPI[m] = function () { var d = Derived(); return d[m].apply(d, arguments); };
  });

  root.OmentAPI = {
    base: BASE,
    request: req,
    forgotPassword: function (username) { return req('POST', '/auth/forgot-password', { username: username }); },
    resetPassword: function (tokenStr, newPassword) { return req('POST', '/auth/reset-password', { token: tokenStr, newPassword: newPassword }); },
    changePassword: function (oldPassword, newPassword) { return req('POST', '/auth/change-password', { oldPassword: oldPassword, newPassword: newPassword }); },
    /* email */
    emailSettings: function () { return req('GET', '/settings/email').then(res); },
    updateEmailSettings: function (patch) { return req('PATCH', '/settings/email', patch).then(res); },
    emails: function (q) { return req('GET', '/emails' + qs(q)).then(res); },
    email: function (id) { return req('GET', '/emails/' + encodeURIComponent(id)).then(res); },
    retryEmail: function (id) { return req('POST', '/emails/' + encodeURIComponent(id) + '/retry').then(res); },
    testEmail: function (to) { return req('POST', '/emails/test', { to: to }); },
    processEmails: function () { return req('POST', '/emails/process'); },
    /* live work tracker */
    heartbeat: function (body) { return req('POST', '/attendance/heartbeat', body).then(res); },
    punchOut: function (body) { return req('POST', '/attendance/punch-out', body).then(res); },
    attendanceLive: function () { return req('GET', '/attendance/live').then(res); },
    /* keepalive heartbeat when the tab is closing (fetch survives page unload) */
    heartbeatBeacon: function (body) {
      if (!token) return;
      try { fetch(BASE + '/attendance/heartbeat', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body) }); } catch (e) {}
    },
    /* files (stored on the server) */
    uploadFile: function (file, deliverableId) {
      var q = '?name=' + encodeURIComponent(file.name) + '&mime=' + encodeURIComponent(file.type || 'application/octet-stream') +
        (deliverableId != null ? '&deliverableId=' + encodeURIComponent(deliverableId) : '');
      return fetch(BASE + '/files' + q, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/octet-stream' }, token ? { Authorization: 'Bearer ' + token } : {}),
        body: file
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw httpErr(j, r.status); return j.result; });
      });
    },
    /* open (preview in a new tab) or download a stored file */
    openFile: function (fileId, name, download) {
      var win = download ? null : window.open('', '_blank');
      if (win) { try { win.document.title = name || 'File'; win.document.body.innerHTML = '<p style="font-family:sans-serif;color:#666;padding:20px">Opening ' + String(name || 'file').replace(/</g, '&lt;') + '\u2026</p>'; } catch (e) {} }
      return fetch(BASE + '/files/' + encodeURIComponent(fileId), { headers: token ? { Authorization: 'Bearer ' + token } : {} })
        .then(function (r) {
          if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw httpErr(j, r.status); });
          return r.blob();
        })
        .then(function (blob) {
          var url = URL.createObjectURL(blob);
          if (win) { win.location.href = url; }
          else {
            var a = document.createElement('a'); a.href = url; a.download = name || 'file';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
          }
          setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
          return true;
        })
        .catch(function (e) { if (win) try { win.close(); } catch (x) {} throw e; });
    },
    /* any file the API returns (notice PDF …) */
    downloadPath: function (path, filename) {
      return fetch(BASE + path, { headers: token ? { Authorization: 'Bearer ' + token } : {} })
        .then(function (r) {
          if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw httpErr(j, r.status); });
          return r.blob();
        })
        .then(function (blob) {
          var url = URL.createObjectURL(blob), a = document.createElement('a');
          a.href = url; a.download = filename || 'download';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
          return true;
        });
    },
    /* invoices */
    downloadInvoicePdf: function (id, filename) {
      return fetch(BASE + '/invoices/' + encodeURIComponent(id) + '/pdf', { headers: token ? { Authorization: 'Bearer ' + token } : {} })
        .then(function (r) {
          if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw httpErr(j, r.status); });
          return r.blob();
        })
        .then(function (blob) {
          var url = URL.createObjectURL(blob), a = document.createElement('a');
          a.href = url; a.download = filename || ('Invoice-' + id + '.pdf');
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
          return true;
        });
    },
    /* admin tools */
    resetWorkspace: function (mode) { return DataAPI.reset(mode); },
    schedulerStatus: function () { return req('GET', '/admin/scheduler').then(res); },
    runJob: function (name) { return req('POST', '/admin/scheduler/' + encodeURIComponent(name) + '/run').then(res); },
    eenStatus: function () { return req('GET', '/een/status').then(res); },
    mountAuth: mountAuth,
    hasToken: function () { return !!token; }
  };

  root.OMENT_HTTP_ADAPTER = {
    app: APP, base: BASE, setToken: setToken, refreshSnapshot: refreshSnapshot,
    hasToken: function () { return !!token; },
    token: function () { return token; },
    me: function () { return req('GET', '/auth/me').then(function (j) { return j.user; }); },
    pollChanged: function () {
      if (!token) return Promise.resolve(false);
      var before = JSON.stringify(SNAP);
      return refreshSnapshot().then(function () { return JSON.stringify(SNAP) !== before; });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
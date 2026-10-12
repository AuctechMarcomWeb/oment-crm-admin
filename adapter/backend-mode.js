/* ============================================================================
   BACKEND MODE — connects the two apps to the server
   ----------------------------------------------------------------------------
   data-api-http.js carries all data over HTTP. This file adds what the
   browser-only demo never needed:
     1. Employee app: real sign-in, forgot password, reset password
     2. Logout: clears the server token (and punches the employee out)
     3. Live work tracker: session / active / idle / per-task time is sent to
        the server every few seconds, so the admin sees real numbers and a
        refresh never loses time
     4. Live sync: changes made by other people show up without a refresh
     5. Een AI: answers go through the server (the API key never reaches the
        browser)
   Loaded last, after the app scripts.
   ============================================================================ */
(function () {
  'use strict';
  var A = window.OMENT_HTTP_ADAPTER, API = window.OmentAPI;
  if (!A || !API) return;

  var HEARTBEAT_MS = Number(window.OMENT_HEARTBEAT_MS) || 15000;

  /* signed-in employee object, wherever this app version keeps it */
  var curUser = function () {
    try { if (typeof CU !== 'undefined' && CU) return CU; } catch (e) { /* ignore */ }
    return window.CU || null;
  };

  /* every request to our API carries the login token (Een uses plain fetch) */
  var _fetch = window.fetch.bind(window);
  window.fetch = function (url, opts) {
    try {
      var u = typeof url === 'string' ? url : (url && url.url) || '';
      if (u.indexOf(A.base) === 0 && A.token()) {
        opts = opts || {};
        var h = new Headers(opts.headers || {});
        if (!h.has('Authorization')) h.set('Authorization', 'Bearer ' + A.token());
        opts.headers = h;
      }
    } catch (e) { /* ignore */ }
    return _fetch(url, opts);
  };

  /* ════════════════════════ EMPLOYEE APP ════════════════════════ */
  if (A.app === 'employee') {
    var setHead = function (h, s) {
      var lh = document.querySelector('#s-login .lh'), ls = document.querySelector('#s-login .ls');
      if (lh) lh.textContent = h; if (ls) ls.textContent = s;
    };

    var showSignIn = function () {
      var list = document.getElementById('elist'); if (!list) return;
      setHead('Sign in \uD83D\uDC4B', 'Use the username and password your admin gave you');
      list.innerHTML = '<div id="emp-auth" style="margin-top:6px"></div>';
      API.mountAuth(document.getElementById('emp-auth'), {
        role: 'EMPLOYEE',
        onLogin: function (j) {
          return A.refreshSnapshot().then(function () {
            syncUsers();
            if (!USERS.some(function (u) { return u.id === j.user.id; })) {
              DataAPI.logout();
              throw new Error('Your account is not active. Please contact your admin.');
            }
            doLogin(j.user.id);
          });
        }
      });
    };

    /* app.js calls buildLogin() after boot */
    window.buildLogin = function () {
      var list = document.getElementById('elist'); if (!list) return;
      var inUrl = /[?&]reset=/.test(location.search);
      if (!A.hasToken() || inUrl) return showSignIn();
      list.innerHTML = '<div style="text-align:center;padding:26px;color:var(--t3);font-size:13px">Signing you in\u2026</div>';
      A.me().then(function (me) {
        if (!me || me.role !== 'EMPLOYEE' || !me.empId) throw new Error('not employee');
        syncUsers();
        doLogin(me.empId);
      }).catch(function () { A.setToken(null); showSignIn(); });
    };

    /* ── live work tracker ─────────────────────────────────────────── */
    var today = function () { return Utils.isoDate(new Date()); };
    var trackerBody = function (extra) {
      var a = (typeof todayAtt === 'function') ? todayAtt() : null;
      if (!a) return null;
      var active = (typeof TASKS !== 'undefined' ? TASKS : []).find(function (t) { return t.active; });
      return Object.assign({
        sessionSecs: a.total || 0, activeSecs: a.active || 0, idleSecs: a.idle || 0,
        perDeliverableSecs: a.taskTime || {},
        onBreak: !!window.onBrk,
        currentDeliverableId: active && window.trun ? active.id : null
      }, extra || {});
    };

    /* Time is measured from real timestamps, not by counting ticks: browsers
       slow timers down in background tabs, which used to lose minutes. */
    var lastTick = null;
    window.tickAtt = function () {
      var now = Date.now();
      var d = lastTick ? Math.round((now - lastTick) / 1000) : 1;
      if (d < 1) return;
      lastTick = now;
      if (d > 120) d = 1;                              // laptop slept — don't count the gap
      var att = todayAtt();
      att.total = (att.total || 0) + d;
      if (window.ws && !window.onBrk) {
        if (window.trun) {
          att.active = (att.active || 0) + d;
          var a = TASKS.find(function (t) { return t.active; }) || (typeof SUBTASKS !== 'undefined' ? (SUBTASKS || []).find(function (t) { return t.active; }) : null);
          /* time on a task inside a deliverable counts for that deliverable */
          if (a) { var key = a.isSubtask ? a.deliverableId : a.id; if (!att.taskTime) att.taskTime = {}; att.taskTime[key] = (att.taskTime[key] || 0) + d; }
        } else {
          att.idle = (att.idle || 0) + d;
        }
      }
      att.logout = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
      updAtt(); updWP();
    };

    var sending = false, resumeNext = true;
    var beat = function () {
      if (!curUser() || !A.hasToken() || sending) return;
      if (window.OMENT_DUTY_REQUIRED && !window.OMENT_DUTY_ON) return;      // off duty: not present
      var body = trackerBody(resumeNext ? { resume: true } : null);
      if (!body) return;
      sending = true;
      API.heartbeat(body).then(function () { resumeNext = false; })
        .catch(function () { /* offline — next beat sends the totals again */ })
        .then(function () { sending = false; });
    };
    setInterval(beat, HEARTBEAT_MS);
    var beacon = function () { if (curUser() && !(window.OMENT_DUTY_REQUIRED && !window.OMENT_DUTY_ON)) { var b = trackerBody(); if (b) API.heartbeatBeacon(b); } };
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') beacon(); });
    window.addEventListener('pagehide', beacon);

    /* ── change password (sidebar key button; forced after first sign-in) ── */
    window.openChangePassword = function (forced) {
      var I = 'width:100%;box-sizing:border-box;margin-bottom:10px;padding:10px 12px;border-radius:10px;border:1px solid rgba(0,0,0,.12);font-size:14px';
      oMod(forced ? 'Choose your own password' : 'Change password',
        (forced ? '<div style="font-size:13px;color:var(--t2);margin-bottom:12px">You signed in with a password from your admin. Please choose your own now.</div>' : '') +
        '<input id="cp-old" type="password" placeholder="Current password" autocomplete="current-password" style="' + I + '">' +
        '<input id="cp-new" type="password" placeholder="New password (min 6)" autocomplete="new-password" style="' + I + '">' +
        '<input id="cp-new2" type="password" placeholder="Repeat new password" autocomplete="new-password" style="' + I + '">' +
        '<div id="cp-err" style="display:none;color:#C62B23;font-size:12.5px"></div>',
        [{ l: forced ? 'Later' : 'Cancel', cls: 'btn-ghost', a: cMod },
         { l: 'Save', cls: 'btn-solid', a: function () {
           var o = document.getElementById('cp-old').value, n = document.getElementById('cp-new').value, n2 = document.getElementById('cp-new2').value;
           var err = document.getElementById('cp-err');
           var fail = function (m) { err.textContent = m; err.style.display = 'block'; };
           if (n.length < 6) return fail('New password must be at least 6 characters');
           if (n !== n2) return fail('The two new passwords don\u2019t match');
           API.changePassword(o, n).then(function () { cMod(); toast('Password changed \u2713'); }).catch(function (e) { fail(e.message); });
         } }]);
    };
    var addKeyButton = function () {
      var bot = document.querySelector('.sb-bot');
      if (!bot || document.getElementById('sb-chpw')) return;
      var b = document.createElement('button');
      b.id = 'sb-chpw'; b.className = 'sb-logout'; b.title = 'Change password';
      b.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 21 2M16 7l3 3M18 5l2 2"/></svg>';
      b.onclick = function () { window.openChangePassword(false); };
      bot.insertBefore(b, bot.querySelector('.sb-logout'));
    };

    /* ── Resume a timer that was running when the app closed ───────────
       (power cut, browser closed, laptop restarted). The server still has
       the timer open, so the task's time keeps counting from when it was
       started — nothing is lost and it doesn't start again from zero. */
    var restoreTimer = function () {
      var u = curUser();
      if (!u) return;
      try { if (trun) return; } catch (e) { return; }
      DataAPI.getOpenTimer(u.id).then(function (t) {
        if (!t) return;
        /* the open timer can be on a deliverable or on a task inside it */
        var subs = typeof SUBTASKS !== 'undefined' ? (SUBTASKS || []) : [];
        var task = t.subtaskId != null
          ? subs.find(function (x) { return Number(x.id) === Number(t.subtaskId); })
          : (TASKS || []).find(function (x) { return Number(x.id) === Number(t.deliverableId); });
        if (!task || task.status === 'approved' || task.status === 'submitted') { DataAPI.stopTimer(u.id).catch(function () {}); return; }
        var since = Math.max(0, Math.floor((Date.now() - Date.parse(t.startedAt)) / 1000));
        TASKS.forEach(function (x) { x.active = false; });
        subs.forEach(function (x) { x.active = false; });
        task.active = true;
        if (!ws) { ws = true; wsAt = Date.parse(t.startedAt); var bb = document.getElementById('brk-btn'); if (bb) bb.style.display = 'flex'; }
        SW.reset();
        SW.start((task.logged || 0) + since);           // saved time + the part still running on the server
        trun = true;
        clearInterval(tiv);
        tiv = setInterval(function () {
          if (!trun || onBrk) return;
          tsecs = SW.elapsedSecs();
          var cur = (task.isSubtask ? subs : (TASKS || [])).find(function (x) { return x.id === task.id; }) || task;
          cur.logged = tsecs;
          rTmr();
        }, 1000);
        tsecs = SW.elapsedSecs();
        try { if (typeof rAll === 'function') rAll(); else { updWP(); rTmr(); } } catch (e) {}
        var started = new Date(t.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        toast('\u23F1 Timer resumed on \u201c' + String(task.title || '').slice(0, 40) + '\u201d (running since ' + started + ')', 'ok');
      }).catch(function () {});
    };

    /* after login: first beat right away; ask for a new password if needed */
    var origLogin = window.doLogin;
    if (typeof origLogin === 'function') {
      window.doLogin = function (uid) {
        lastTick = null; resumeNext = true; origLogin(uid); addKeyButton(); setTimeout(beat, 1500);
        setTimeout(restoreTimer, 1200);
        A.me().then(function (me) { if (me && me.mustChange) setTimeout(function () { window.openChangePassword(true); }, 800); }).catch(function () {});
      };
    }

    /* Live sync rebuilds the attendance list from the server. Keep whichever
       of (local, server) totals is higher so the counters never jump back. */
    var origSync = window.syncUserState;
    if (typeof origSync === 'function') {
      window.syncUserState = function () {
        /* the running task and its live seconds survive the rebuild too
           (live sync used to switch the timer display off every 15 s) */
        var activeId = null, liveLogged = {}, activeSub = null, subLogged = {};
        try {
          (TASKS || []).forEach(function (t) { liveLogged[t.id] = t.logged || 0; if (t.active) activeId = t.id; });
          /* same for a running task inside a deliverable */
          if (typeof SUBTASKS !== 'undefined') (SUBTASKS || []).forEach(function (t) { subLogged[t.id] = t.logged || 0; if (t.active) activeSub = t.id; });
        } catch (e) {}
        var before = null;
        try { before = (window.ATT_LOG || []).find(function (x) { return x.date === today(); }); before = before && JSON.parse(JSON.stringify(before)); } catch (e) {}
        var r = origSync.apply(this, arguments);
        try {
          (TASKS || []).forEach(function (t) {
            if (liveLogged[t.id] > (t.logged || 0)) t.logged = liveLogged[t.id];
            if (activeId != null && t.id === activeId && t.status !== 'approved' && t.status !== 'submitted') t.active = true;
          });
          if (typeof SUBTASKS !== 'undefined') (SUBTASKS || []).forEach(function (t) {
            if (subLogged[t.id] > (t.logged || 0)) t.logged = subLogged[t.id];
            if (activeSub != null && t.id === activeSub && t.status !== 'approved' && t.status !== 'submitted') t.active = true;
          });
        } catch (e) {}
        try {
          if (before) {
            var now = todayAtt();
            ['total', 'active', 'idle'].forEach(function (k) { now[k] = Math.max(now[k] || 0, before[k] || 0); });
            now.taskTime = now.taskTime || {};
            Object.keys(before.taskTime || {}).forEach(function (k) { now.taskTime[k] = Math.max(now.taskTime[k] || 0, before.taskTime[k] || 0); });
            now.tasks = Object.keys(now.taskTime).map(Number);
            if (before.login && !now.login) now.login = before.login;
          }
        } catch (e) {}
        return r;
      };
    }

    /* logout: save the day on the server (logout time, half-day), clear token */
    var origLogout = window.doLogout;
    if (typeof origLogout === 'function') {
      window.doLogout = function () {
        var realDlg = window.sDlg;
        window.sDlg = function (t, m, cb) {
          window.sDlg = realDlg;
          realDlg(t, m, function () {
            var body = trackerBody();
            var done = function () { cb(); DataAPI.logout(); window.buildLogin(); };
            if (body && A.hasToken() && !(window.OMENT_DUTY_REQUIRED && !window.OMENT_DUTY_ON)) API.punchOut(body).catch(function () {}).then(done); else done();
          });
        };
        origLogout();
        window.sDlg = realDlg;
      };
    }
  }

  /* ════════════════════════ ADMIN APP ════════════════════════ */
  if (A.app === 'admin') {
    var onReady = function (fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); };

    onReady(function () {
      var b = document.querySelector('.logout-btn');
      if (b) b.onclick = function () {
        showConfirm('Log out of Oment?', function () { DataAPI.logout(); location.reload(); });
      };
    });

    /* Een AI → through the server. Uses the server key when one is set, unless
       the admin deliberately picked another mode in Een settings. */
    onReady(function () {
      if (!A.hasToken() || typeof eenLoadSettings !== 'function') return;
      var serverUrl = A.base + '/een/chat';
      var saved = null;
      try { saved = localStorage.getItem('oment_een_settings'); } catch (e) {}
      var s = eenLoadSettings();
      if (!s.proxyUrl || s.proxyUrl === '/api/een') s.proxyUrl = serverUrl;
      API.eenStatus().then(function (st) {
        if (st && st.configured && (!saved || s.mode === 'direct' && !s.apiKey)) { s.mode = 'proxy'; s.proxyUrl = serverUrl; }
        eenSaveSettings(s);
      }).catch(function () { eenSaveSettings(s); });
    });
  }

  /* ════════════════════════ LIVE SYNC (both apps) ════════════════════════ */
  var POLL = Number(window.OMENT_POLL_MS);
  if (POLL > 0) {
    var busy = false;
    setInterval(function () {
      if (busy || document.hidden || !A.hasToken()) return;
      if (A.app === 'employee' && !curUser()) return;
      var ae = document.activeElement;                 // user is typing — try next time
      if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
      busy = true;
      A.pollChanged().then(function (changed) {
        if (changed) window.dispatchEvent(new StorageEvent('storage', { key: 'oment_psa_db_v2' }));
      }).catch(function () {}).then(function () { busy = false; });
    }, POLL);
  }
})();
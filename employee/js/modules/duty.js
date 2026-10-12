// ══════════════════════════════════════════════
// DUTY — "Log in" (green) starts the working day, "Log out" (red) ends it.
// You are present only after pressing Log in. The duty timer runs from that
// moment whether or not a task is running. Logging in after the shift start
// (plus grace time) asks for a reason, which the admin sees.
// ══════════════════════════════════════════════
(function () {
  'use strict';
  window.OMENT_DUTY_REQUIRED = !!window.OmentAPI;      // only with the server (offline demo works as before)
  window.OMENT_DUTY_ON = false;
  var started = false;

  function me() { try { return typeof CU !== 'undefined' ? CU : null; } catch (e) { return null; } }
  function today() { return Utils.isoDate(new Date()); }
  function att() {
    var u = me(); if (!u) return null;
    return (DataAPI.raw().attendance || []).find(function (a) { return a.employeeId === u.id && a.date === today(); }) || null;
  }
  function policy() {
    var p = DataAPI.raw().hrPolicy || {};
    return { start: p.shiftStart || '09:30', grace: p.graceMinutes == null ? 15 : p.graceMinutes };
  }
  function lateMinutes() {
    var p = policy(), parts = p.start.split(':'), s = new Date();
    s.setHours(+parts[0] || 9, +parts[1] || 0, 0, 0);
    var m = Math.floor((Date.now() - s.getTime()) / 60000) - p.grace;
    return m > 0 ? m + p.grace : 0;
  }
  function fmt(s) { s = Math.max(0, Math.floor(s)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h + ':' + String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0'); }
  function hm(iso) { return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }); }

  function box() {
    var b = document.getElementById('duty-box');
    if (!b) {
      var wp = document.querySelector('.wp');
      if (!wp || !wp.parentNode) return null;
      b = document.createElement('div'); b.id = 'duty-box';
      b.style.cssText = 'margin:10px 10px 2px;';          // same side spacing as the status pill below
      wp.parentNode.insertBefore(b, wp);
    }
    return b;
  }
  function render() {
    if (!window.OMENT_DUTY_REQUIRED) return;
    var b = box(); if (!b || !me()) return;
    var a = att();
    if (window.OMENT_DUTY_ON) {
      b.innerHTML =
        '<button onclick="dutyLogout()" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:11px 12px;border:0;border-radius:12px;background:#DC2626;color:#fff;font:inherit;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 14px rgba(220,38,38,.25)">\u25A0 Log out</button>' +
        '<div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--t3);margin-top:6px;padding:0 2px">' +
          '<span>On duty since ' + (a && a.firstInAt ? hm(a.firstInAt) : '\u2014') + '</span><span id="duty-tm" style="font-family:var(--mono,monospace);color:var(--green,#059669);font-weight:600"></span></div>';
    } else {
      var p = policy(), late = a && a.firstInAt ? 0 : lateMinutes();
      b.innerHTML =
        '<button onclick="dutyLogin()" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:11px 12px;border:0;border-radius:12px;background:#059669;color:#fff;font:inherit;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 14px rgba(5,150,105,.25)">\u25B6 Log in</button>' +
        '<div style="font-size:11.5px;color:' + (late ? 'var(--red,#DC2626)' : 'var(--t3)') + ';margin-top:6px;text-align:center">' +
          (a && a.lastOutAt ? 'Logged out at ' + hm(a.lastOutAt) + ' \u2014 log in again to continue' : late ? late + ' min late \u00b7 shift starts ' + p.start : 'Shift starts ' + p.start) + '</div>';
    }
    tick();
  }
  function tick() {
    var el = document.getElementById('duty-tm'), a = att();
    if (el && a && a.firstInAt) el.textContent = fmt((Date.now() - Date.parse(a.firstInAt)) / 1000);
  }

  function goOnDuty(reason) {
    var u = me(); if (!u) return;
    var btn = document.querySelector('#duty-box button'); if (btn) { btn.disabled = true; btn.textContent = 'Logging in\u2026'; }
    DataAPI.ensureTodayAttendance(u.id)
      .then(function () { return window.OmentAPI && OmentAPI.heartbeat ? OmentAPI.heartbeat(Object.assign({ resume: true }, reason ? { lateReason: reason } : {})) : null; })
      .then(function () { return DataAPI.init ? DataAPI.init() : null; })
      .then(function () {
        window.OMENT_DUTY_ON = true;
        var a = att();
        try { if (!ws) { ws = true; wsAt = a && a.firstInAt ? Date.parse(a.firstInAt) : Date.now(); } } catch (e) {}
        var bb = document.getElementById('brk-btn'); if (bb) bb.style.display = 'flex';
        if (typeof syncUserState === 'function') syncUserState();
        if (typeof updWP === 'function') updWP();
        if (typeof rAll === 'function') rAll();
        render();
        toast('Logged in \u2014 you are on duty. Have a good day!', 'ok');
      })
      .catch(function (e) { render(); toast(e.message || 'Could not log in', 'err'); });
  }

  window.dutyLogin = function () {
    var a = att(), late = a && a.firstInAt ? 0 : lateMinutes();
    if (!late) return goOnDuty('');
    /* late: a reason is required */
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:6000;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML = '<div style="background:var(--surface,#fff);border-radius:16px;padding:20px;width:min(420px,100%);box-shadow:0 20px 50px rgba(0,0,0,.25)">' +
      '<div style="font-size:17px;font-weight:700;margin-bottom:4px">You are ' + late + ' minutes late</div>' +
      '<div style="font-size:13px;color:var(--t3);margin-bottom:12px">Your shift starts at ' + policy().start + '. Please write why \u2014 your manager will see it.</div>' +
      '<textarea id="duty-reason" rows="3" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--b,#ddd);font:inherit;font-size:14px;resize:vertical" placeholder="e.g. Traffic jam, doctor visit\u2026"></textarea>' +
      '<div id="duty-err" style="color:#DC2626;font-size:12px;min-height:16px;margin-top:4px"></div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px">' +
        '<button id="duty-cancel" style="padding:9px 14px;border-radius:10px;border:1px solid var(--b,#ddd);background:transparent;font:inherit;cursor:pointer">Cancel</button>' +
        '<button id="duty-ok" style="padding:9px 16px;border-radius:10px;border:0;background:#059669;color:#fff;font:inherit;font-weight:700;cursor:pointer">\u25B6 Log in</button></div></div>';
    document.body.appendChild(ov);
    var ta = ov.querySelector('#duty-reason'); setTimeout(function () { ta.focus(); }, 50);
    ov.querySelector('#duty-cancel').onclick = function () { ov.remove(); };
    ov.querySelector('#duty-ok').onclick = function () {
      var r = ta.value.trim();
      if (r.length < 3) { ov.querySelector('#duty-err').textContent = 'Please write a short reason'; ta.focus(); return; }
      ov.remove(); goOnDuty(r);
    };
  };

  window.dutyLogout = function () {
    var finish = function () {
      try { if (trun) stopT(); } catch (e) {}
      try { (TASKS || []).forEach(function (t) { t.active = false; }); ws = false; } catch (e) {}
      var bb = document.getElementById('brk-btn'); if (bb) bb.style.display = 'none';
      var p = window.OmentAPI && OmentAPI.punchOut ? OmentAPI.punchOut({}) : Promise.resolve();
      p.then(function () { return DataAPI.init ? DataAPI.init() : null; }).catch(function () {}).then(function () {
        window.OMENT_DUTY_ON = false;
        if (typeof syncUserState === 'function') syncUserState();
        if (typeof updWP === 'function') updWP();
        if (typeof rAll === 'function') rAll();
        render();
        toast('Logged out \u2014 see you tomorrow!', 'ok');
      });
    };
    if (typeof sDlg === 'function') sDlg('Log out for the day?', 'Your duty time stops and any running task timer is saved.', finish);
    else if (window.confirm('Log out for the day?')) finish();
  };

  /* after the app signs in: resume duty if you were already logged in today */
  setInterval(function () {
    if (!me()) { started = false; return; }
    if (!started) {
      started = true;
      var a = att();
      window.OMENT_DUTY_ON = !!(a && a.firstInAt && !a.lastOutAt);
      if (window.OMENT_DUTY_ON) { try { if (!ws) { ws = true; wsAt = Date.parse(a.firstInAt); } } catch (e) {} if (typeof updWP === 'function') updWP(); }
      /* open the page you were on before the refresh */
      var want = (location.hash || '').slice(1);
      if (want && document.querySelector('[data-v="' + want + '"]') && typeof nav === 'function') nav(want, document.querySelector('[data-v="' + want + '"]'));
      render();
    }
    if (!document.getElementById('duty-box')) render();
    tick();
  }, 1000);

  /* a task timer can only run while you are on duty */
  ['activateTask', 'confirmSwitch'].forEach(function (fn) {
    var orig = window[fn];
    if (typeof orig !== 'function') return;
    window[fn] = function () {
      if (window.OMENT_DUTY_REQUIRED && !window.OMENT_DUTY_ON && me()) {
        toast('Press the green \u201cLog in\u201d button first to start your day', 'err');
        var b = document.querySelector('#duty-box button'); if (b) { b.style.outline = '3px solid rgba(5,150,105,.45)'; setTimeout(function () { b.style.outline = ''; }, 1600); }
        return;
      }
      return orig.apply(this, arguments);
    };
  });

  /* remember the page in the address bar */
  var _nav = window.nav;
  if (typeof _nav === 'function') {
    window.nav = function (name, el) {
      _nav.apply(this, arguments);
      try { if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name); } catch (e) {}
    };
  }
})();
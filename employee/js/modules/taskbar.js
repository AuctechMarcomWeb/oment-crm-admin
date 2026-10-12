// // ══════════════════════════════════════════════
// // TASK BAR — always-visible Start / Pause / Stop / Complete for the current task
// // ══════════════════════════════════════════════
// (function () {
//   'use strict';
//   function bar() {
//     var b = document.getElementById('task-bar');
//     if (!b) {
//       var host = document.querySelector('.content');
//       if (!host) return null;
//       b = document.createElement('div');
//       b.id = 'task-bar';
//       host.appendChild(b);
//     }
//     return b;
//   }
//   /* the running item can be a deliverable (TASKS) or a task inside it (SUBTASKS) */
//   function _tbActive() {
//     var all = [];
//     try { all = all.concat(TASKS || []); } catch (e) {}
//     try { if (typeof SUBTASKS !== 'undefined') all = all.concat(SUBTASKS || []); } catch (e) {}
//     return all.find(function (t) { return t.active; }) || null;
//   }
//   function fmt(s) { s = Math.max(0, Math.floor(s || 0)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' : '') + String(m).padStart(h ? 2 : 1, '0') + ':' + String(x).padStart(2, '0'); }

//   window.tbStop = function () {
//     var a = _tbActive();
//     if (!a) return;
//     stopT();
//     a.active = false;
//     if (typeof updWP === 'function') updWP();
//     if (typeof rDash === 'function') rDash();
//     if (typeof rTracker === 'function' && typeof cv !== 'undefined' && cv === 'tracker') rTracker();
//     toast('Timer stopped \u2014 time saved', 'ok');
//     render();
//   };
//   window.tbToggle = function () { toggleT(); render(); if (typeof rTracker === 'function' && typeof cv !== 'undefined' && cv === 'tracker') rTracker(); };
//   window.tbComplete = function (id) { openDetail(id); setTimeout(function () { if (typeof goSubmit === 'function') goSubmit(id); }, 350); };

//   function render() {
//     var b = bar(); if (!b) return;
//     var signedIn = false; try { signedIn = !!CU; } catch (e) {}
//     var a = signedIn ? _tbActive() : null;
//     /* the Dashboard already shows the big active-task card with the same
//        buttons, so the floating bar is not shown there */
//     var onDash = false; try { onDash = cv === 'dashboard'; } catch (e) {}
//     if (!a || onDash) { b.style.display = 'none'; return; }
//     var running = false; try { running = !!trun; } catch (e) {}
//     b.style.display = 'flex';
//     b.innerHTML =
//       '<span class="tb-dot' + (running ? ' on' : '') + '"></span>' +
//       '<div class="tb-main"><div class="tb-t">' + esc(a.title || 'Task') + '</div>' +
//       '<div class="tb-s">' + (running ? 'Running' : 'Paused') + ' \u00b7 <span id="tb-time">' + fmt(typeof tsecs !== 'undefined' ? tsecs : 0) + '</span></div></div>' +
//       '<button class="tb-btn" onclick="tbToggle()" title="' + (running ? 'Pause' : 'Resume') + '">' + (running ? '\u23F8 Pause' : '\u25B6 Resume') + '</button>' +
//       '<button class="tb-btn" onclick="tbStop()" title="Stop and save time">\u23F9 Stop</button>' +
//       '<button class="tb-btn tb-done" onclick="tbComplete(' + a.id + ')" title="Finish and submit for review">\u2713 Complete</button>';
//   }
//   window.renderTaskBar = render;
//   setInterval(function () {
//     var t = document.getElementById('tb-time');
//     if (t && typeof tsecs !== 'undefined') t.textContent = fmt(tsecs);
//     var a = null; try { a = _tbActive(); } catch (e) {}
//     var b = document.getElementById('task-bar');
//     var shown = b && b.style.display !== 'none';
//     var running = false; try { running = !!trun; } catch (e) {}
//     var onDash = false; try { onDash = cv === 'dashboard'; } catch (e) {}
//     var want = !!a && !onDash;
//     var key = String(running) + (a && a.id) + onDash;
//     if (want !== !!shown || (b && b.dataset.r !== key)) { render(); if (b) b.dataset.r = key; }
//   }, 1000);
// })();

// ══════════════════════════════════════════════
// TASK BAR — always-visible Start / Pause / Stop / Complete for the current task
// ══════════════════════════════════════════════
(function () {
  'use strict';
  function bar() {
    var b = document.getElementById('task-bar');
    if (!b) {
      var host = document.querySelector('.content');
      if (!host) return null;
      b = document.createElement('div');
      b.id = 'task-bar';
      host.appendChild(b);
    }
    return b;
  }
  /* the running item can be a deliverable (TASKS) or a task inside it (SUBTASKS) */
  function _tbActive() {
    var all = [];
    try { all = all.concat(TASKS || []); } catch (e) {}
    try { if (typeof SUBTASKS !== 'undefined') all = all.concat(SUBTASKS || []); } catch (e) {}
    return all.find(function (t) { return t.active; }) || null;
  }
  function fmt(s) { s = Math.max(0, Math.floor(s || 0)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' : '') + String(m).padStart(h ? 2 : 1, '0') + ':' + String(x).padStart(2, '0'); }

  window.tbStop = function () {
    var a = _tbActive();
    if (!a) return;
    stopT();
    a.active = false;
    if (typeof updWP === 'function') updWP();
    if (typeof rDash === 'function') rDash();
    if (typeof rTracker === 'function' && typeof cv !== 'undefined' && cv === 'tracker') rTracker();
    toast('Timer stopped \u2014 time saved', 'ok');
    render();
  };
  window.tbToggle = function () { toggleT(); render(); if (typeof rTracker === 'function' && typeof cv !== 'undefined' && cv === 'tracker') rTracker(); };
  window.tbComplete = function (id) { openDetail(id); setTimeout(function () { if (typeof goSubmit === 'function') goSubmit(id); }, 350); };

  function render() {
    var b = bar(); if (!b) return;
    var signedIn = false; try { signedIn = !!CU; } catch (e) {}
    var a = signedIn ? _tbActive() : null;
    /* the Dashboard already shows the big active-task card with the same
       buttons, so the floating bar is not shown there */
    var onDash = false; try { onDash = cv === 'dashboard'; } catch (e) {}
    if (!a || onDash) { b.style.display = 'none'; return; }
    /* on Messages the chat box is at the bottom, so the bar moves to the top */
    var onMsg = false; try { onMsg = cv === 'messages'; } catch (e) {}
    b.classList.toggle('tb-top', onMsg);
    var running = false; try { running = !!trun; } catch (e) {}
    b.style.display = 'flex';
    b.innerHTML =
      '<span class="tb-dot' + (running ? ' on' : '') + '"></span>' +
      '<div class="tb-main"><div class="tb-t">' + esc(a.title || 'Task') + '</div>' +
      '<div class="tb-s">' + (running ? 'Running' : 'Paused') + ' \u00b7 <span id="tb-time">' + fmt(typeof tsecs !== 'undefined' ? tsecs : 0) + '</span></div></div>' +
      '<button class="tb-btn" onclick="tbToggle()" title="' + (running ? 'Pause' : 'Resume') + '">' + (running ? '\u23F8 Pause' : '\u25B6 Resume') + '</button>' +
      '<button class="tb-btn" onclick="tbStop()" title="Stop and save time">\u23F9 Stop</button>' +
      '<button class="tb-btn tb-done" onclick="tbComplete(' + a.id + ')" title="Finish and submit for review">\u2713 Complete</button>';
  }
  window.renderTaskBar = render;
  setInterval(function () {
    var t = document.getElementById('tb-time');
    if (t && typeof tsecs !== 'undefined') t.textContent = fmt(tsecs);
    var a = null; try { a = _tbActive(); } catch (e) {}
    var b = document.getElementById('task-bar');
    var shown = b && b.style.display !== 'none';
    var running = false; try { running = !!trun; } catch (e) {}
    var onDash = false; try { onDash = cv === 'dashboard'; } catch (e) {}
    var want = !!a && !onDash;
    var onMsg = false; try { onMsg = cv === 'messages'; } catch (e) {}
    var key = String(running) + (a && a.id) + onDash + onMsg;
    if (want !== !!shown || (b && b.dataset.r !== key)) { render(); if (b) b.dataset.r = key; }
  }, 1000);
})();
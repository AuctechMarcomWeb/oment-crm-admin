/* ============================================================================
   NOTIFY POP — makes new notifications noticeable (admin + employee apps)
   ----------------------------------------------------------------------------
   • a card slides in at the top-right with the title and a short line
   • a soft "ding" (only after you have clicked somewhere in the app once —
     browsers block sound before that)
   • the browser tab shows the count: "(3) Oment"
   Clicking the card opens exactly what the notification is about.
   ============================================================================ */
(function (root) {
  'use strict';
  var baseTitle = null, seen = null, stack = null;

  function css() {
    if (document.getElementById('npop-css')) return;
    var st = document.createElement('style'); st.id = 'npop-css';
    st.textContent =
      '#npop-stack{position:fixed;top:14px;right:14px;z-index:5000;display:flex;flex-direction:column;gap:8px;width:min(360px,calc(100vw - 28px));pointer-events:none}' +
      '.npop{pointer-events:auto;display:flex;gap:10px;align-items:flex-start;padding:12px 12px 12px 14px;border-radius:14px;background:#fff;color:#18171A;' +
      'box-shadow:0 10px 30px rgba(0,0,0,.18);border:1px solid rgba(0,0,0,.06);cursor:pointer;transform:translateX(120%);opacity:0;transition:transform .28s ease,opacity .28s ease;font-family:inherit}' +
      '.npop.in{transform:none;opacity:1}' +
      '.npop .ni{width:34px;height:34px;border-radius:10px;background:#EFF6FF;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}' +
      '.npop .nt{font-weight:650;font-size:13.5px;line-height:1.35}' +
      '.npop .ns{font-size:12.5px;color:#57555B;line-height:1.4;margin-top:2px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}' +
      '.npop .nx{margin-left:auto;border:0;background:none;color:#8E8B90;font-size:16px;cursor:pointer;line-height:1;padding:0 2px}' +
      '@media (prefers-color-scheme: dark){.npop{background:#1C1B1E;color:#F3F2EF;border-color:rgba(255,255,255,.1)}.npop .ns{color:#B6B3B9}.npop .ni{background:rgba(76,155,255,.15)}}' +
      '@media (prefers-reduced-motion: reduce){.npop{transition:none}}';
    document.head.appendChild(st);
  }

  var audioOK = false;
  document.addEventListener('pointerdown', function () { audioOK = true; }, { once: true, capture: true });
  function ding() {
    if (!audioOK) return;
    try {
      var C = root.AudioContext || root.webkitAudioContext; if (!C) return;
      var ctx = new C(), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(880, ctx.currentTime); o.frequency.setValueAtTime(1320, ctx.currentTime + 0.09);
      g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.36);
      setTimeout(function () { try { ctx.close(); } catch (e) {} }, 600);
    } catch (e) {}
  }

  function show(n, onOpen) {
    css();
    if (!stack) { stack = document.createElement('div'); stack.id = 'npop-stack'; document.body.appendChild(stack); }
    var el = document.createElement('div'); el.className = 'npop'; el.setAttribute('role', 'status');
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    el.innerHTML = '<div class="ni">' + (n.icon || '\uD83D\uDD14') + '</div><div style="flex:1;min-width:0"><div class="nt">' + esc(n.title) + '</div>' +
      (n.sub ? '<div class="ns">' + esc(n.sub) + '</div>' : '') + '</div><button class="nx" aria-label="Close">\u2715</button>';
    var close = function () { el.classList.remove('in'); setTimeout(function () { el.remove(); }, 300); };
    el.querySelector('.nx').onclick = function (e) { e.stopPropagation(); close(); };
    el.onclick = function () { close(); try { onOpen && onOpen(); } catch (e) {} };
    stack.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('in'); });
    setTimeout(close, 7000);
    while (stack.children.length > 3) stack.firstChild.remove();
  }

  /* call with the current list: [{id, title, sub, unread, icon}] and a function
     that opens one. New unread items pop up; the tab title shows the count. */
  root.NotifyPop = {
    update: function (list, open) {
      list = list || [];
      var unread = list.filter(function (n) { return n.unread; });
      if (baseTitle === null) baseTitle = document.title.replace(/^\(\d+\)\s*/, '');
      document.title = (unread.length ? '(' + unread.length + ') ' : '') + baseTitle;
      if (seen === null) { seen = {}; list.forEach(function (n) { seen[n.id] = 1; }); return; }   // first load: no pop-ups
      var fresh = unread.filter(function (n) { return !seen[n.id]; });
      list.forEach(function (n) { seen[n.id] = 1; });
      if (!fresh.length) return;
      fresh.slice(0, 3).reverse().forEach(function (n) { show(n, function () { open(n.id); }); });
      ding();
    }
  };
})(window);
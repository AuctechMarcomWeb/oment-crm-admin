
/* ══════════════════ TERM DETAIL MODAL ══════════════════ */
function showTermHelp(key) {
  var t = Glossary.get(key);
  if (!t) return;
  openModal(t.title,
    '<div style="font-size:13.5px;line-height:1.7;color:var(--t2)">' + t.long + '</div>' +
    (t.formula ? '<div class="term-help-formula"><span>How it\'s calculated</span>' +
      esc(t.formula) + '</div>' : ''),
    '<button class="btn btn-secondary" onclick="closeModal()">Got it</button>' +
    '<button class="btn btn-primary" onclick="closeModal();gotoModule(\'help\')">See all terms</button>');
}

/* ══════════════════ HELP MODULE (full glossary) ══════════════════ */
var HELP_QUERY = '';

var HELP_GROUPS = [
  { title: 'Money', icon: '\uD83D\uDCB0', keys: ['margin','loadedCost','overheadMultiplier','effectiveRate',
      'wip','burnVsDelivery','forecastMargin','recognisedRevenue','outstanding','gstNote'] },
  { title: 'People', icon: '\uD83D\uDC65', keys: ['utilisation','committedAhead','costMultiple','contribution',
      'payableDays','graceWindow','regularisation','proRatedLeave','workingDays'] },
  { title: 'Delivery', icon: '\uD83D\uDCE6', keys: ['deliverable','approvalLoop','estimateDrift','firstPassApproval'] },
  { title: 'Billing', icon: '\uD83E\uDDFE', keys: ['invoiceNumbering','gstSplit'] }
];

function renderHelp() {
  var v = document.getElementById('view-help');
  if (!v) return;
  var q = HELP_QUERY.toLowerCase().trim();

  v.innerHTML =
    '<div style="max-width:760px">' +
      '<div style="margin-bottom:18px">' +
        '<div class="section-title" style="font-size:20px">What everything means</div>' +
        '<div class="section-sub">What every number means, in plain language</div>' +
      '</div>' +

      '<div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">' +
        '<input class="form-input" style="flex:1;min-width:200px" id="help-search" ' +
          'placeholder="Search a term\u2026" value="' + escAttr(HELP_QUERY) + '" ' +
          'aria-label="Search glossary" oninput="helpSearch(this.value)">' +
      '</div>' +

      HELP_GROUPS.map(function (g) {
        var items = g.keys.map(function (k) { return Glossary.get(k); }).filter(Boolean)
          .filter(function (t) {
            if (!q) return true;
            return (t.title + ' ' + t.short + ' ' + t.long).toLowerCase().indexOf(q) >= 0;
          });
        if (!items.length) return '';
        return '<div style="margin-bottom:26px">' +
          '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;' +
            'color:var(--t3);margin-bottom:10px">' + g.icon + ' ' + g.title + '</div>' +
          items.map(function (t) {
            return '<div class="card card-pad" style="margin-bottom:10px">' +
              '<div style="font-size:14px;font-weight:700;margin-bottom:5px">' + esc(t.title) + '</div>' +
              '<div style="font-size:13px;color:var(--t2);line-height:1.7">' + t.long + '</div>' +
              (t.formula ? '<div class="term-help-formula" style="margin-top:11px">' +
                '<span>How it\'s calculated</span>' + esc(t.formula) + '</div>' : '') +
            '</div>';
          }).join('') +
        '</div>';
      }).join('') +

      (q && !HELP_GROUPS.some(function (g) {
        return g.keys.some(function (k) {
          var t = Glossary.get(k);
          return t && (t.title + ' ' + t.short + ' ' + t.long).toLowerCase().indexOf(q) >= 0;
        });
      }) ? '<div class="empty-teach"><div class="empty-teach-icon">\uD83D\uDD0D</div>' +
        '<div class="empty-teach-title">Nothing matches "' + esc(HELP_QUERY) + '"</div>' +
        '<div class="empty-teach-body">Try a simpler word \u2014 like "margin", "leave" or "invoice".</div></div>' : '') +
    '</div>';

  var si = document.getElementById('help-search');
  if (si && HELP_QUERY) { si.focus(); si.setSelectionRange(si.value.length, si.value.length); }
}

function helpSearch(v) { HELP_QUERY = v; renderHelp(); }

/* ══════════════════ ACCESSIBILITY ══════════════════ */
var _trapEl = null, _trapPrev = null, _trapHandler = null;

function trapFocus(el) {
  releaseFocus();
  if (!el) return;
  _trapEl = el;
  _trapPrev = document.activeElement;

  _trapHandler = function (e) {
    if (e.key === 'Escape') {
      return;
    }
    if (e.key !== 'Tab') return;
    var focusables = el.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), ' +
      'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', _trapHandler, true);
}

function releaseFocus() {
  if (_trapHandler) document.removeEventListener('keydown', _trapHandler, true);
  _trapHandler = null;
  _trapEl = null;
  if (_trapPrev && _trapPrev.focus) { try { _trapPrev.focus(); } catch (e) {} }
  _trapPrev = null;
}

(function wrapDialogs() {
  if (typeof openModal === 'function') {
    var _om = openModal;
    window.openModal = function (title, body, footer) {
      _om(title, body, footer);
      var box = document.querySelector('#modal-overlay .modal-box');
      var ov = document.getElementById('modal-overlay');
      if (ov) { ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); }
      if (box) {
        trapFocus(box);
        var f = box.querySelector('input,textarea,select,button');
        if (f) setTimeout(function () { try { f.focus(); } catch (e) {} }, 30);
      }
    };
  }
  if (typeof closeModal === 'function') {
    var _cm = closeModal;
    window.closeModal = function (e) { _cm(e); releaseFocus(); };
  }
  if (typeof openPanel === 'function') {
    var _op = openPanel;
    window.openPanel = function (t, b, f) {
      _op(t, b, f);
      var p = document.getElementById('slide-panel');
      if (p) { p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); trapFocus(p); }
    };
  }
  if (typeof closePanel === 'function') {
    var _cp = closePanel;
    window.closePanel = function () { _cp(); releaseFocus(); };
  }
})();

function makeRowsAccessible(container) {
  var scope = container || document;
  scope.querySelectorAll('[onclick]:not(button):not(a):not([tabindex])').forEach(function (el) {
    if (el.closest('.help-dot')) return;
    el.setAttribute('tabindex', '0');
    if (!el.getAttribute('role')) el.setAttribute('role', 'button');
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.click();
      }
    });
  });
}

/* Live region — toast aur status changes screen reader ko announce ho */
function announce(msg) {
  var el = document.getElementById('sr-live');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sr-live';
    el.className = 'sr-only';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = '';
  setTimeout(function () { el.textContent = msg; }, 60);
}

(function wrapToast() {
  if (typeof toast !== 'function') return;
  var _t = toast;
  window.toast = function (msg, type) { _t(msg, type); announce(msg); };
})();


(function wrapNavigation() {
  if (typeof gotoModule !== 'function') return;
  var _gm = gotoModule;
  window.gotoModule = function (name, skipHistory) {
    _gm(name, skipHistory);
    var view = document.getElementById('view-' + name);
    if (view) setTimeout(function () { makeRowsAccessible(view); }, 60);
    var title = document.getElementById('topbar-title');
    if (title) announce(title.textContent + ' opened');
  };
})();

/* ══════════════════ PAGE GUIDES ══════════════════ */
function injectGuide(name) {
  if (typeof PageGuide === 'undefined') return;
  var view = document.getElementById('view-' + name);
  if (!view) return;
  var existing = view.querySelector('.page-guide, .guide-reopen');
  if (existing) existing.remove();
  var html = PageGuide.html(name);
  if (!html) return;
  var wrap = document.createElement('div');
  wrap.innerHTML = html;
  var node = wrap.firstElementChild;
  if (node) view.insertBefore(node, view.firstChild);
}

function hideGuide(name) {
  PageGuide.hide(name);
  injectGuide(name);
}
function showGuide(name) {
  var h = [];
  try { h = JSON.parse(localStorage.getItem('oment_guides_hidden') || '[]'); } catch (e) {}
  h = h.filter(function (x) { return x !== name; });
  try { localStorage.setItem('oment_guides_hidden', JSON.stringify(h)); } catch (e) {}
  injectGuide(name);
}
function showAllGuides() {
  PageGuide.showAll();
  injectGuide(STATE.currentModule);
  toast('All page guides restored', 'success');
}

(function wrapGuides() {
  if (typeof gotoModule !== 'function') return;
  var _g = gotoModule;
  window.gotoModule = function (name, skipHistory) {
    _g(name, skipHistory);
    setTimeout(function () { injectGuide(name); }, 40);
  };
})();

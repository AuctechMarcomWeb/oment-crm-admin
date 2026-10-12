/* ============================================================================
   EMPLOYEE PENALTIES
   Adds a penalty/appeal section to the existing Wallet screen without changing
   the existing wallet module. It works even when general wallet money is hidden.
   ============================================================================ */
'use strict';

(function () {
  function rupee(paise) {
    return Utils.fmtRupee(Math.max(0, Number(paise) || 0)).replace('.00', '');
  }
  function escv(v) { return typeof esc === 'function' ? esc(String(v == null ? '' : v)) : String(v == null ? '' : v); }

  function panelHtml(rows) {
    rows = rows || [];
    var h = '<div id="employee-penalties-panel" class="card" style="margin:13px 0;border-left:3px solid var(--red)">';
    h += '<div class="wl-sec">⚖️ My Penalties</div>';
    if (!rows.length) {
      h += '<div style="font-size:12.5px;color:var(--t3);padding:5px 0">No penalties have been applied to you.</div></div>';
      return h;
    }
    h += '<div style="font-size:12px;color:var(--t3);margin-bottom:10px">If you believe a penalty is incorrect or too high, you can appeal it with a written reason.</div>';
    rows.slice().sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); }).forEach(function (x) {
      var p = x.meta && x.meta.penalty || {};
      var status = x.appealStatus || 'NONE';
      var amount = x.currentPenaltyPaise != null ? x.currentPenaltyPaise : Math.abs(x.amountPaise || 0);
      h += '<div style="border-top:1px solid var(--b1);padding:11px 0;margin-top:10px">';
      h += '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">';
      h += '<div style="min-width:0"><div style="font-size:13px;font-weight:650">' + escv(p.ruleName || 'Penalty') + '</div>';
      h += '<div style="font-size:11.5px;color:var(--t3);margin-top:3px">Date: ' + escv(p.date || '—') + ' · Days: ' + escv(p.penaltyDays == null ? '—' : p.penaltyDays) + '</div></div>';
      h += '<div style="font-family:var(--mono);font-weight:700;color:var(--red);white-space:nowrap">−' + rupee(amount) + '</div></div>';
      h += '<div style="font-size:12px;color:var(--t2);margin-top:5px">' + escv(p.reason || x.why || '') + '</div>';

      if (status === 'NONE') {
        h += '<button class="wl-link" style="margin-top:8px" onclick="employeeAppealPenalty(\'' + x.id + '\')">Appeal this penalty</button>';
      } else if (status === 'OPEN') {
        h += '<div style="margin-top:7px"><span class="badge b-ir">Appeal pending</span></div>';
        h += '<div style="font-size:11.5px;color:var(--t3);margin-top:5px">Your appeal has been sent to the admin.</div>';
      } else {
        h += '<div style="margin-top:7px"><span class="badge ' + (status === 'ACCEPTED' ? 'b-done' : 'b-rej') + '">' + (status === 'ACCEPTED' ? 'Appeal accepted' : 'Appeal rejected') + '</span></div>';
        if (x.appeal && x.appeal.resolutionNote) h += '<div style="font-size:11.5px;color:var(--t2);margin-top:6px"><b>Admin response:</b> ' + escv(x.appeal.resolutionNote) + '</div>';
      }
      h += '</div>';
    });
    return h + '</div>';
  }

  function renderEmployeePenaltyPanel() {
    var body = document.getElementById('wallet-body');
    if (!body || !window.CU || typeof Wallet === 'undefined' || typeof Wallet.getPenaltyRecords !== 'function') return;
    Wallet.getPenaltyRecords({ employeeId: CU.id }).then(function (rows) {
      var old = document.getElementById('employee-penalties-panel');
      if (old) old.remove();
      body.insertAdjacentHTML('afterbegin', panelHtml(rows));
    }).catch(function (err) {
      console.error('Penalty panel:', err);
    });
  }

  window.employeeAppealPenalty = function (entryId) {
    if (!window.CU || typeof Wallet === 'undefined') return;
    var body = '<div style="font-size:12.5px;color:var(--t2);line-height:1.55;margin-bottom:10px">Explain why you believe this penalty is incorrect, too high, or should be reconsidered. The admin will see your exact reason.</div>' +
      '<textarea class="fta" id="employee-penalty-appeal" placeholder="Write your appeal reason…" style="min-height:110px"></textarea>';
    if (typeof oMod === 'function') {
      oMod('Appeal penalty', body, [
        { l: 'Cancel', cls: 'btn-ghost', a: cMod },
        { l: 'Submit Appeal', cls: 'btn-solid', a: function () {
          var reason = String((document.getElementById('employee-penalty-appeal') || {}).value || '').trim();
          if (!reason) return toast('Please enter your reason', 'err');
          Wallet.raisePenaltyAppeal(entryId, CU.id, reason).then(function () {
            cMod();
            if (typeof syncUserState === 'function') syncUserState();
            renderEmployeePenaltyPanel();
            if (typeof updBadges === 'function') updBadges();
            toast('Penalty appeal submitted', 'ok');
          }).catch(function (err) { toast(err.message || 'Appeal could not be submitted', 'err'); });
        } }
      ]);
    }
  };

  function hookWallet() {
    if (typeof window.rWallet === 'function' && !window.rWallet.__penaltyHooked) {
      var original = window.rWallet;
      var wrapped = function () {
        original.apply(this, arguments);
        setTimeout(renderEmployeePenaltyPanel, 0);
      };
      wrapped.__penaltyHooked = true;
      window.rWallet = wrapped;
    }
    /* Some builds render Wallet after this module loads; keep the panel
       synchronized without requiring a page refresh. */
    if (window.CU && document.getElementById('wallet-body')) setTimeout(renderEmployeePenaltyPanel, 0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookWallet);
  else hookWallet();
  setTimeout(hookWallet, 100);
})();

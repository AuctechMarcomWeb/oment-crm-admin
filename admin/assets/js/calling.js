/* ============================================================
   CALLING MODULE — Dialpad Style
   ============================================================ */
function renderCalling() {
  const v = document.getElementById('view-calling');
  const statusColors = {Connected:'var(--green)',Missed:'var(--amber)',Failed:'var(--red)'};
  v.innerHTML = `
    <style>
      /* Dialpad-style design system */
      .dp-layout {
        display: grid;
        grid-template-columns: 1fr 380px;
        gap: 20px;
      }
      .dp-layout > * { min-width: 0; }
      /* Dialpad header */
      .dp-toprow {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
      }
      .dp-logo {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .dp-logo-icon {
        width: 36px; height: 36px;
        background: #6C47FF;
        border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
      }
      .dp-logo-text { font-size: 18px; font-weight: 700; color: var(--t1); letter-spacing: -0.3px; }
      .dp-badge {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 5px 12px;
        border-radius: 999px;
        font-size: 12px; font-weight: 600;
        background: #FEF3C7; color: #92400E;
        border: 1px solid #FDE68A;
      }
      /* Dialer card */
      .dp-dialer-card {
        background: #fff;
        border-radius: 16px;
        border: 1px solid #E5E7EB;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        padding: 28px 24px;
        text-align: center;
        margin-bottom: 20px;
      }
      .dp-number-display {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        margin-bottom: 24px;
      }
      .dp-flag-select {
        display: flex; align-items: center; gap: 4px;
        padding: 8px 10px;
        background: #F3F4F6;
        border: 1.5px solid #E5E7EB;
        border-radius: 10px;
        font-size: 13px;
        cursor: pointer;
        transition: border-color .15s;
      }
      .dp-flag-select:hover { border-color: #6C47FF; }
      .dp-flag-select select {
        border: none; background: transparent; outline: none;
        font-size: 13px; font-weight: 500; cursor: pointer; color: #374151;
        font-family: var(--font);
      }
      .dp-phone-input {
        flex: 1;
        border: none; background: transparent; outline: none;
        font-size: 28px; font-weight: 300;
        color: #111827;
        font-family: var(--mono);
        text-align: center;
        letter-spacing: 0.04em;
        min-width: 0;
      }
      .dp-phone-input::placeholder { color: #D1D5DB; }
      .dp-delete-btn {
        width: 36px; height: 36px;
        border: none; background: none; cursor: pointer;
        border-radius: 8px; color: #9CA3AF;
        display: flex; align-items: center; justify-content: center;
        transition: all .15s;
      }
      .dp-delete-btn:hover { background: #FEE2E2; color: #DC2626; }
      /* Keypad */
      .dp-keypad {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        max-width: 280px;
        margin: 0 auto 24px;
      }
      .dp-key {
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        height: 56px;
        border: 1.5px solid #E5E7EB;
        border-radius: 12px;
        font-size: 20px; font-weight: 400;
        color: #111827;
        cursor: pointer;
        background: #fff;
        transition: all .12s;
        user-select: none;
      }
      .dp-key:hover { background: #F5F3FF; border-color: #6C47FF; color: #6C47FF; transform: translateY(-1px); box-shadow: 0 3px 10px rgba(108,71,255,0.15); }
      .dp-key:active { transform: scale(0.95); }
      .dp-key-sub { font-size: 8px; color: #9CA3AF; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 1px; }
      .dp-key:hover .dp-key-sub { color: #6C47FF; }
      /* Call actions */
      .dp-call-actions {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 20px;
      }
      .dp-call-btn {
        width: 64px; height: 64px;
        border-radius: 50%;
        border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all .2s;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      }
      .dp-call-btn.call { background: linear-gradient(135deg,#4ADE80,#16A34A); }
      .dp-call-btn.call:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(22,163,74,0.4); }
      .dp-call-btn.endcall { background: linear-gradient(135deg,#F87171,#DC2626); }
      .dp-call-btn.endcall:disabled { background: #E5E7EB; box-shadow: none; cursor: not-allowed; }
      .dp-call-btn.msg { background: linear-gradient(135deg,#60A5FA,#2563EB); }
      .dp-call-btn.msg:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(37,99,235,0.4); }
      /* Recent calls card */
      .dp-calls-card {
        background: #fff;
        border-radius: 16px;
        border: 1px solid #E5E7EB;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        overflow: hidden;
      }
      .dp-calls-header {
        padding: 16px 20px;
        border-bottom: 1px solid #F3F4F6;
        display: flex; align-items: center; justify-content: space-between;
      }
      .dp-calls-title { font-size: 14px; font-weight: 700; color: #111827; }
      .dp-filter-tabs { display: flex; gap: 4px; }
      .dp-filter-tab {
        padding: 5px 12px;
        border-radius: 999px;
        font-size: 12px; font-weight: 500;
        border: none; cursor: pointer;
        transition: all .12s;
        font-family: var(--font);
      }
      .dp-filter-tab.active { background: #6C47FF; color: #fff; }
      .dp-filter-tab:not(.active) { background: #F3F4F6; color: #6B7280; }
      .dp-filter-tab:not(.active):hover { background: #E5E7EB; }
      .dp-call-row {
        display: flex; align-items: center; gap: 12px;
        padding: 12px 20px;
        border-bottom: 1px solid #F9FAFB;
        transition: background .1s;
        cursor: pointer;
      }
      .dp-call-row:last-child { border-bottom: none; }
      .dp-call-row:hover { background: #F9FAFB; }
      .dp-call-icon {
        width: 38px; height: 38px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        font-size: 13px; font-weight: 700; color: #fff;
      }
      .dp-call-meta { flex: 1; min-width: 0; }
      .dp-call-name { font-size: 13px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .dp-call-num { font-size: 11.5px; color: #9CA3AF; font-family: var(--mono); margin-top: 1px; }
      .dp-call-right { text-align: right; flex-shrink: 0; }
      .dp-call-dur { font-size: 12px; color: #6B7280; font-family: var(--mono); }
      .dp-call-date { font-size: 10.5px; color: #D1D5DB; margin-top: 2px; }
      .dp-type-badge {
        display: inline-flex; align-items: center; gap: 3px;
        font-size: 11px; font-weight: 600; padding: 2px 7px;
        border-radius: 999px;
      }
      .dp-type-badge.in { background: #EFF6FF; color: #2563EB; }
      .dp-type-badge.out { background: #ECFDF5; color: #059669; }
      .dp-type-badge.miss { background: #FFFBEB; color: #D97706; }
      .dp-type-badge.fail { background: #FEF2F2; color: #DC2626; }
      /* Right panel */
      .dp-connect-card {
        background: #fff;
        border-radius: 16px;
        border: 1px solid #E5E7EB;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        padding: 24px;
      }
      .dp-connect-title { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 4px; }
      .dp-connect-sub { font-size: 12.5px; color: #9CA3AF; margin-bottom: 20px; }
      .dp-provider-tabs { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 20px; }
      .dp-provider-tab {
        padding: 12px 8px;
        border: 1.5px solid #E5E7EB;
        border-radius: 12px;
        text-align: center;
        cursor: pointer;
        transition: all .15s;
        font-size: 12px; font-weight: 600; color: #6B7280;
      }
      .dp-provider-tab:hover { border-color: #6C47FF; color: #6C47FF; background: #F5F3FF; }
      .dp-provider-tab.selected { border-color: #6C47FF; background: #F5F3FF; color: #6C47FF; }
      .dp-provider-icon { font-size: 20px; margin-bottom: 4px; }
      .dp-form-label { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px; display: block; }
      .dp-form-input {
        width: 100%; height: 38px;
        background: #F9FAFB; border: 1.5px solid #E5E7EB;
        border-radius: 10px; padding: 0 12px;
        font-size: 13px; color: #111827; outline: none;
        transition: all .15s; font-family: var(--font);
        margin-bottom: 14px;
      }
      .dp-form-input:focus { border-color: #6C47FF; background: #fff; box-shadow: 0 0 0 3px rgba(108,71,255,0.1); }
      .dp-connect-btn {
        width: 100%; height: 42px;
        background: linear-gradient(135deg, #7C3AED, #6C47FF);
        color: #fff; border: none; border-radius: 12px;
        font-size: 14px; font-weight: 600; cursor: pointer;
        transition: all .15s; margin-bottom: 12px;
        font-family: var(--font);
        display: flex; align-items: center; justify-content: center; gap: 8px;
      }
      .dp-connect-btn:hover { background: linear-gradient(135deg, #6D28D9, #5B3FD9); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(108,71,255,.3); }
      .dp-status-row {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 14px;
        background: #FEF2F2; border-radius: 10px;
        font-size: 12px; color: #6B7280;
        margin-bottom: 16px;
      }
      .dp-status-dot { width: 8px; height: 8px; border-radius: 50%; background: #DC2626; margin-right: 6px; display: inline-block; }
      .dp-setup-steps {
        background: #F9FAFB; border-radius: 12px; padding: 16px;
        font-size: 12px; color: #6B7280; line-height: 1.8;
      }
      .dp-step { display: flex; gap: 10px; margin-bottom: 8px; align-items: flex-start; }
      .dp-step-num {
        width: 20px; height: 20px; border-radius: 50%;
        background: #6C47FF; color: #fff;
        font-size: 10px; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; margin-top: 1px;
      }
      @media (max-width: 1024px) {
        .dp-layout { grid-template-columns: 1fr; min-width: 0; }
      }
      @media (max-width: 768px) {
        .dp-toprow { margin-bottom: 14px; }
        .dp-logo-icon { width: 32px; height: 32px; }
        .dp-logo-text { font-size: 16px; }
        .dp-badge { font-size: 11px; padding: 4px 9px; }
        .dp-dialer-card {
          padding: 18px 14px;
          margin-bottom: 14px;
          border-radius: 14px;
        }
        .dp-number-display { gap: 8px; margin-bottom: 18px; }
        .dp-flag-select { padding: 7px 8px; font-size: 12px; }
        .dp-flag-select select { font-size: 12px; }
        .dp-phone-input { font-size: 22px; }
        .dp-delete-btn { width: 32px; height: 32px; }
        .dp-keypad {
          gap: 8px;
          max-width: 100%;
          margin-bottom: 20px;
        }
        .dp-key {
          height: 56px;
          font-size: 22px;
          border-radius: 14px;
        }
        .dp-key-sub { font-size: 9px; }
        .dp-call-actions { gap: 16px; }
        .dp-call-btn { width: 58px; height: 58px; }
        .dp-call-btn svg { width: 22px; height: 22px; }
        .dp-calls-card { border-radius: 14px; }
        .dp-calls-header { padding: 14px 16px; flex-wrap: wrap; gap: 10px; }
        .dp-calls-title { font-size: 13px; }
        .dp-filter-tab { padding: 5px 10px; font-size: 11px; }
        .dp-call-row { padding: 11px 14px; gap: 10px; }
        .dp-call-icon { width: 34px; height: 34px; font-size: 12px; }
        .dp-call-meta { min-width: 0; }
        .dp-call-name { font-size: 12.5px; }
        .dp-call-num { font-size: 11px; }
        .dp-call-right { min-width: 0; }
        .dp-call-dur { font-size: 11px; }
        .dp-call-date { font-size: 10px; }
        .dp-type-badge { font-size: 10px; padding: 2px 6px; }
        .dp-connect-card { padding: 18px 16px; border-radius: 14px; }
        .dp-connect-title { font-size: 14px; }
        .dp-connect-sub { font-size: 12px; margin-bottom: 16px; }
        .dp-provider-tab { padding: 10px 6px; font-size: 11px; }
        .dp-provider-icon { font-size: 18px; }
        .dp-form-input { height: 40px; font-size: 13px; }
        .dp-connect-btn { height: 44px; font-size: 13.5px; }
        .dp-setup-steps { padding: 14px; font-size: 11.5px; }
      }
      @media (max-width: 480px) {
        .dp-dialer-card { padding: 14px 10px; }
        .dp-phone-input { font-size: 19px; }
        .dp-number-display { gap: 6px; }
        .dp-flag-select { padding: 6px 6px; }
        .dp-keypad { gap: 6px; }
        .dp-key { height: 52px; font-size: 20px; }
        .dp-call-actions { gap: 12px; }
        .dp-call-btn { width: 54px; height: 54px; }
        .dp-call-btn.call { width: 60px; height: 60px; }
        .dp-call-btn svg { width: 20px; height: 20px; }
        .dp-call-btn.call svg { width: 24px; height: 24px; }
        /* Tighten the recent-calls row so the type badge always fits */
        .dp-call-row { padding: 10px 12px; gap: 8px; }
        .dp-call-icon { width: 30px; height: 30px; font-size: 11px; }
        .dp-call-num, .dp-call-date { display: none; }
        .dp-call-name { font-size: 12.5px; }
        .dp-type-badge { font-size: 9.5px; padding: 2px 6px; gap: 2px; }
        .dp-call-dur { font-size: 10.5px; margin-top: 2px; }
        .dp-calls-header { padding: 12px 14px; }
        /* Force filter tabs into a single row that scrolls if needed */
        .dp-filter-tabs { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .dp-filter-tab { flex-shrink: 0; }
      }
    </style>

    <!-- Top Row -->
    <div class="dp-toprow">
      <div class="dp-logo">
        <div class="dp-logo-icon">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="white" stroke-width="2"/></svg>
        </div>
        <span class="dp-logo-text">Dialpad</span>
      </div>
      <span class="dp-badge">
        <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#F59E0B"/></svg>
        API Not Connected
      </span>
    </div>

    <div class="dp-layout">
      <!-- LEFT: Dialer + Recent calls -->
      <div>
        <!-- Dialer Card -->
        <div class="dp-dialer-card">
          <div class="dp-number-display">
            <div class="dp-flag-select">
              <span>🇮🇳</span>
              <select><option>+91</option><option>+1</option><option>+44</option><option>+61</option><option>+65</option></select>
            </div>
            <input type="tel" id="phone-input" class="dp-phone-input" value="${STATE.phoneInput||''}" placeholder="Enter a number" oninput="STATE.phoneInput=this.value" inputmode="tel" autocomplete="off">
            <button class="dp-delete-btn" onclick="if(STATE.phoneInput){STATE.phoneInput=STATE.phoneInput.slice(0,-1);document.getElementById('phone-input').value=STATE.phoneInput}" title="Delete">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><line x1="18" y1="9" x2="12" y2="15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="12" y1="9" x2="18" y2="15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            </button>
          </div>

          <!-- Keypad -->
          <div class="dp-keypad">
            ${['1','2','3','4','5','6','7','8','9','*','0','#'].map(d => {
              const sub = {2:'ABC',3:'DEF',4:'GHI',5:'JKL',6:'MNO',7:'PQRS',8:'TUV',9:'WXYZ',0:'+'};
              return `<button class="dp-key" onclick="dialPress('${d}')">
                ${d}
                ${sub[d] ? `<div class="dp-key-sub">${sub[d]}</div>` : ''}
              </button>`;
            }).join('')}
          </div>

          <!-- Call buttons -->
          <div class="dp-call-actions">
            <button class="dp-call-btn msg" onclick="toast('SMS feature — connect your provider first','error')" title="Message">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <button class="dp-call-btn call" onclick="makeCall()" title="Call">
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="white" stroke-width="2"/></svg>
            </button>
            <button class="dp-call-btn endcall" disabled title="End (disabled)">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.42 19.42 0 01-3.33-2.67m-2.67-3.34a19.79 19.79 0 01-3.07-8.63A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round"/><line x1="23" y1="1" x2="1" y2="23" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>

        <!-- Recent Calls -->
        <div class="dp-calls-card">
          <div class="dp-calls-header">
            <span class="dp-calls-title">Recent Calls</span>
            <div class="dp-filter-tabs">
              <button class="dp-filter-tab active">All</button>
              <button class="dp-filter-tab" onclick="toast('Filter applied','success')">Missed</button>
              <button class="dp-filter-tab" onclick="toast('Filter applied','success')">Outbound</button>
            </div>
          </div>
          ${STATE.callLogs.map((c,i) => {
            const colors = ['#6C47FF','#2563EB','#059669','#D97706','#7C3AED','#DC2626'];
            const initials = c.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
            const typeClass = c.type==='Inbound'?'in':c.status==='Missed'?'miss':c.status==='Failed'?'fail':'out';
            const typeLabel = c.status==='Missed'?'Missed':c.status==='Failed'?'Failed':c.type==='Inbound'?'↓ Inbound':'↑ Outbound';
            return `<div class="dp-call-row" onclick="document.getElementById('phone-input').value='${c.number.replace(/\s/g,'')}';STATE.phoneInput='${c.number.replace(/\s/g,'')}';toast('Number loaded','success')">
              <div class="dp-call-icon" style="background:${colors[i%colors.length]}">${initials}</div>
              <div class="dp-call-meta">
                <div class="dp-call-name">${esc(c.name)}</div>
                <div class="dp-call-num">${esc(c.number)}</div>
              </div>
              <div class="dp-call-right">
                <span class="dp-type-badge ${typeClass}">${typeLabel}</span>
                <div class="dp-call-dur">${c.duration !== '—' ? c.duration : ''}</div>
                <div class="dp-call-date">${c.date}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- RIGHT: Connect panel -->
      <div>
        <div class="dp-connect-card">
          <div class="dp-connect-title">Connect Calling Provider</div>
          <div class="dp-connect-sub">Link Twilio, Exotel or Plivo to make calls directly</div>

          <div class="dp-provider-tabs">
            <div class="dp-provider-tab selected" onclick="document.querySelectorAll('.dp-provider-tab').forEach(t=>t.classList.remove('selected'));this.classList.add('selected')">
              <div class="dp-provider-icon">📞</div>Twilio
            </div>
            <div class="dp-provider-tab" onclick="document.querySelectorAll('.dp-provider-tab').forEach(t=>t.classList.remove('selected'));this.classList.add('selected')">
              <div class="dp-provider-icon">📱</div>Exotel
            </div>
            <div class="dp-provider-tab" onclick="document.querySelectorAll('.dp-provider-tab').forEach(t=>t.classList.remove('selected'));this.classList.add('selected')">
              <div class="dp-provider-icon">🔌</div>Plivo
            </div>
          </div>

          <div class="dp-status-row">
            <span><span class="dp-status-dot"></span>Not connected</span>
            <span style="font-size:11px;color:#9CA3AF">Last checked: just now</span>
          </div>

          <label class="dp-form-label">Account SID / API Key</label>
          <input class="dp-form-input" placeholder="AC•••••••••••••••••••••••••••••••">
          <label class="dp-form-label">Auth Token / API Secret</label>
          <input class="dp-form-input" type="password" placeholder="••••••••••••••••">
          <label class="dp-form-label">From Number</label>
          <input class="dp-form-input" placeholder="+91 XXXXX XXXXX">

          <button class="dp-connect-btn" onclick="toast('Connection failed — check your credentials','error')">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Test & Connect
          </button>

          <div class="dp-setup-steps">
            <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:10px">Quick Setup Guide</div>
            <div class="dp-step"><div class="dp-step-num">1</div><span>Sign up on your provider's portal and verify your account</span></div>
            <div class="dp-step"><div class="dp-step-num">2</div><span>Get your API credentials from the dashboard</span></div>
            <div class="dp-step"><div class="dp-step-num">3</div><span>Purchase an Indian (+91) phone number</span></div>
            <div class="dp-step"><div class="dp-step-num">4</div><span>Paste credentials above and click Test & Connect</span></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function dialPress(d) { const inp = document.getElementById('phone-input'); if(inp) { inp.value += d; STATE.phoneInput = inp.value; } }
function makeCall() { toast('API not connected. Attach Twilio/Exotel API key in Settings.', 'error'); }


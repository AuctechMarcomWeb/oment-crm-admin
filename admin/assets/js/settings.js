function renderSettings() {
  const v = document.getElementById('view-settings');
  if (!v) return;
  const s = STATE.settings || {};
  const tab = STATE.settingsTab || 'company';

  const tabs = [
    ['company', 'Company'],
    ['billing', 'Billing & GST'],
    ['work', 'Work & Attendance'],
    ['notify', 'Notifications'],
    ['email', 'Email'],
    ['account', 'My account'],
    ['data', 'Data']
  ];

  v.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <div class="section-title" style="font-size:20px">Settings</div>
        <div class="section-sub">Company profile, billing defaults and workspace preferences</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="saveSettings()">Save changes</button>
    </div>

    <div class="tab-bar" style="margin-bottom:18px">
      ${tabs.map(([k, label]) => `
        <button class="tab-btn${tab === k ? ' active' : ''}" onclick="setSettingsTab('${k}')">${label}</button>
      `).join('')}
    </div>

    <div id="settings-pane">${_settingsPane(tab, s)}</div>
  `;
}

function setSettingsTab(tab) {
  STATE.settingsTab = tab;
  renderSettings();
}

function _settingsPane(tab, s) {
  if (tab === 'company') return `
    <div class="card card-pad" style="max-width:720px">
      <div class="form-group">
        <label class="form-label">Company name *</label>
        <input class="form-input" id="set-company" value="${escAttr(s.companyName || '')}">
        <div class="form-error" id="set-company-err">Company name is required</div>
      </div>
      <div class="form-group">
        <label class="form-label">Registered address</label>
        <textarea class="form-textarea" id="set-address" rows="3">${esc(s.address || '')}</textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="form-group">
          <label class="form-label">Billing email</label>
          <input class="form-input" id="set-email" type="email" value="${escAttr(s.email || '')}">
          <div class="form-error" id="set-email-err">Enter a valid email address</div>
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input class="form-input" id="set-phone" value="${escAttr(s.phone || '')}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Signed-in as</label>
        <input class="form-input" value="${escAttr((STATE.adminUser || {}).name || '')} \u00B7 Super Admin" disabled style="opacity:.6">
        <div class="form-hint">Role changes require a workspace owner. Not editable here.</div>
      </div>
    </div>`;

  if (tab === 'billing') return `
    <div class="card card-pad" style="max-width:720px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="form-group">
          <label class="form-label">GSTIN</label>
          <input class="form-input" id="set-gstin" value="${escAttr(s.gstin || '')}" placeholder="27AABCO1234F1Z5">
          <div class="form-error" id="set-gstin-err">GSTIN must be 15 characters</div>
        </div>
        <div class="form-group">
          <label class="form-label">Place of supply (state code) *</label>
          <input class="form-input" id="set-state" value="${escAttr(s.stateCode || '')}" placeholder="27" maxlength="2">
          <div class="form-hint">Same state as the client: CGST+SGST. Different state: IGST.</div>
          <div class="form-error" id="set-state-err">Enter a 2-digit state code</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="form-group">
          <label class="form-label">Default GST rate (%)</label>
          <input class="form-input" id="set-gstrate" type="number" min="0" max="28" step="0.5" value="${Number(s.gstRate || 18)}">
          <div class="form-error" id="set-gstrate-err">Rate must be between 0 and 28</div>
        </div>
        <div class="form-group">
          <label class="form-label">Invoice number prefix</label>
          <input class="form-input" id="set-prefix" value="${escAttr(s.invoicePrefix || 'INV')}" maxlength="8">
          <div class="form-hint">Format: PREFIX/FY/0001 \u00B7 numbers are never reused.</div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Currency</label>
        <select class="form-select" id="set-currency">
          <option value="INR" ${s.currency === 'INR' ? 'selected' : ''}>INR \u2014 Indian Rupee</option>
          <option value="USD" ${s.currency === 'USD' ? 'selected' : ''}>USD \u2014 US Dollar</option>
        </select>
      </div>
    </div>`;

  if (tab === 'work') return `
    <div class="card card-pad" style="max-width:720px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="form-group">
          <label class="form-label">Standard workday (hours)</label>
          <input class="form-input" id="set-workday" type="number" min="1" max="16" step="0.5" value="${Number(s.workdayTargetHours || 8)}">
          <div class="form-error" id="set-workday-err">Must be between 1 and 16 hours</div>
        </div>
        <div class="form-group">
          <label class="form-label">Week starts on</label>
          <select class="form-select" id="set-weekstart">
            <option value="monday" ${s.weekStart === 'monday' ? 'selected' : ''}>Monday</option>
            <option value="sunday" ${s.weekStart === 'sunday' ? 'selected' : ''}>Sunday</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <input type="checkbox" id="set-autoapprove" ${s.autoApproveSelfTasks ? 'checked' : ''}>
          <span>
            <span style="font-weight:600;font-size:13px">Auto-approve self-assigned tasks</span>
            <span style="display:block;font-size:12px;color:var(--t3)">When off, every self-assigned task goes to admin review.</span>
          </span>
        </label>
      </div>
    </div>`;

  if (tab === 'notify') return `
    <div class="card card-pad" style="max-width:720px">
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <input type="checkbox" id="set-notify-submit" ${s.notifyOnSubmission ? 'checked' : ''}>
          <span>
            <span style="font-weight:600;font-size:13px">Notify me when work is submitted</span>
            <span style="display:block;font-size:12px;color:var(--t3)">Get an alert when an employee submits a deliverable.</span>
          </span>
        </label>
      </div>
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <input type="checkbox" id="set-notify-overdue" ${s.notifyOnOverdue ? 'checked' : ''}>
          <span>
            <span style="font-weight:600;font-size:13px">Notify me about overdue items</span>
            <span style="display:block;font-size:12px;color:var(--t3)">A daily summary of tasks that are past their deadline.</span>
          </span>
        </label>
      </div>
      <div style="padding:12px 14px;background:var(--s2);border-radius:var(--r8);font-size:12.5px;color:var(--t2);margin-top:6px">
        ${window.OmentAPI ? 'Emails are sent by the server. Choose which ones in the <a href="#" onclick="setSettingsTab(\'email\');return false">Email</a> tab.' : 'Email delivery needs the backend \u2014 notifications are in-app only.'}
      </div>
    </div>`;

  if (tab === 'account') return `
    <div class="card card-pad" style="max-width:520px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:14px">
        <div class="avatar" style="width:52px;height:52px;font-size:18px;background:#2563EB">${esc((STATE.adminUser && STATE.adminUser.avatarInitials) || 'AD')}</div>
        <div>
          <div style="font-size:16px;font-weight:650">${esc((STATE.adminUser && STATE.adminUser.name) || 'Admin')}</div>
          <div style="font-size:12.5px;color:var(--t3)">Super Admin \u00b7 ${esc(s.companyName || '')}</div>
          <div style="font-size:12.5px;color:var(--t3)">Alerts go to ${esc(s.email || 'the billing email set in Company')}</div>
        </div>
      </div>
      <div class="form-hint" style="margin-top:10px">Your sign-in username is set in the backend <code>.env</code> (ADMIN_USERNAME).</div>
    </div>
    <form class="card card-pad" style="max-width:520px" autocomplete="off" onsubmit="event.preventDefault();saveSettings()">
      <!-- Catches the browser's saved username, so it doesn't land in the top search bar -->
      <input type="text" name="username" autocomplete="username" tabindex="-1" aria-hidden="true"
             style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none" value="admin">
      <div style="font-size:13px;font-weight:600;margin-bottom:12px">Change admin password</div>
      <div class="form-group"><label class="form-label" for="acc-old">Current password</label>
        <input class="form-input" id="acc-old" name="current-password" type="password" autocomplete="current-password"></div>
      <div class="form-group"><label class="form-label" for="acc-new">New password</label>
        <input class="form-input" id="acc-new" name="new-password" type="password" autocomplete="new-password"></div>
      <div class="form-group"><label class="form-label" for="acc-new2">Repeat new password</label>
        <input class="form-input" id="acc-new2" name="new-password-repeat" type="password" autocomplete="new-password"></div>
      <div class="form-hint">${window.OmentAPI ? 'Saved on the server. If you later change ADMIN_PASSWORD in the backend .env, that value takes over on the next restart.' : 'Needs the backend server.'}</div>
      <button type="submit" style="display:none"></button>
    </form>`;

  if (tab === 'email') {
    if (!window.OmentAPI) return `<div class="card card-pad" style="max-width:720px">Email needs the backend server.</div>`;
    setTimeout(_loadEmailPane, 0);
    return `<div id="email-pane" class="card card-pad" style="max-width:820px"><div style="color:var(--t3);font-size:13px">Loading email settings\u2026</div></div>`;
  }

  /* data tab */
  const DB = DataAPI.raw();
  const counts = [
    ['Employees', DB.employees.length], ['Departments', DB.departments.length],
    ['Projects', DB.projects.length], ['Milestones', DB.milestones.length],
    ['Deliverables', DB.deliverables.length], ['Tasks', DB.subtasks.length],
    ['Invoices', DB.invoices.length],
    ['Notices', DB.notices.length], ['Attendance records', DB.attendance.length]
  ];
  return `
    <div class="card card-pad" style="max-width:720px">
      <div style="font-size:13px;font-weight:600;margin-bottom:12px">Workspace data</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:20px">
        ${counts.map(([label, n]) => `
          <div style="background:var(--s2);border-radius:var(--r8);padding:10px 12px">
            <div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">${label}</div>
            <div style="font-size:18px;font-weight:700;font-family:var(--mono)">${n}</div>
          </div>`).join('')}
      </div>

      <div style="padding:12px 14px;background:var(--s2);border-radius:var(--r8);font-size:12.5px;color:var(--t2);margin-bottom:14px">
        ${window.OmentAPI ? 'Data is stored in the MongoDB database on the server. Export gives you a JSON copy of everything you can see.' : 'Data is stored in this browser\u2019s localStorage. Clearing browser data will erase it.'}
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="exportWorkspace()">Export JSON</button>
        <button class="btn btn-danger btn-sm" onclick="resetWorkspace('demo')">Reset to demo data</button>
        ${window.OmentAPI ? '<button class="btn btn-danger btn-sm" onclick="resetWorkspace(\'empty\')">Start blank company</button>' : ''}
      </div>
    </div>`;
}

function saveSettings() {
  const tab = STATE.settingsTab || 'company';
  const patch = {};
  let valid = true;

  const flag = (id, on) => {
    const el = document.getElementById(id);
    const err = document.getElementById(id + '-err');
    if (el) el.classList.toggle('input-error', on);
    if (err) err.classList.toggle('show', on);
    if (on) valid = false;
  };

  if (tab === 'company') {
    const name = document.getElementById('set-company')?.value?.trim();
    flag('set-company', !name);
    const email = document.getElementById('set-email')?.value?.trim() || '';
    flag('set-email', !!email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (!valid) return;
    patch.companyName = name;
    patch.address = document.getElementById('set-address')?.value?.trim() || '';
    patch.email = email;
    patch.phone = document.getElementById('set-phone')?.value?.trim() || '';
  }

  if (tab === 'billing') {
    const gstin = document.getElementById('set-gstin')?.value?.trim() || '';
    flag('set-gstin', !!gstin && gstin.length !== 15);
    const state = document.getElementById('set-state')?.value?.trim() || '';
    flag('set-state', !/^\d{2}$/.test(state));
    const rate = parseFloat(document.getElementById('set-gstrate')?.value);
    flag('set-gstrate', isNaN(rate) || rate < 0 || rate > 28);
    if (!valid) return;
    patch.gstin = gstin;
    patch.stateCode = state;
    patch.gstRate = rate;
    patch.invoicePrefix = document.getElementById('set-prefix')?.value?.trim() || 'INV';
    patch.currency = document.getElementById('set-currency')?.value || 'INR';
  }

  if (tab === 'work') {
    const hrs = parseFloat(document.getElementById('set-workday')?.value);
    flag('set-workday', isNaN(hrs) || hrs < 1 || hrs > 16);
    if (!valid) return;
    patch.workdayTargetHours = hrs;
    patch.weekStart = document.getElementById('set-weekstart')?.value || 'monday';
    patch.autoApproveSelfTasks = !!document.getElementById('set-autoapprove')?.checked;
  }

  if (tab === 'notify') {
    patch.notifyOnSubmission = !!document.getElementById('set-notify-submit')?.checked;
    patch.notifyOnOverdue = !!document.getElementById('set-notify-overdue')?.checked;
  }

  if (tab === 'data') { toast('Nothing to save on this tab', 'error'); return; }
  if (tab === 'email') { saveEmailSettings(); return; }
  if (tab === 'account') {
    const o = document.getElementById('acc-old')?.value || '', n = document.getElementById('acc-new')?.value || '', n2 = document.getElementById('acc-new2')?.value || '';
    if (n.length < 6) { toast('New password must be at least 6 characters', 'error'); return; }
    if (n !== n2) { toast('The two new passwords don\u2019t match', 'error'); return; }
    if (!window.OmentAPI) { toast('Needs the backend server', 'error'); return; }
    OmentAPI.changePassword(o, n).then(function () { toast('Password changed \u2713', 'success'); renderSettings(); })
      .catch(function (err) { toast(err.message, 'error'); });
    return;
  }

  DataAPI.updateSettings(patch).then(function () {
    syncState();
    renderSettings();
    toast('Settings saved \u2713', 'success');
  }).catch(function (err) { toast(err.message, 'error'); });
}

function exportWorkspace() {
  const data = JSON.stringify(DataAPI.raw(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'oment-workspace-' + Utils.isoDate(new Date()) + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Workspace exported', 'success');
}

function resetWorkspace(mode) {
  mode = mode || 'demo';
  const text = mode === 'empty'
    ? 'Delete ALL data and start a blank company? Employees, projects, invoices, attendance \u2014 everything goes. Only your admin login stays. This cannot be undone.'
    : 'Delete ALL data and load the demo company? Everything you entered will be lost. This cannot be undone.';
  showConfirm(text, function () {
    DataAPI.reset(mode).then(function () {
      toast(mode === 'empty' ? 'Blank company ready' : 'Workspace reset to demo data', 'success');
      setTimeout(function () { location.reload(); }, 600);
    }).catch(function (err) { toast(err.message, 'error'); });
  });
}

/* ══════════════════════════ EMAIL TAB (server) ══════════════════════════ */
var _emailCache = null, _emailLogFilter = '';

function _loadEmailPane() {
  const el = document.getElementById('email-pane');
  if (!el) return;
  Promise.all([OmentAPI.emailSettings(), OmentAPI.emails({ limit: 25, status: _emailLogFilter })]).then(function (r) {
    _emailCache = r[0];
    el.innerHTML = _emailPaneHtml(r[0], r[1]);
  }).catch(function (err) {
    el.innerHTML = '<div style="color:var(--red);font-size:13px">' + esc(err.message) + '</div>';
  });
}

function _emailPaneHtml(cfg, log) {
  const smtp = cfg.smtp || {};
  const status = smtp.configured
    ? '<span style="color:var(--green);font-weight:600">\u25CF Connected</span> \u2014 ' + esc(smtp.host) + ':' + smtp.port + ' as ' + esc(smtp.user || smtp.from)
    : '<span style="color:var(--amber);font-weight:600">\u25CF Not connected</span> \u2014 set SMTP_SERVICE (e.g. gmail), SMTP_USER and SMTP_PASS in the server <code>.env</code>. Until then emails are only printed in the server console.';
  const counts = log.counts || {};
  const badge = st => ({ SENT: 'var(--green)', LOGGED: 'var(--t3)', QUEUED: 'var(--blue)', FAILED: 'var(--red)', SKIPPED: 'var(--t3)' }[st] || 'var(--t3)');
  const cats = Object.keys(cfg.categoryLabels || {});
  return `
    <div style="font-size:13px;margin-bottom:14px;line-height:1.6">${status}</div>

    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin-bottom:14px">
      <input type="checkbox" id="em-enabled" ${cfg.enabled ? 'checked' : ''}>
      <span style="font-weight:600;font-size:13px">Send emails</span>
      <span style="font-size:12px;color:var(--t3)">(master switch)</span>
    </label>

    <div class="form-group">
      <label class="form-label">Admin email address</label>
      <input class="form-input" id="em-admin" type="email" value="${escAttr(cfg.adminEmail || '')}" placeholder="${escAttr(cfg.resolvedAdminEmail || 'owner@yourcompany.com')}">
      <div class="form-hint">Where admin alerts go (reviews, leave requests, daily summary). Empty = ${esc(cfg.resolvedAdminEmail || 'Billing email from the Company tab')}.</div>
    </div>

    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);margin:16px 0 8px">Which emails</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:8px">
      ${cats.map(k => `
        <label style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;background:var(--s2);border-radius:var(--r8);cursor:pointer">
          <input type="checkbox" class="em-cat" data-cat="${k}" ${cfg.categories[k] !== false ? 'checked' : ''} style="margin-top:2px">
          <span><span style="font-weight:600;font-size:13px;text-transform:capitalize">${esc(k)}</span>
          <span style="display:block;font-size:12px;color:var(--t3);line-height:1.45">${esc(cfg.categoryLabels[k])}</span></span>
        </label>`).join('')}
    </div>

    <div style="display:flex;gap:8px;align-items:center;margin-top:18px;flex-wrap:wrap">
      <input class="form-input" id="em-test-to" type="email" placeholder="${escAttr(cfg.resolvedAdminEmail || 'you@example.com')}" style="max-width:260px">
      <button class="btn btn-secondary btn-sm" onclick="sendTestEmail()">Send test email</button>
      <button class="btn btn-secondary btn-sm" onclick="processEmailsNow()">Send queued now</button>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin:22px 0 8px;flex-wrap:wrap;gap:8px">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--t3)">Email log (${log.total})</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${['', 'QUEUED', 'SENT', 'FAILED', 'LOGGED', 'SKIPPED'].map(st => `<button class="btn btn-xs ${_emailLogFilter === st ? 'btn-primary' : 'btn-secondary'}" onclick="filterEmailLog('${st}')">${st || 'All'}${st && counts[st] ? ' ' + counts[st] : ''}</button>`).join('')}
      </div>
    </div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead><tr style="text-align:left;color:var(--t3)"><th style="padding:6px 8px">When</th><th style="padding:6px 8px">To</th><th style="padding:6px 8px">Subject</th><th style="padding:6px 8px">Status</th><th></th></tr></thead>
        <tbody>
        ${(log.items || []).map(m => `
          <tr style="border-top:1px solid var(--b1)">
            <td style="padding:7px 8px;white-space:nowrap;color:var(--t3)">${esc(new Date(m.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</td>
            <td style="padding:7px 8px">${esc(m.to)}</td>
            <td style="padding:7px 8px">${esc(m.subject)}${m.error ? `<div style="color:var(--red);font-size:11.5px">${esc(m.error)}</div>` : ''}</td>
            <td style="padding:7px 8px"><span style="color:${badge(m.status)};font-weight:600">${esc(m.status)}</span>${m.attempts > 1 ? ' <span style="color:var(--t3)">\u00d7' + m.attempts + '</span>' : ''}</td>
            <td style="padding:7px 8px;white-space:nowrap;text-align:right">
              <button class="btn btn-xs btn-secondary" onclick="previewEmail('${escAttr(m.id)}')">View</button>
              <button class="btn btn-xs btn-secondary" title="Sends a new copy in the current design" onclick="retryEmail('${escAttr(m.id)}')">Resend</button>
            </td>
          </tr>`).join('') || '<tr><td colspan="5" style="padding:14px 8px;color:var(--t3)">No emails yet.</td></tr>'}
        </tbody>
      </table>
    </div>`;
}

function saveEmailSettings() {
  const adminEmail = (document.getElementById('em-admin')?.value || '').trim();
  if (adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) { toast('Admin email is not valid', 'error'); return; }
  const categories = {};
  document.querySelectorAll('.em-cat').forEach(cb => { categories[cb.dataset.cat] = cb.checked; });
  OmentAPI.updateEmailSettings({ enabled: !!document.getElementById('em-enabled')?.checked, adminEmail, categories })
    .then(function () { toast('Email settings saved \u2713', 'success'); _loadEmailPane(); })
    .catch(function (err) { toast(err.message, 'error'); });
}

function sendTestEmail() {
  const to = (document.getElementById('em-test-to')?.value || '').trim() || undefined;
  toast('Sending\u2026');
  OmentAPI.testEmail(to).then(function (r) {
    toast(r.transport === 'smtp' ? 'Test email sent to ' + r.to : 'SMTP not set \u2014 printed in the server console', r.transport === 'smtp' ? 'success' : 'error');
  }).catch(function (err) { toast('Could not send: ' + err.message, 'error'); });
}

function processEmailsNow() {
  OmentAPI.processEmails().then(function (r) { toast((r.processed || 0) + ' email(s) processed', 'success'); _loadEmailPane(); })
    .catch(function (err) { toast(err.message, 'error'); });
}

function filterEmailLog(st) { _emailLogFilter = st; _loadEmailPane(); }

function retryEmail(id) {
  OmentAPI.retryEmail(id).then(function () { toast('A new copy is on its way (current design)', 'success'); setTimeout(_loadEmailPane, 800); })
    .catch(function (err) { toast(err.message, 'error'); });
}

function previewEmail(id) {
  OmentAPI.email(id).then(function (m) {
    const frame = '<iframe id="em-prev" style="width:100%;height:60vh;border:1px solid var(--b1);border-radius:8px;background:#fff"></iframe>';
    openModal(esc(m.subject), '<div style="font-size:12.5px;color:var(--t3);margin-bottom:8px">To ' + esc(m.to) + ' \u00b7 ' + esc(m.status) + (m.sentAt ? ' \u00b7 sent ' + esc(new Date(m.sentAt).toLocaleString('en-IN')) : '') + '</div>' + frame,
      '<button class="btn btn-secondary btn-sm" onclick="closeModal()">Close</button>');
    setTimeout(function () {
      const f = document.getElementById('em-prev');
      if (f) f.srcdoc = m.html || ('<pre style="font-family:inherit;white-space:pre-wrap;padding:16px">' + esc(m.body || '') + '</pre>');
    }, 30);
  }).catch(function (err) { toast(err.message, 'error'); });
}
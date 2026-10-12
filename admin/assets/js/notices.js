/* ============================================================
   NOTICE BOARD MODULE — v2 (Full Rich Editor)
   ============================================================ */

// Notice compose state
let noticeCompose = {
  active: false,
  title: '',
  content: '',
  recipients: 'all',
  priority: 'Normal',
  attachments: [],
  scheduleSend: false,
  scheduleDate: '',
  requireAck: false,
  editingId: null,
  filterTab: 'All'
};

function _ncKeepTyped() {
  if (typeof noticeCompose === 'undefined' || !noticeCompose.active) return;
  const t = document.getElementById('nc-title'), ed = document.getElementById('nc-editor');
  if (t) noticeCompose.title = t.value;
  if (ed) noticeCompose.content = ed.innerHTML;
}
function renderNoticesModule() {
  _ncKeepTyped();
  const v = document.getElementById('view-notices');
  const notices = STATE.notices;
  const tab = noticeCompose.filterTab || 'All';

  const filtered = notices.filter(n => {
    if (tab === 'All') return true;
    if (tab === 'Sent') return n.status === 'Sent';
    if (tab === 'Draft') return n.status === 'Draft';
    if (tab === 'Urgent') return n.priority === 'Urgent';
    return true;
  });

  const active = notices.find(n => String(n.id) === String(STATE.currentNotice)) || notices[0];

  function recipLabel(r) {
    if (!r || r === 'all') return 'All Employees';
    if (r.startsWith('dept:')) return r.replace('dept:', '') + ' Department';
    return r;
  }
  function priorityChip(p) {
    const map = { Urgent: 'background:#FEE2E2;color:#DC2626', Normal: 'background:#F0EEE9;color:#5C5A60', Low: 'background:#DCFCE7;color:#166534' };
    return `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;${map[p]||map.Normal}">${p}</span>`;
  }
  function statusChip(s) {
    const map = { Sent: 'background:#DBEAFE;color:#1D4ED8', Draft: 'background:#F5F3FF;color:#6D28D9', Scheduled: 'background:#FFFBEB;color:#B45309' };
    return `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;${map[s]||'background:#F0EEE9;color:#5C5A60'}">${s}</span>`;
  }

  if (noticeCompose.active) {
    // ── COMPOSE VIEW ──
    v.innerHTML = `
      <div class="notice-compose-header" style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <button class="notice-compose-back-btn" onclick="noticeCompose.active=false;renderNoticesModule();updateBackButton()" style="display:flex;align-items:center;gap:6px;background:none;border:1px solid var(--b2);padding:7px 14px;border-radius:var(--r6);font-size:13px;cursor:pointer;color:var(--t2);transition:.15s;flex-shrink:0" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background='none'">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Back
        </button>
        <div style="min-width:0;flex:1">
          <div style="font-size:18px;font-weight:700">${noticeCompose.editingId ? 'Edit Notice' : 'Compose Notice'}</div>
          <div style="font-size:12px;color:var(--t3)" class="hide-on-narrow">Create and send announcements to your team</div>
        </div>
      </div>

      <div class="notice-compose-grid">

        <!-- LEFT: Editor -->
        <div class="notice-compose-editor" style="display:flex;flex-direction:column;gap:16px">

          <!-- Title -->
          <div class="card card-pad">
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Notice Title <span class="req">*</span></label>
              <input class="form-input" id="nc-title" placeholder="e.g. Q2 All-Hands Meeting — Mandatory" style="font-size:16px;font-weight:600;height:48px" value="${escAttr(noticeCompose.title || '')}" oninput="noticeCompose.title=this.value">
            </div>
          </div>

          <!-- Rich Text Editor -->
          <div class="card" style="overflow:hidden">
            <!-- Toolbar -->
            <div class="notice-compose-toolbar" style="border-bottom:1px solid var(--b1);padding:8px 12px;background:var(--s2);display:flex;flex-wrap:wrap;gap:2px;align-items:center">

              <!-- Format row 1 -->
              <div style="display:flex;gap:2px;align-items:center;padding-right:8px;border-right:1px solid var(--b2);margin-right:6px">
                <select onchange="document.execCommand('formatBlock',false,this.value);document.getElementById('nc-editor').focus()" style="border:1px solid var(--b2);background:var(--surface);border-radius:4px;padding:3px 6px;font-size:11px;cursor:pointer;color:var(--t1)">
                  <option value="p">Normal</option>
                  <option value="h1">Heading 1</option>
                  <option value="h2">Heading 2</option>
                  <option value="h3">Heading 3</option>
                </select>
                <select onchange="document.execCommand('fontSize',false,this.value);document.getElementById('nc-editor').focus()" style="border:1px solid var(--b2);background:var(--surface);border-radius:4px;padding:3px 6px;font-size:11px;cursor:pointer;color:var(--t1)">
                  <option value="3">14px</option>
                  <option value="2">12px</option>
                  <option value="4">16px</option>
                  <option value="5">18px</option>
                  <option value="6">22px</option>
                  <option value="7">28px</option>
                </select>
              </div>

              <!-- Bold Italic Underline Strike -->
              <div style="display:flex;gap:2px;padding-right:8px;border-right:1px solid var(--b2);margin-right:6px">
                ${[
                  ['bold','B','font-weight:700'],
                  ['italic','I','font-style:italic'],
                  ['underline','U','text-decoration:underline'],
                  ['strikeThrough','S','text-decoration:line-through']
                ].map(([cmd,lbl,st])=>`<button title="${cmd}" onclick="document.execCommand('${cmd}');document.getElementById('nc-editor').focus()" style="width:28px;height:28px;border:none;background:none;cursor:pointer;border-radius:4px;font-size:12px;${st};color:var(--t1);transition:.1s" onmouseover="this.style.background='var(--s3)'" onmouseout="this.style.background='none'">${lbl}</button>`).join('')}
              </div>

              <!-- Align -->
              <div style="display:flex;gap:2px;padding-right:8px;border-right:1px solid var(--b2);margin-right:6px">
                ${[
                  ['justifyLeft','<svg width="13" height="13" fill="none" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="3" y1="12" x2="15" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="3" y1="18" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'],
                  ['justifyCenter','<svg width="13" height="13" fill="none" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'],
                  ['justifyRight','<svg width="13" height="13" fill="none" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>']
                ].map(([cmd,svg])=>`<button onclick="document.execCommand('${cmd}');document.getElementById('nc-editor').focus()" style="width:28px;height:28px;border:none;background:none;cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;color:var(--t1);transition:.1s" onmouseover="this.style.background='var(--s3)'" onmouseout="this.style.background='none'">${svg}</button>`).join('')}
              </div>

              <!-- Lists -->
              <div style="display:flex;gap:2px;padding-right:8px;border-right:1px solid var(--b2);margin-right:6px">
                <button onclick="document.execCommand('insertUnorderedList');document.getElementById('nc-editor').focus()" title="Bullet list" style="width:28px;height:28px;border:none;background:none;cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;color:var(--t1);transition:.1s" onmouseover="this.style.background='var(--s3)'" onmouseout="this.style.background='none'"><svg width="13" height="13" fill="none" viewBox="0 0 24 24"><line x1="9" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/></svg></button>
                <button onclick="document.execCommand('insertOrderedList');document.getElementById('nc-editor').focus()" title="Numbered list" style="width:28px;height:28px;border:none;background:none;cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;color:var(--t1);transition:.1s" onmouseover="this.style.background='var(--s3)'" onmouseout="this.style.background='none'"><svg width="13" height="13" fill="none" viewBox="0 0 24 24"><line x1="10" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 6h1v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3.5 14h2l-2 2.5h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
              </div>

              <!-- Text Color + Highlight -->
              <div style="display:flex;gap:4px;align-items:center;padding-right:8px;border-right:1px solid var(--b2);margin-right:6px">
                <label title="Text color" style="position:relative;cursor:pointer;width:28px;height:28px;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:.1s" onmouseover="this.style.background='var(--s3)'" onmouseout="this.style.background='none'">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M9 20l-4-4L14 3l4 4L9 20z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><line x1="4" y1="20" x2="20" y2="20" stroke="#2563EB" stroke-width="3" stroke-linecap="round"/></svg>
                  <input type="color" value="#18171A" onchange="document.execCommand('foreColor',false,this.value);document.getElementById('nc-editor').focus()" style="position:absolute;opacity:0;width:100%;height:100%;cursor:pointer">
                </label>
                <label title="Highlight color" style="position:relative;cursor:pointer;width:28px;height:28px;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:.1s" onmouseover="this.style.background='var(--s3)'" onmouseout="this.style.background='none'">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><rect x="3" y="13" width="18" height="8" rx="2" fill="#FBBF24" stroke="#FBBF24" stroke-width="1"/><path d="M8 13V7a2 2 0 014 0v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                  <input type="color" value="#FEF08A" onchange="document.execCommand('hiliteColor',false,this.value);document.getElementById('nc-editor').focus()" style="position:absolute;opacity:0;width:100%;height:100%;cursor:pointer">
                </label>
              </div>

              <!-- Insert Link + HR -->
              <div style="display:flex;gap:2px">
                <button onclick="noticeInsertLink()" title="Insert link" style="width:28px;height:28px;border:none;background:none;cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;color:var(--t1);transition:.1s" onmouseover="this.style.background='var(--s3)'" onmouseout="this.style.background='none'"><svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                <button onclick="document.execCommand('insertHorizontalRule');document.getElementById('nc-editor').focus()" title="Divider" style="width:28px;height:28px;border:none;background:none;cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;color:var(--t1);transition:.1s" onmouseover="this.style.background='var(--s3)'" onmouseout="this.style.background='none'"><svg width="13" height="13" fill="none" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
                <button onclick="document.execCommand('removeFormat');document.getElementById('nc-editor').focus()" title="Clear formatting" style="width:28px;height:28px;border:none;background:none;cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;color:var(--t1);transition:.1s" onmouseover="this.style.background='var(--s3)'" onmouseout="this.style.background='none'"><svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M22 3H7l-7 9 7 9h15a2 2 0 002-2V5a2 2 0 00-2-2z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><line x1="18" y1="9" x2="12" y2="15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="12" y1="9" x2="18" y2="15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
              </div>
            </div>

            <!-- Editable Content Area -->
            <div id="nc-editor" contenteditable="true"
              style="min-height:320px;padding:20px 24px;font-size:14px;line-height:1.8;color:var(--t1);outline:none;font-family:var(--font)"
              oninput="noticeCompose.content=this.innerHTML"
              onpaste="event.preventDefault();const txt=event.clipboardData.getData('text/html')||event.clipboardData.getData('text/plain');document.execCommand('insertHTML',false,txt)"
             data-placeholder="Write your notice here…" oninput="noticeCompose.content=this.innerHTML">${noticeCompose.content && noticeCompose.content !== '<p>Write your notice here…</p>' ? noticeCompose.content : ''}</div>
          </div>

          <!-- Attachments -->
          <div class="card card-pad">
            <div style="font-size:13px;font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:6px">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Attachments
            </div>
            <div id="nc-attachments" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">
              ${noticeCompose.attachments.map((a,i)=>`
                <div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:var(--s2);border:1px solid var(--b1);border-radius:var(--r6);font-size:12px">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="1.8"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.8"/></svg>
                  <span>${esc(_ntAttName(a))}</span>
                  <button onclick="noticeCompose.attachments.splice(${i},1);renderNoticesModule()" style="background:none;border:none;cursor:pointer;color:var(--t3);padding:0;line-height:1" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--t3)'">×</button>
                </div>
              `).join('')}
              ${noticeCompose.attachments.length===0?'<div style="font-size:12px;color:var(--t3)">No attachments added</div>':''}
            </div>
            <label style="display:flex;align-items:center;gap:8px;padding:10px 16px;border:2px dashed var(--b2);border-radius:var(--r8);cursor:pointer;font-size:12px;color:var(--t2);transition:.15s" onmouseover="this.style.borderColor='var(--t1)';this.style.background='var(--s2)'" onmouseout="this.style.borderColor='var(--b2)';this.style.background='none'">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Upload PDF, DOC, DOCX, Image
              <input type="file" accept=".pdf,.doc,.docx,.png,.jpg" multiple onchange="noticeHandleFile(this)" style="display:none">
            </label>
          </div>
        </div>

        <!-- RIGHT: Settings Panel -->
        <div class="notice-compose-settings" style="display:flex;flex-direction:column;gap:14px">

          <!-- Recipients -->
          <div class="card card-pad">
            <div style="font-size:13px;font-weight:600;margin-bottom:12px">Send To</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${[['all','🌐 All Employees']].concat(
                STATE.departments.map(d => ['dept:' + d.name, '\uD83C\uDFE2 ' + esc(d.name) + ' (' + STATE.employees.filter(e => e.dept === d.name).length + ')'])
              ).map(([val,lbl])=>`
                <label style="display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid ${noticeCompose.recipients===val?'var(--t1)':'var(--b1)'};border-radius:var(--r6);cursor:pointer;background:${noticeCompose.recipients===val?'var(--s2)':'var(--surface)'};transition:.15s">
                  <input type="radio" name="nc-recip" value="${val}" ${noticeCompose.recipients===val?'checked':''} onchange="noticeCompose.recipients='${escAttr(val)}';renderNoticesModule()" style="accent-color:var(--t1)">
                  <span style="font-size:12px">${lbl}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Priority -->
          <div class="card card-pad">
            <div style="font-size:13px;font-weight:600;margin-bottom:12px">Priority</div>
            <div style="display:flex;gap:8px">
              ${['Urgent','Normal','Low'].map(p=>`
                <button onclick="noticeCompose.priority='${p}';renderNoticesModule()" style="flex:1;padding:7px;border-radius:var(--r6);border:1px solid ${noticeCompose.priority===p?'var(--t1)':'var(--b1)'};background:${noticeCompose.priority===p?'var(--t1)':'var(--surface)'};color:${noticeCompose.priority===p?'#fff':'var(--t2)'};font-size:11px;font-weight:600;cursor:pointer;transition:.15s">${p}</button>
              `).join('')}
            </div>
          </div>

          <!-- Options -->
          <div class="card card-pad">
            <div style="font-size:13px;font-weight:600;margin-bottom:12px">Options</div>
            <div style="display:flex;flex-direction:column;gap:10px">

              <!-- Require Acknowledgment -->
              <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
                <div>
                  <div style="font-size:12px;font-weight:500">Require Acknowledgment</div>
                  <div style="font-size:11px;color:var(--t3)">Employee must confirm they read this</div>
                </div>
                <div onclick="noticeCompose.requireAck=!noticeCompose.requireAck;renderNoticesModule()" style="width:36px;height:20px;border-radius:99px;background:${noticeCompose.requireAck?'var(--t1)':'var(--b2)'};position:relative;cursor:pointer;transition:.2s">
                  <div style="width:16px;height:16px;border-radius:50%;background:#fff;position:absolute;top:2px;left:${noticeCompose.requireAck?'18':'2'}px;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></div>
                </div>
              </label>

              <!-- Schedule Send -->
              <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
                <div>
                  <div style="font-size:12px;font-weight:500">Schedule Send</div>
                  <div style="font-size:11px;color:var(--t3)">Send at a specific date & time</div>
                </div>
                <div onclick="noticeCompose.scheduleSend=!noticeCompose.scheduleSend;renderNoticesModule()" style="width:36px;height:20px;border-radius:99px;background:${noticeCompose.scheduleSend?'var(--t1)':'var(--b2)'};position:relative;cursor:pointer;transition:.2s">
                  <div style="width:16px;height:16px;border-radius:50%;background:#fff;position:absolute;top:2px;left:${noticeCompose.scheduleSend?'18':'2'}px;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></div>
                </div>
              </label>
              ${noticeCompose.scheduleSend?`
                <input type="datetime-local" class="form-input" style="font-size:12px" value="${noticeCompose.scheduleDate}" onchange="noticeCompose.scheduleDate=this.value">
              `:''}
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="notice-compose-actions" style="display:flex;flex-direction:column;gap:8px">
            <button onclick="noticeSendNow()" style="width:100%;padding:11px;border-radius:var(--r8);background:var(--t1);color:#fff;border:none;cursor:pointer;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;transition:.15s" onmouseover="this.style.opacity='.88'" onmouseout="this.style.opacity='1'">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              ${noticeCompose.scheduleSend?'Schedule Notice':'Send Notice Now'}
            </button>
            <button onclick="noticeSaveDraft()" style="width:100%;padding:10px;border-radius:var(--r8);background:var(--surface);color:var(--t1);border:1px solid var(--b2);cursor:pointer;font-size:13px;font-weight:500;transition:.15s" onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background='var(--surface)'">
              Save as Draft
            </button>
            <button onclick="noticeCompose.active=false;renderNoticesModule();updateBackButton()" style="width:100%;padding:9px;border-radius:var(--r8);background:none;color:var(--t3);border:none;cursor:pointer;font-size:12px;transition:.15s" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--t3)'">
              Discard
            </button>
          </div>

        </div>
      </div>
    `;
    return;
  }

  // ── LIST VIEW ──
  const isMobile = window.innerWidth <= 768;
  const showingDetail = isMobile && STATE.noticeDetailOpen && active;

  // On mobile, show ONLY the detail when a notice is opened, or ONLY the list otherwise.
  // On desktop, show the side-by-side list + detail.

  if (showingDetail) {
    // ── MOBILE DETAIL VIEW (full-screen) ──
    v.innerHTML = `
      <button onclick="STATE.noticeDetailOpen=false;renderNoticesModule();updateBackButton()" style="display:flex;align-items:center;gap:6px;background:none;border:1px solid var(--b2);padding:7px 12px;border-radius:var(--r6);font-size:13px;cursor:pointer;color:var(--t2);margin-bottom:14px;font-family:var(--font)">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Back to Notices
      </button>
      <div class="card" style="overflow:hidden;display:flex;flex-direction:column">
        <!-- Notice Header -->
        <div style="padding:16px 18px;border-bottom:1px solid var(--b1)">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap">
            <div style="font-size:17px;font-weight:700;line-height:1.3;flex:1;min-width:0">${active.title}</div>
            <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
              ${priorityChip(active.priority)}
              ${statusChip(active.status)}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:6px">
              <div style="width:26px;height:26px;border-radius:50%;background:#DBEAFE;color:#1D4ED8;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">RK</div>
              <div>
                <div style="font-size:12px;font-weight:500">Rajesh Kumar</div>
                <div style="font-size:10px;color:var(--t3)">Super Admin</div>
              </div>
            </div>
            <div style="font-size:11.5px;color:var(--t3);display:flex;align-items:center;gap:4px">
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/><polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              ${active.date}
            </div>
            <div style="font-size:11.5px;color:var(--t3);display:flex;align-items:center;gap:4px">
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.8"/></svg>
              ${recipLabel(active.recipients)}
            </div>
            ${active.requireAck?`<span style="font-size:10.5px;padding:2px 8px;border-radius:99px;background:#FFFBEB;color:#B45309;font-weight:500">Acknowledgment Required</span>`:''}
          </div>
        </div>
        <!-- Mobile actions -->
        <div style="padding:10px 14px;border-bottom:1px solid var(--b1);display:flex;gap:6px;background:var(--s2);overflow-x:auto;-webkit-overflow-scrolling:touch">
          ${active.status==='Draft'?`
            <button onclick="noticeSendFromDetail('${escAttr(String(active.id))}')" class="btn btn-primary btn-sm" style="flex-shrink:0">Send Now</button>
            <button onclick="noticeEditDraft('${escAttr(String(active.id))}')" class="btn btn-secondary btn-sm" style="flex-shrink:0">Edit Draft</button>
          `:`
            <button onclick="toast('Notice resent successfully','success')" class="btn btn-secondary btn-sm" style="flex-shrink:0">Resend</button>
          `}
          <button onclick="noticeDownloadPdf('${escAttr(String(active.id))}')" class="btn btn-secondary btn-sm" style="flex-shrink:0">PDF</button>
          <button onclick="noticeDeleteConfirm('${escAttr(String(active.id))}')" class="btn btn-danger btn-sm" style="flex-shrink:0;margin-left:auto">Delete</button>
        </div>
        <!-- Content -->
        <div style="padding:18px">
          <div style="font-size:13.5px;line-height:1.75;color:var(--t1);margin-bottom:18px">${active.content}</div>
          ${active.attachments&&active.attachments.length?`
            <div style="margin-bottom:18px">
              <div style="font-size:12px;font-weight:600;margin-bottom:8px">Attachments (${active.attachments.length})</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                ${active.attachments.map(a=>`
                  <div onclick="noticeOpenAttachment('${escAttr((a && a.fileId) || '')}','${escAttr(_ntAttName(a))}')" style="display:flex;align-items:center;gap:6px;padding:7px 12px;background:var(--s2);border:1px solid var(--b1);border-radius:var(--r6);font-size:12px;cursor:pointer">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#DC2626" stroke-width="1.8"/><polyline points="14 2 14 8 20 8" stroke="#DC2626" stroke-width="1.8"/></svg>
                    <span>${esc(_ntAttName(a))}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `:''}
          ${active.status!=='Draft'?`
            <div style="border-top:1px solid var(--b1);padding-top:16px">
              <div style="font-size:12px;font-weight:600;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">
                <span>Read Receipts</span>
                <span style="font-size:11px;font-weight:400;color:var(--t3)">${active.readBy?active.readBy.length:0} of ${active.readBy&&active.notReadBy?active.readBy.length+active.notReadBy.length:0} read</span>
              </div>
              <div style="height:5px;background:var(--b1);border-radius:99px;margin-bottom:14px;overflow:hidden">
                <div style="height:100%;width:${active.readBy&&active.notReadBy&&(active.readBy.length+active.notReadBy.length)>0?(active.readBy.length/(active.readBy.length+active.notReadBy.length)*100):0}%;background:var(--green);border-radius:99px"></div>
              </div>
              <div style="display:flex;flex-direction:column;gap:14px">
                <div>
                  <div style="font-size:11px;font-weight:600;color:var(--green);margin-bottom:6px">✓ Read (${active.readBy?active.readBy.length:0})</div>
                  ${active.readBy&&active.readBy.length?active.readBy.map(name=>`
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
                      <div style="width:22px;height:22px;border-radius:50%;background:var(--s3);font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;color:var(--t2);flex-shrink:0">${name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                      <span style="font-size:12px;color:var(--t1)">${name}</span>
                    </div>
                  `).join(''):'<span style="font-size:11px;color:var(--t3)">No one yet</span>'}
                </div>
                <div>
                  <div style="font-size:11px;font-weight:600;color:var(--red);margin-bottom:6px">Not Read (${active.notReadBy?active.notReadBy.length:0})</div>
                  ${active.notReadBy&&active.notReadBy.length?active.notReadBy.map(name=>`
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
                      <div style="width:22px;height:22px;border-radius:50%;background:#FEE2E2;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;color:#DC2626;flex-shrink:0">${name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                      <span style="font-size:12px;color:var(--t1);flex:1">${name}</span>
                      <button onclick="toast('Reminder sent to ${name}','success')" style="font-size:10.5px;background:none;border:none;color:var(--blue);cursor:pointer;padding:0">Remind</button>
                    </div>
                  `).join(''):'<div style="font-size:11px;color:var(--green)">Everyone has read this ✓</div>'}
                </div>
              </div>
            </div>
          `:''}
        </div>
      </div>
    `;
    updateBackButton();
    return;
  }

  v.innerHTML = `
    <div class="notices-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:8px;flex-wrap:wrap">
      <div>
        <div class="section-title" style="font-size:20px">Notice Board</div>
        <div class="section-sub">Company-wide announcements & communications</div>
      </div>
      <button class="btn btn-primary" onclick="noticeCompose={active:true,title:'',content:'',recipients:'all',priority:'Normal',attachments:[],scheduleSend:false,scheduleDate:'',requireAck:false,editingId:null};renderNoticesModule();updateBackButton()">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <span class="hide-on-narrow">Compose Notice</span><span class="show-on-narrow">Compose</span>
      </button>
    </div>

    <div class="notice-list-grid">

      <!-- LEFT: Notices List -->
      <div class="notice-list-col card" style="overflow:hidden;display:flex;flex-direction:column">
        <!-- Search + Filter -->
        <div style="padding:12px;border-bottom:1px solid var(--b1);display:flex;flex-direction:column;gap:8px">
          <div style="position:relative">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--t3)"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <input placeholder="Search notices…" oninput="noticeSearch(this.value)" style="width:100%;padding:7px 10px 7px 30px;border:1px solid var(--b1);border-radius:var(--r6);font-size:13px;background:var(--s2);outline:none;font-family:var(--font);box-sizing:border-box">
          </div>
          <div style="display:flex;gap:4px">
            ${['All','Sent','Draft','Urgent'].map(f=>`
              <button onclick="noticeCompose.filterTab='${f}';renderNoticesModule()" style="flex:1;padding:6px 4px;border-radius:var(--r4);border:none;background:${tab===f?'var(--t1)':'var(--s2)'};color:${tab===f?'#fff':'var(--t2)'};font-size:11px;font-weight:${tab===f?'600':'400'};cursor:pointer;transition:.15s">${f}</button>
            `).join('')}
          </div>
        </div>

        <!-- List -->
        <div class="notice-list-scroll-wrap" style="flex:1;overflow-y:auto">
          ${filtered.length===0?`<div style="text-align:center;padding:40px 20px;color:var(--t3)"><svg width="32" height="32" fill="none" viewBox="0 0 24 24" style="margin:0 auto 8px;display:block"><path d="M9 11H6a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2v-6a2 2 0 00-2-2h-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M9 11V7a3 3 0 016 0v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><div style="font-size:13px;font-weight:500;color:var(--t2)">No notices found</div></div>`:''}
          ${filtered.map(n => `
            <div onclick="STATE.currentNotice='${escAttr(String(n.id))}';noticeCompose.active=false;STATE.noticeDetailOpen=(window.innerWidth<=768);renderNoticesModule();updateBackButton()" style="padding:14px 16px;border-bottom:1px solid var(--b1);cursor:pointer;${String(n.id)===String(active?.id)?'background:var(--s2);border-left:3px solid var(--t1);padding-left:13px;':''}transition:background .15s" onmouseover="if('${escAttr(String(n.id))}'!=='${escAttr(String(active?.id||''))}')this.style.background='var(--s2)'" onmouseout="if('${escAttr(String(n.id))}'!=='${escAttr(String(active?.id||''))}')this.style.background='none'">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:5px">
                <div style="font-size:13px;font-weight:600;line-height:1.35;flex:1">${esc(n.title)}</div>
                ${priorityChip(n.priority)}
              </div>
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:5px">
                ${statusChip(n.status)}
                <span style="font-size:11px;color:var(--t3)">${n.date}</span>
                <span style="font-size:11px;color:var(--t3)">·</span>
                <span style="font-size:11px;color:var(--t3)">${recipLabel(n.recipients)}</span>
                ${n.attachments&&n.attachments.length?`<svg width="11" height="11" fill="none" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`:''}
              </div>
              ${n.status!=='Draft'?`
                <div style="display:flex;align-items:center;gap:6px">
                  <div style="flex:1;height:3px;background:var(--b1);border-radius:99px;overflow:hidden">
                    <div style="height:100%;width:${n.readBy&&n.notReadBy?(n.readBy.length/(n.readBy.length+n.notReadBy.length)*100)||0:0}%;background:var(--green);border-radius:99px;transition:.3s"></div>
                  </div>
                  <span style="font-size:10px;color:var(--t3)">${n.readBy?n.readBy.length:0}/${n.readBy&&n.notReadBy?n.readBy.length+n.notReadBy.length:0} read</span>
                </div>
              `:`<span style="font-size:10px;color:var(--amber);font-weight:500">Draft — not sent</span>`}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- RIGHT: Notice Detail (desktop only) -->
      <div class="notice-detail-col card" style="overflow-y:auto;display:flex;flex-direction:column">
        ${active ? `
          <!-- Notice Header -->
          <div style="padding:20px 24px;border-bottom:1px solid var(--b1)">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px">
              <div style="font-size:20px;font-weight:700;line-height:1.3;flex:1">${active.title}</div>
              <div style="display:flex;gap:6px;align-items:center">
                ${priorityChip(active.priority)}
                ${statusChip(active.status)}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
              <div style="display:flex;align-items:center;gap:6px">
                <div style="width:26px;height:26px;border-radius:50%;background:#DBEAFE;color:#1D4ED8;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">RK</div>
                <div>
                  <div style="font-size:12px;font-weight:500">Rajesh Kumar</div>
                  <div style="font-size:10px;color:var(--t3)">Super Admin</div>
                </div>
              </div>
              <div style="font-size:12px;color:var(--t3);display:flex;align-items:center;gap:4px">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/><polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                ${active.date}
              </div>
              <div style="font-size:12px;color:var(--t3);display:flex;align-items:center;gap:4px">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.8"/><path d="M23 21v-2a4 4 0 00-3-3.87" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16 3.13a4 4 0 010 7.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                ${recipLabel(active.recipients)}
              </div>
              ${active.requireAck?`<span style="font-size:11px;padding:2px 8px;border-radius:99px;background:#FFFBEB;color:#B45309;font-weight:500">Acknowledgment Required</span>`:''}
            </div>
          </div>

          <!-- Actions Bar -->
          <div style="padding:10px 24px;border-bottom:1px solid var(--b1);display:flex;gap:8px;background:var(--s2)">
            ${active.status==='Draft'?`
              <button onclick="noticeSendFromDetail('${escAttr(String(active.id))}')" class="btn btn-primary" style="font-size:12px">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                Send Now
              </button>
              <button onclick="noticeEditDraft('${escAttr(String(active.id))}')" class="btn btn-secondary" style="font-size:12px">Edit Draft</button>
            `:`
              <button onclick="toast('Notice resent successfully','success')" class="btn btn-secondary" style="font-size:12px">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Resend
              </button>
            `}
            <button onclick="noticeDownloadPdf('${escAttr(String(active.id))}')" class="btn btn-secondary" style="font-size:12px">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              Download PDF
            </button>
            <button onclick="noticeDeleteConfirm('${escAttr(String(active.id))}')" style="margin-left:auto;background:none;border:1px solid var(--b2);border-radius:var(--r6);padding:6px 10px;cursor:pointer;color:var(--red);font-size:12px;display:flex;align-items:center;gap:4px;transition:.15s" onmouseover="this.style.background='#FEE2E2'" onmouseout="this.style.background='none'">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              Delete
            </button>
          </div>

          <!-- Notice Content -->
          <div style="padding:24px;flex:1">
            <div style="font-size:14px;line-height:1.8;color:var(--t1);margin-bottom:20px">${active.content}</div>

            <!-- Attachments -->
            ${active.attachments&&active.attachments.length?`
              <div style="margin-bottom:20px">
                <div style="font-size:12px;font-weight:600;margin-bottom:10px;display:flex;align-items:center;gap:6px">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  Attachments (${active.attachments.length})
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:8px">
                  ${active.attachments.map(a=>`
                    <div onclick="noticeOpenAttachment('${escAttr((a && a.fileId) || '')}','${escAttr(_ntAttName(a))}')" style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:var(--s2);border:1px solid var(--b1);border-radius:var(--r6);font-size:12px;cursor:pointer;transition:.15s" onmouseover="this.style.background='var(--s3)'" onmouseout="this.style.background='var(--s2)'">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#DC2626" stroke-width="1.8"/><polyline points="14 2 14 8 20 8" stroke="#DC2626" stroke-width="1.8"/></svg>
                      <span>${esc(_ntAttName(a))}</span>
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                    </div>
                  `).join('')}
                </div>
              </div>
            `:''}

            <!-- Read Receipts -->
            ${active.status!=='Draft'?`
              <div style="border-top:1px solid var(--b1);padding-top:20px">
                <div style="font-size:12px;font-weight:600;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between">
                  <span style="display:flex;align-items:center;gap:6px">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/></svg>
                    Read Receipts
                  </span>
                  <span style="font-size:11px;font-weight:400;color:var(--t3)">${active.readBy?active.readBy.length:0} of ${active.readBy&&active.notReadBy?active.readBy.length+active.notReadBy.length:0} read</span>
                </div>
                <div style="height:6px;background:var(--b1);border-radius:99px;margin-bottom:14px;overflow:hidden">
                  <div style="height:100%;width:${active.readBy&&active.notReadBy&&(active.readBy.length+active.notReadBy.length)>0?(active.readBy.length/(active.readBy.length+active.notReadBy.length)*100):0}%;background:var(--green);border-radius:99px;transition:.4s"></div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                  <div>
                    <div style="font-size:11px;font-weight:600;color:var(--green);margin-bottom:8px;display:flex;align-items:center;gap:4px">
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      Read (${active.readBy?active.readBy.length:0})
                    </div>
                    ${active.readBy&&active.readBy.length?active.readBy.map(name=>`
                      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                        <div style="width:22px;height:22px;border-radius:50%;background:var(--s3);font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;color:var(--t2);flex-shrink:0">${name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                        <span style="font-size:11px;color:var(--t1)">${name}</span>
                      </div>
                    `).join(''):'<span style="font-size:11px;color:var(--t3)">No one yet</span>'}
                  </div>
                  <div>
                    <div style="font-size:11px;font-weight:600;color:var(--red);margin-bottom:8px;display:flex;align-items:center;gap:4px">
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                      Not Read (${active.notReadBy?active.notReadBy.length:0})
                    </div>
                    ${active.notReadBy&&active.notReadBy.length?active.notReadBy.map(name=>`
                      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                        <div style="width:22px;height:22px;border-radius:50%;background:#FEE2E2;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;color:#DC2626;flex-shrink:0">${name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                        <span style="font-size:11px;color:var(--t1)">${name}</span>
                        <button onclick="toast('Reminder sent to ${name}','success')" style="margin-left:auto;font-size:10px;background:none;border:none;color:var(--blue);cursor:pointer;padding:0">Remind</button>
                      </div>
                    `).join(''):'<div style="font-size:11px;color:var(--green)">Everyone has read this ✓</div>'}
                  </div>
                </div>
              </div>
            `:''}
          </div>
        ` : `
          <div style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:var(--t3);padding:60px">
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24"><path d="M9 11H6a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2v-6a2 2 0 00-2-2h-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M9 11V7a3 3 0 016 0v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <div style="font-size:14px;font-weight:500;color:var(--t2)">Select a notice to view</div>
            <div style="font-size:12px">Or compose a new announcement</div>
          </div>
        `}
      </div>
    </div>
  `;
  if (typeof updateBackButton === 'function') updateBackButton();
}

// ── Notice Helper Functions ──
function noticeInsertLink() {
  const url = prompt('Enter URL:');
  if (url) { document.execCommand('createLink', false, url.startsWith('http')?url:'https://'+url); document.getElementById('nc-editor').focus(); }
}
/* attachments are really uploaded (stored on the server) so employees can open them */
function noticeHandleFile(input) {
  const files = Array.from(input.files || []);
  if (!files.length) return;
  if (!window.OmentAPI || !OmentAPI.uploadFile) { toast('Attachments need the backend server', 'error'); return; }
  const big = files.filter(f => f.size > 50 * 1024 * 1024);
  if (big.length) toast(big.length + ' file(s) over 50 MB skipped', 'error');
  let chain = Promise.resolve();
  toast('Uploading ' + files.length + ' file(s)\u2026');
  files.filter(f => f.size <= 50 * 1024 * 1024).forEach(f => {
    chain = chain.then(() => OmentAPI.uploadFile(f).then(r => {
      noticeCompose.attachments.push({ name: r.name || f.name, fileId: r.fileId, mime: r.mime, sizeBytes: r.sizeBytes,
        sizeLabel: f.size > 1048576 ? (f.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(f.size / 1024)) + ' KB' });
    }));
  });
  chain.then(() => { renderNoticesModule(); toast('Attachment added', 'success'); })
       .catch(err => { renderNoticesModule(); toast('Upload failed: ' + err.message, 'error'); });
}
function _ntAttName(a) { return typeof a === 'string' ? a : (a && a.name) || 'file'; }
function noticeOpenAttachment(fileId, name) {
  if (!fileId) { toast('This attachment was added before uploads were connected \u2014 please attach it again', 'error'); return; }
  OmentAPI.openFile(fileId, name, true).catch(err => toast(err.message, 'error'));
}
function noticeSearch(q) {
  const items = document.querySelectorAll('#view-notices [onclick*="STATE.currentNotice"]');
  items.forEach(el => { el.style.display = q && !el.textContent.toLowerCase().includes(q.toLowerCase()) ? 'none' : ''; });
}
function noticeSendNow() {
  const title = document.getElementById('nc-title')?.value?.trim();
  if (!title) { toast('Notice title is required', 'error'); return; }
  const content = document.getElementById('nc-editor')?.innerHTML || noticeCompose.content;
  const plainText = String(content || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  if (!plainText || plainText === 'Write your notice here…') { toast('Please write notice content', 'error'); return; }
  const emp = STATE.employees;
  const newNotice = {
    id: STATE.notices.length + Date.now(),
    title, date: '14 May 2026',
    recipients: noticeCompose.recipients,
    priority: noticeCompose.priority,
    requireAck: noticeCompose.requireAck,
    readBy: [],
    notReadBy: emp.map(e=>e.name),
    status: noticeCompose.scheduleSend ? 'Scheduled' : 'Sent',
    content,
    attachments: [...noticeCompose.attachments]
  };
  DataAPI.createNotice({
    title: newNotice.title,
    content: content,
    recipients: noticeCompose.recipients,
    priority: noticeCompose.priority,
    status: 'Sent',
    attachments: [...noticeCompose.attachments]
  }).then(function (created) {
    return DataAPI.sendNotice(created.id).then(function () { return created; });
  }).then(function (created) {
    syncState();
    STATE.currentNotice = created.id;
    noticeCompose.active = false;
    renderNoticesModule();
    toast('Notice sent to team \u2713', 'success');
  }).catch(function (err) { toast(err.message, 'error'); });
}
function noticeSaveDraft() {
  const title = document.getElementById('nc-title')?.value?.trim() || 'Untitled Draft';
  const content = document.getElementById('nc-editor')?.innerHTML || '';
  DataAPI.createNotice({
    title: title,
    content: content,
    recipients: noticeCompose.recipients,
    priority: noticeCompose.priority,
    status: 'Draft',
    attachments: [...noticeCompose.attachments]
  }).then(function () {
    syncState();
    noticeCompose.active = false;
    renderNoticesModule();
    toast('Draft saved', 'success');
  }).catch(function (err) { toast(err.message, 'error'); });
}
function noticeSendFromDetail(id) {
  const n = STATE.notices.find(n=>String(n.id)===String(id));
  if (!n) return;
  DataAPI.sendNotice(id).then(function () {
    syncState(); renderNoticesModule(); toast('Notice sent to team \u2713', 'success');
  }).catch(function (err) { toast(err.message, 'error'); });
}
function noticeEditDraft(id) {
  const n = STATE.notices.find(n=>String(n.id)===String(id));
  if (!n) return;
  noticeCompose = { active:true, title:n.title, content:n.content, recipients:n.recipients, priority:n.priority, attachments:[...n.attachments], scheduleSend:false, scheduleDate:'', requireAck:n.requireAck||false, editingId:id };
  DataAPI.deleteNotice(id).then(function () { syncState(); renderNoticesModule(); });
}
function noticeDeleteConfirm(id) {
  const n = STATE.notices.find(n=>String(n.id)===String(id));
  if (!n) return;
  showConfirm(`Delete "${esc(n.title)}"? This cannot be undone.`, function () {
    DataAPI.deleteNotice(id).then(function () {
      syncState();
      STATE.currentNotice = STATE.notices[0]?.id || null;
      renderNoticesModule();
      toast('Notice deleted', 'error');
    }).catch(function (err) { toast(err.message, 'error'); });
  });
}





/* Download the notice as a PDF (made on the server) */
function noticeDownloadPdf(id) {
  const n = STATE.notices.find(x => String(x.id) === String(id));
  if (!window.OmentAPI || !OmentAPI.downloadPath) { toast('PDF needs the backend server', 'error'); return; }
  toast('Preparing PDF\u2026');
  OmentAPI.downloadPath('/notices/' + encodeURIComponent(id) + '/pdf', 'Notice-' + String((n && n.title) || id).replace(/[^\w.-]+/g, '_').slice(0, 60) + '.pdf')
    .catch(function (err) { toast('Could not download: ' + err.message, 'error'); });
}

(function () {
  if (document.getElementById('nc-placeholder-css')) return;
  const st = document.createElement('style'); st.id = 'nc-placeholder-css';
  st.textContent = '#nc-editor:empty:before{content:attr(data-placeholder);color:var(--t4,#A3A1A7);pointer-events:none}' +
    '#nc-editor:focus:empty:before{color:var(--t4,#C4C2C7)}';
  document.head.appendChild(st);
})();
var PF_TAB = 'overview';
var PF_OPEN = null;   // expanded project id

function rupee(paise) { return paise == null ? '\u2014' : Utils.fmtRupee(paise).replace('.00', ''); }

function marginTone(pct, target) {
  if (pct == null) return ['var(--t3)', 'var(--s2)'];
  if (pct < 0) return ['var(--red)', '#FEF2F2'];
  if (pct < target * 0.5) return ['var(--red)', '#FEF2F2'];
  if (pct < target) return ['var(--amber)', '#FFFBEB'];
  return ['var(--green)', '#ECFDF5'];
}

var HEALTH_LABEL = {
  LOSS: 'Losing money', CRITICAL: 'Critical', BELOW_TARGET: 'Below target',
  HEALTHY: 'Healthy', UNKNOWN: 'No data'
};

function renderProfit() {
  var v = document.getElementById('view-profit');
  if (!v) return;

  var tabs = [['overview', 'Overview'], ['clients', 'Clients'], ['people', 'People'], ['rates', 'Rates']];

  v.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:12px">' +
      '<div>' +
        '<div class="section-title" style="font-size:20px">Profitability</div>' +
        '<div class="section-sub">What each project actually earns after the cost of doing it</div>' +
      '</div>' +
      '<button class="btn btn-secondary btn-sm" onclick="pfExport()">Export CSV</button>' +
    '</div>' +
    '<div class="tab-bar" style="margin-bottom:18px">' +
      tabs.map(function (t) {
        return '<button class="tab-btn' + (PF_TAB === t[0] ? ' active' : '') +
          '" onclick="pfSetTab(\'' + t[0] + '\')">' + t[1] + '</button>';
      }).join('') +
    '</div>' +
    '<div id="pf-pane"></div>';

  pfRenderPane();
}

function pfSetTab(t) { PF_TAB = t; renderProfit(); }

function pfRenderPane() {
  var pane = document.getElementById('pf-pane');
  if (!pane) return;
  pane.innerHTML = '<div style="padding:30px;text-align:center;color:var(--t3);font-size:13px">Calculating\u2026</div>';

  if (PF_TAB === 'overview') return pfOverview(pane);
  if (PF_TAB === 'clients')  return pfClients(pane);
  if (PF_TAB === 'people')   return pfPeople(pane);
  if (PF_TAB === 'rates')    return pfRates(pane);
}

/* ══════════════════════════ OVERVIEW ══════════════════════════ */
function pfOverview(pane) {
  Promise.all([Profit.getPortfolio(), Profit.getAlerts(), Profit.getRateCoverage()])
    .then(function (res) {
      var pf = res[0], alerts = res[1], cov = res[2];
      var t = pf.totals, target = pf.targetMarginPct;
      var tone = marginTone(t.marginPct, target);

      var warn = cov.complete ? '' :
        '<div style="padding:11px 15px;background:#FFFBEB;border-radius:var(--r10);margin-bottom:16px;font-size:12.5px;color:#92400E">' +
          '<strong>' + cov.missing.length + ' ' + (cov.missing.length === 1 ? 'person has' : 'people have') +
          ' no cost rate set</strong> \u2014 ' + esc(cov.missing.map(function (m) { return m.name; }).join(', ')) +
          '. Their time is being counted as free, so margins below are overstated. ' +
          '<a onclick="pfSetTab(\'rates\')" style="color:#92400E;text-decoration:underline;cursor:pointer">Set rates</a>' +
        '</div>';

      var alertBlock = alerts.length ?
        '<div class="card card-pad" style="margin-bottom:18px">' +
          '<div class="section-header"><div><div class="section-title">Needs your attention</div>' +
          '<div class="section-sub">Click any of these to open the project</div></div></div>' +
          alerts.slice(0, 5).map(function (a) {
            var c = a.severity === 'high' ? ['var(--red)', '#FEF2F2'] : ['var(--amber)', '#FFFBEB'];
            return '<div style="display:flex;gap:11px;padding:9px 0;border-bottom:1px solid var(--b1);cursor:pointer" ' +
              'onclick="pfOpenProject(' + a.projectId + ')">' +
              '<div style="width:6px;border-radius:99px;background:' + c[0] + ';flex-shrink:0"></div>' +
              '<div style="flex:1;min-width:0">' +
                '<div style="font-size:12.5px;font-weight:600;color:' + c[0] + '">' + esc(a.title) + '</div>' +
                '<div style="font-size:11.5px;color:var(--t3);line-height:1.5">' + esc(a.detail) + '</div>' +
              '</div></div>';
          }).join('') +
        '</div>' : '';

      var H = Glossary.helpIcon;
      var kpis = [
        ['Total deal value' + H('recognisedRevenue'), rupee(t.contractPaise), 'var(--t1)', 'owed by clients'],
        ['Invoiced' + H('gstNote'), rupee(t.invoicedPaise), 'var(--blue)', 'excluding GST'],
        ['Collected' + H('outstanding'), rupee(t.collectedPaise), 'var(--green)',
          rupee(t.outstandingPaise) + ' still outstanding'],
        ['Cost of work' + H('loadedCost'), rupee(t.costPaise), 'var(--amber)',
          Math.round(t.loggedSecs / 3600) + ' team hours logged'],
        ['Profit' + H('margin'), (t.marginPct == null ? '\u2014' : t.marginPct + '%'), tone[0],
          rupee(t.marginPaise) + ' \u00b7 target ' + target + '%']
      ];

      pane.innerHTML = warn +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:12px;margin-bottom:18px">' +
          kpis.map(function (k) {
            return '<div class="stat-card">' +
              '<div class="stat-label">' + k[0] + '</div>' +
              '<div class="stat-value" style="font-size:19px;color:' + k[2] + '">' + k[1] + '</div>' +
              '<div class="stat-sub">' + esc(k[3]) + '</div></div>';
          }).join('') +
        '</div>' +

        '<div class="card card-pad" style="margin-bottom:18px">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
            '<div style="font-size:13px;font-weight:600">Earned per hour' + Glossary.helpIcon('effectiveRate') + '</div>' +
            '<div style="font-size:20px;font-weight:800;font-family:var(--mono)">' +
              rupee(t.effectiveRatePaise) + (t.effectiveRatePaise == null ? '' : '<span style="font-size:12px;font-weight:500;color:var(--t3)">/hour</span>') + '</div>' +
          '</div>' +
          '<div style="font-size:12px;color:var(--t3);line-height:1.6">' +
            'Earnings per hour based on the hours the team logged. ' +
            'If this is far below your rate, the work took much longer than planned.</div>' +
        '</div>' +

        alertBlock +

        '<div class="card">' +
          '<div style="padding:14px 16px;border-bottom:1px solid var(--b1)">' +
            '<div class="section-title">Project P&amp;L</div>' +
            '<div class="section-sub">Worst first \u00b7 tap a row for the breakdown</div>' +
          '</div>' +
          pf.projects.map(function (p) { return pfProjectRow(p, target); }).join('') +
        '</div>';
    });
}

function pfProjectRow(p, target) {
  var tone = marginTone(p.marginPct, target);
  var ptone = marginTone(p.projectedMarginPct, target);
  var open = PF_OPEN === p.projectId;

  var head =
    '<div style="padding:14px 16px;border-bottom:1px solid var(--b1);cursor:pointer" onclick="pfToggle(' + p.projectId + ')">' +
      '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
        '<div style="flex:1;min-width:170px">' +
          '<div style="font-size:13.5px;font-weight:700;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
            esc(p.name) +
            '<span style="font-size:10px;font-weight:600;padding:1px 8px;border-radius:99px;' +
              'background:' + ptone[1] + ';color:' + ptone[0] + '">' + HEALTH_LABEL[p.health] + '</span>' +
          '</div>' +
          '<div style="font-size:11.5px;color:var(--t3)">' + esc(p.client) + '</div>' +
        '</div>' +
        '<div style="text-align:right;min-width:88px">' +
          '<div style="font-size:9.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">Deal value</div>' +
          '<div style="font-size:13px;font-weight:700;font-family:var(--mono)">' + rupee(p.contractPaise) + '</div>' +
        '</div>' +
        '<div style="text-align:right;min-width:88px">' +
          '<div style="font-size:9.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">Cost</div>' +
          '<div style="font-size:13px;font-weight:700;font-family:var(--mono);color:var(--amber)">' +
            rupee(p.costPaise) + '</div>' +
        '</div>' +
        '<div style="text-align:right;min-width:74px">' +
          '<div style="font-size:9.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">Profit so far</div>' +
          '<div style="font-size:15px;font-weight:800;font-family:var(--mono);color:' + tone[0] + '">' +
            (p.marginPct == null ? '\u2014' : p.marginPct + '%') + '</div>' +
        '</div>' +
        '<div style="text-align:right;min-width:74px">' +
          '<div style="font-size:9.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px">Forecast' +
            Glossary.helpIcon('forecastMargin', 11) + '</div>' +
          '<div style="font-size:15px;font-weight:800;font-family:var(--mono);color:' + ptone[0] + '">' +
            (p.projectedMarginPct == null ? '\u2014' : p.projectedMarginPct + '%') + '</div>' +
        '</div>' +
      '</div>' +

      '<div style="margin-top:11px">' +
        '<div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--t3);margin-bottom:3px">' +
          '<span>Budget spent: ' + (p.burnPct == null ? '\u2014' : p.burnPct + '%') +
            Glossary.helpIcon('burnVsDelivery', 11) + '</span>' +
          '<span>Work delivered: ' + p.deliveryPct + '%</span>' +
        '</div>' +
        '<div style="position:relative;height:8px;background:var(--s2);border-radius:99px;overflow:hidden">' +
          '<div style="position:absolute;inset:0;width:' + Math.min(100, p.deliveryPct) + '%;' +
            'background:var(--s4);border-radius:99px"></div>' +
          '<div style="position:absolute;top:2px;bottom:2px;left:0;width:' + Math.min(100, p.burnPct || 0) + '%;' +
            'background:' + (p.burnAhead ? 'var(--red)' : 'var(--blue)') + ';border-radius:99px"></div>' +
        '</div>' +
        (p.burnAhead ? '<div style="font-size:11.5px;color:var(--red);margin-top:5px;font-weight:600">' +
          '\u26A0 Spending faster than delivering \u2014 needs attention</div>' : '') +
      '</div>' +
    '</div>';

  if (!open) return head;

  /* ── Expanded breakdown ── */
  var revenueRows = [
    ['Deal value (total)', p.contractPaise, 'var(--t1)'],
    ['Invoiced', p.invoicedPaise, 'var(--blue)'],
    ['Collected', p.collectedPaise, 'var(--green)'],
    ['Delivered, not invoiced', p.wipPaise, 'var(--amber)'],
    ['Outstanding', p.outstandingPaise, p.outstandingPaise > 0 ? 'var(--red)' : 'var(--t3)']
  ];

  var detail =
    '<div style="padding:16px;background:var(--s2);border-bottom:1px solid var(--b1)">' +

      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-bottom:16px">' +
        '<div class="card card-pad" style="margin:0">' +
          '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);margin-bottom:10px">Money coming in</div>' +
          revenueRows.map(function (r) {
            return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--b1);font-size:12.5px">' +
              '<span style="color:var(--t2)">' + r[0] + '</span>' +
              '<span style="font-family:var(--mono);font-weight:600;color:' + r[2] + '">' + rupee(r[1]) + '</span></div>';
          }).join('') +
        '</div>' +

        '<div class="card card-pad" style="margin:0">' +
          '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);margin-bottom:10px">Cost</div>' +
          [['Cost so far', p.costPaise, 'var(--amber)'],
           ['Hours spent', null, 'var(--t2)', p.loggedHours + ' h'],
           ['Remaining work', p.forecastRemainingCostPaise, 'var(--t2)'],
           ['Total cost forecast', p.projectedCostPaise, 'var(--t1)'],
           ['Profit at completion', p.projectedMarginPaise, marginTone(p.projectedMarginPct, p.targetMarginPct)[0]]
          ].map(function (r) {
            return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--b1);font-size:12.5px">' +
              '<span style="color:var(--t2)">' + r[0] + '</span>' +
              '<span style="font-family:var(--mono);font-weight:600;color:' + r[2] + '">' +
                (r[3] || rupee(r[1])) + '</span></div>';
          }).join('') +
          '<div style="font-size:11.5px;color:var(--t3);margin-top:9px;line-height:1.5">' +
            'Effective rate <strong style="color:var(--t1)">' + rupee(p.effectiveRatePaise) + '/hr</strong></div>' +
        '</div>' +
      '</div>' +

      '<div class="card card-pad" style="margin:0 0 16px">' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);margin-bottom:10px">' +
          'Where the money went</div>' +
        (p.deliverables.some(function (d) { return d.costPaise > 0; })
          ? p.deliverables.filter(function (d) { return d.costPaise > 0; }).map(function (d) {
          var over = d.overrunPct != null && d.overrunPct > 15;
          return '<div style="padding:9px 0;border-bottom:1px solid var(--b1)">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<div style="flex:1;min-width:0">' +
                '<div style="font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
                  esc(d.title) + '</div>' +
                '<div style="font-size:11px;color:var(--t3)">' +
                  Schema.TIME.fmtShort(d.actualSecs) +
                  (d.estimateSecs ? ' of ' + Schema.TIME.fmtShort(d.estimateSecs) + ' estimated' : '') +
                  (d.overrunPct != null ?
                    ' \u00b7 <span style="color:' + (over ? 'var(--red)' : 'var(--t3)') + ';font-weight:600">' +
                    (d.overrunPct >= 0 ? '+' : '') + d.overrunPct + '%</span>' : '') +
                '</div>' +
              '</div>' +
              '<span style="font-family:var(--mono);font-size:12.5px;font-weight:700;color:var(--amber)">' +
                rupee(d.costPaise) + '</span>' +
            '</div>' +
            '<div style="display:flex;gap:4px;margin-top:5px;flex-wrap:wrap">' +
              d.contributors.map(function (c) {
                return '<span style="font-size:10px;padding:1px 7px;border-radius:99px;background:' +
                  (c.attributed ? 'var(--s3)' : 'var(--s2)') + ';color:var(--t2)" title="' +
                  escAttr(rupee(c.costPaise) + ' at ' + rupee(c.loadedRatePaise) + '/hr') + '">' +
                  esc(c.name.split(' ')[0]) + ' ' + Schema.TIME.fmtShort(c.secs) + '</span>';
              }).join('') +
            '</div>' +
          '</div>';
        }).join('')
          : '<div style="font-size:12.5px;color:var(--t3);padding:8px 0;line-height:1.6">' +
            'No time has been logged on this project yet, so cost is \u20b90 and the margin ' +
            'shows 100% \u2014 which isn’t real.</div>') +
      '</div>' +

      (p.team.length ?
        '<div class="card card-pad" style="margin:0">' +
          '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);margin-bottom:10px">' +
            'Who did the work</div>' +
          p.team.map(function (m) {
            var pct = p.costPaise ? Math.round(m.costPaise / p.costPaise * 100) : 0;
            return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--b1)">' +
              '<div class="avatar avatar-sm" style="background:' + m.avatarBg + ';color:' + m.avatarFg + '">' +
                esc(m.avatarInitials) + '</div>' +
              '<div style="flex:1;min-width:0">' +
                '<div style="font-size:12.5px;font-weight:600">' + esc(m.name) + '</div>' +
                '<div style="font-size:11px;color:var(--t3)">' + Schema.TIME.fmtShort(m.secs) +
                  ' at ' + rupee(m.loadedRatePaise) + '/hr loaded</div>' +
              '</div>' +
              '<span style="font-family:var(--mono);font-size:12.5px;font-weight:700">' + rupee(m.costPaise) + '</span>' +
              '<span style="font-size:11px;color:var(--t3);width:32px;text-align:right">' + pct + '%</span>' +
            '</div>';
          }).join('') +
        '</div>' : '') +
    '</div>';

  return head + detail;
}

function pfToggle(id) { PF_OPEN = PF_OPEN === id ? null : id; pfRenderPane(); }
function pfOpenProject(id) { PF_TAB = 'overview'; PF_OPEN = id; renderProfit(); }

/* ══════════════════════════ CLIENTS ══════════════════════════ */
function pfClients(pane) {
  Promise.all([Profit.getByClient(), Profit.getSettings()]).then(function (res) {
    var rows = res[0], cfg = res[1];
    pane.innerHTML =
      '<div style="font-size:12.5px;color:var(--t3);margin-bottom:14px;line-height:1.55">' +
        'The biggest client is often not the most profitable. Look at the effective rate \u2014 ' +
        'it shows what each client pays per hour of work.</div>' +
      '<div class="card">' +
        rows.map(function (c) {
          var tone = marginTone(c.marginPct, cfg.targetMarginPct);
          return '<div style="padding:14px 16px;border-bottom:1px solid var(--b1)">' +
            '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:9px">' +
              '<div style="flex:1;min-width:150px">' +
                '<div style="font-size:13.5px;font-weight:700">' + esc(c.client) + '</div>' +
                '<div style="font-size:11.5px;color:var(--t3)">' + c.projects +
                  ' project' + (c.projects === 1 ? '' : 's') + ' \u00b7 ' +
                  Math.round(c.loggedSecs / 3600) + ' hours</div>' +
              '</div>' +
              '<div style="text-align:right;min-width:90px">' +
                '<div style="font-size:9.5px;color:var(--t3);text-transform:uppercase">Invoiced</div>' +
                '<div style="font-size:13px;font-weight:700;font-family:var(--mono)">' + rupee(c.invoicedPaise) + '</div></div>' +
              '<div style="text-align:right;min-width:90px">' +
                '<div style="font-size:9.5px;color:var(--t3);text-transform:uppercase">Cost</div>' +
                '<div style="font-size:13px;font-weight:700;font-family:var(--mono);color:var(--amber)">' +
                  rupee(c.costPaise) + '</div></div>' +
              '<div style="text-align:right;min-width:90px">' +
                '<div style="font-size:9.5px;color:var(--t3);text-transform:uppercase">Effective rate</div>' +
                '<div style="font-size:13px;font-weight:700;font-family:var(--mono)">' +
                  rupee(c.effectiveRatePaise) + '<span style="font-size:10px;color:var(--t3)">/hr</span></div></div>' +
              '<div style="text-align:right;min-width:70px">' +
                '<div style="font-size:9.5px;color:var(--t3);text-transform:uppercase">Margin</div>' +
                '<div style="font-size:16px;font-weight:800;font-family:var(--mono);color:' + tone[0] + '">' +
                  (c.marginPct == null ? '\u2014' : c.marginPct + '%') + '</div></div>' +
            '</div>' +
            '<div style="height:6px;background:var(--s2);border-radius:99px;overflow:hidden">' +
              '<div style="height:100%;width:' + Math.max(0, Math.min(100, c.marginPct || 0)) + '%;' +
                'background:' + tone[0] + ';border-radius:99px"></div></div>' +
          '</div>';
        }).join('') +
      '</div>';
  });
}

/* ══════════════════════════ PEOPLE ══════════════════════════ */
function pfPeople(pane) {
  Profit.getByEmployee().then(function (rows) {
    pane.innerHTML =
      '<div style="font-size:12.5px;color:var(--t3);margin-bottom:14px;line-height:1.55">' +
        'Billable value per rupee of cost' + Glossary.helpIcon('costMultiple') +
        '. <strong>Above 2.0\u00d7 is healthy</strong> \u2014 ' +
        'below that, time is going into non-billable work or the rate is too low.</div>' +
      '<div class="card">' +
        (rows.length ? rows.map(function (r) {
          var mult = r.multiple;
          var tone = mult == null ? ['var(--t3)', 'var(--s2)']
            : mult >= 2 ? ['var(--green)', '#ECFDF5']
            : mult >= 1.4 ? ['var(--amber)', '#FFFBEB']
            : ['var(--red)', '#FEF2F2'];
          return '<div style="padding:13px 16px;border-bottom:1px solid var(--b1)">' +
            '<div style="display:flex;align-items:center;gap:11px;flex-wrap:wrap">' +
              '<div class="avatar avatar-sm" style="background:' + r.avatarBg + ';color:' + r.avatarFg + '">' +
                esc(r.avatarInitials) + '</div>' +
              '<div style="flex:1;min-width:140px">' +
                '<div style="font-size:13px;font-weight:700">' + esc(r.name) + '</div>' +
                '<div style="font-size:11px;color:var(--t3)">' + esc(r.role) + ' \u00b7 ' + r.hours + ' h logged</div>' +
              '</div>' +
              '<div style="text-align:right;min-width:80px">' +
                '<div style="font-size:9.5px;color:var(--t3);text-transform:uppercase">Loaded cost</div>' +
                '<div style="font-size:12.5px;font-weight:700;font-family:var(--mono);color:var(--amber)">' +
                  rupee(r.costPaise) + '</div></div>' +
              '<div style="text-align:right;min-width:90px">' +
                '<div style="font-size:9.5px;color:var(--t3);text-transform:uppercase">Billable value</div>' +
                '<div style="font-size:12.5px;font-weight:700;font-family:var(--mono);color:var(--blue)">' +
                  rupee(r.billableValuePaise) + '</div></div>' +
              '<div style="text-align:right;min-width:80px">' +
                '<div style="font-size:9.5px;color:var(--t3);text-transform:uppercase">Contribution</div>' +
                '<div style="font-size:12.5px;font-weight:700;font-family:var(--mono);color:' +
                  (r.contributionPaise >= 0 ? 'var(--green)' : 'var(--red)') + '">' +
                  rupee(r.contributionPaise) + '</div></div>' +
              '<span style="font-size:13px;font-weight:800;font-family:var(--mono);padding:4px 11px;' +
                'border-radius:99px;background:' + tone[1] + ';color:' + tone[0] + ';min-width:56px;text-align:center">' +
                (mult == null ? '\u2014' : mult + '\u00d7') + '</span>' +
            '</div>' +
          '</div>';
        }).join('')
        : '<div class="empty-teach"><div class="empty-teach-icon">\uD83D\uDCB0</div>' +
          '<div class="empty-teach-title">Nobody has logged time yet</div>' +
          '<div class="empty-teach-body">Cost is only calculated when employees run the timer ' +
          'in their app. Without it, margin only shows revenue, which gives a false picture.</div></div>') +
      '</div>';
  });
}

/* ══════════════════════════ RATES ══════════════════════════ */
function pfRates(pane) {
  Promise.all([Profit.getSettings(), DataAPI.getEmployees()]).then(function (res) {
    var cfg = res[0], emps = res[1];

    pane.innerHTML =
      '<div class="card card-pad" style="margin-bottom:18px;max-width:640px">' +
        '<div class="section-header"><div><div class="section-title">Cost model</div>' +
          '<div class="section-sub">These numbers drive every margin calculation</div></div></div>' +
        '<div class="form-row">' +
          '<div class="form-group">' +
            '<label class="form-label">Overhead multiplier' + Glossary.helpIcon('overheadMultiplier') + '</label>' +
            '<input class="form-input" id="pf-oh" type="number" min="1" max="3" step="0.05" value="' + cfg.overheadMultiplier + '">' +
            '<div class="form-hint">Rent, laptop, software, HR and bench time on top of salary. ' +
              'Most Indian agencies use 1.3\u20131.5. Use salary alone and every project looks profitable while the company still loses money.</div>' +
            '<div class="form-error" id="pf-oh-err">Must be between 1.0 and 3.0</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">Target margin %</label>' +
            '<input class="form-input" id="pf-target" type="number" min="0" max="95" step="1" value="' + cfg.targetMarginPct + '">' +
            '<div class="form-hint">Projects below this get flagged.</div>' +
            '<div class="form-error" id="pf-target-err">Must be between 0 and 95</div>' +
          '</div>' +
        '</div>' +
        '<button class="btn btn-primary btn-sm" onclick="pfSaveSettings()">Save cost model</button>' +
      '</div>' +

      '<div class="card">' +
        '<div style="padding:14px 16px;border-bottom:1px solid var(--b1)">' +
          '<div class="section-title">Per-person rates</div>' +
          '<div class="section-sub">Cost = CTC \u00f7 annual working hours. Bill = client rate.</div>' +
        '</div>' +
        '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:640px">' +
          '<thead><tr style="background:var(--s2)">' +
            '<th style="text-align:left;padding:9px 14px;font-size:10.5px;font-weight:700;color:var(--t3);text-transform:uppercase">Person</th>' +
            '<th style="text-align:right;padding:9px 10px;font-size:10.5px;font-weight:700;color:var(--t3);text-transform:uppercase">Cost \u20b9/hr</th>' +
            '<th style="text-align:right;padding:9px 10px;font-size:10.5px;font-weight:700;color:var(--t3);text-transform:uppercase">Loaded</th>' +
            '<th style="text-align:right;padding:9px 10px;font-size:10.5px;font-weight:700;color:var(--t3);text-transform:uppercase">Bill \u20b9/hr</th>' +
            '<th style="text-align:right;padding:9px 14px;font-size:10.5px;font-weight:700;color:var(--t3);text-transform:uppercase">Margin</th>' +
          '</tr></thead><tbody>' +
          emps.map(function (e) {
            var loaded = Math.round((e.costPerHourPaise || 0) * cfg.overheadMultiplier);
            var m = e.billRatePaise ? Math.round((1 - loaded / e.billRatePaise) * 100) : null;
            var tone = m == null ? ['var(--t3)', 'var(--s2)']
              : m < 20 ? ['var(--red)', '#FEF2F2']
              : m < 40 ? ['var(--amber)', '#FFFBEB']
              : ['var(--green)', '#ECFDF5'];
            return '<tr style="border-bottom:1px solid var(--b1)">' +
              '<td style="padding:9px 14px">' +
                '<div style="display:flex;align-items:center;gap:9px">' +
                  '<div class="avatar avatar-sm" style="background:' + e.avatarBg + ';color:' + e.avatarFg + '">' +
                    esc(e.avatarInitials) + '</div>' +
                  '<div><div style="font-size:12.5px;font-weight:600">' + esc(e.name) + '</div>' +
                  '<div style="font-size:10.5px;color:var(--t3)">' + esc(e.role) + '</div></div>' +
                '</div></td>' +
              '<td style="padding:6px 10px;text-align:right">' +
                '<input class="form-input" style="width:92px;text-align:right;padding:5px 8px;font-size:12px;font-family:var(--mono)" ' +
                  'type="number" min="0" step="10" id="rate-cost-' + e.id + '" ' +
                  'value="' + Math.round((e.costPerHourPaise || 0) / 100) + '" ' +
                  'onchange="pfSaveRate(' + e.id + ')"></td>' +
              '<td style="padding:6px 10px;text-align:right;font-family:var(--mono);font-size:12px;color:var(--t3)">' +
                rupee(loaded) + '</td>' +
              '<td style="padding:6px 10px;text-align:right">' +
                '<input class="form-input" style="width:92px;text-align:right;padding:5px 8px;font-size:12px;font-family:var(--mono)" ' +
                  'type="number" min="0" step="10" id="rate-bill-' + e.id + '" ' +
                  'value="' + Math.round((e.billRatePaise || 0) / 100) + '" ' +
                  'onchange="pfSaveRate(' + e.id + ')"></td>' +
              '<td style="padding:9px 14px;text-align:right">' +
                '<span style="font-size:12.5px;font-weight:700;font-family:var(--mono);padding:2px 9px;' +
                  'border-radius:99px;background:' + tone[1] + ';color:' + tone[0] + '">' +
                  (m == null ? '\u2014' : m + '%') + '</span></td>' +
            '</tr>';
          }).join('') +
        '</tbody></table></div>' +
      '</div>';
  });
}

function pfSaveSettings() {
  var oh = document.getElementById('pf-oh').value;
  var tg = document.getElementById('pf-target').value;
  document.getElementById('pf-oh-err').classList.remove('show');
  document.getElementById('pf-target-err').classList.remove('show');

  Profit.updateSettings({ overheadMultiplier: oh, targetMarginPct: tg }).then(function () {
    syncState(); pfRenderPane(); toast('Cost model updated \u2014 margins recalculated', 'success');
  }).catch(function (e) {
    if (/Overhead/.test(e.message)) document.getElementById('pf-oh-err').classList.add('show');
    else document.getElementById('pf-target-err').classList.add('show');
  });
}

function pfSaveRate(empId) {
  var c = document.getElementById('rate-cost-' + empId).value;
  var b = document.getElementById('rate-bill-' + empId).value;
  Profit.setEmployeeRates(empId, {
    costPerHourPaise: Number(c) * 100,
    billRatePaise: Number(b) * 100
  }).then(function () {
    syncState(); pfRenderPane(); toast('Rate updated', 'success');
  }).catch(function (e) { toast(e.message, 'error'); });
}

/* ══════════════════════════ EXPORT ══════════════════════════ */
function pfExport() {
  Profit.getPortfolio().then(function (pf) {
    var head = ['Project', 'Client', 'Status', 'Contract', 'Invoiced', 'Collected',
                'Delivered not invoiced', 'Cost', 'Hours', 'Margin', 'Margin %',
                'Projected cost', 'Projected margin %', 'Effective rate/hr',
                'Budget burned %', 'Delivered %', 'Health'];
    var rows = pf.projects.map(function (p) {
      return [p.name, p.client, p.status,
        Utils.paiseToRupees(p.contractPaise), Utils.paiseToRupees(p.invoicedPaise),
        Utils.paiseToRupees(p.collectedPaise), Utils.paiseToRupees(p.wipPaise),
        Utils.paiseToRupees(p.costPaise), p.loggedHours,
        Utils.paiseToRupees(p.marginPaise), p.marginPct == null ? '' : p.marginPct,
        Utils.paiseToRupees(p.projectedCostPaise),
        p.projectedMarginPct == null ? '' : p.projectedMarginPct,
        Utils.paiseToRupees(p.effectiveRatePaise),
        p.burnPct == null ? '' : p.burnPct, p.deliveryPct, HEALTH_LABEL[p.health]];
    });
    var csv = [head].concat(rows).map(function (r) {
      return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'profitability-' + Utils.isoDate(new Date()) + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Exported', 'success');
  });
}
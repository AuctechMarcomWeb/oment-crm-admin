
(function (root) {
  'use strict';

  var U = root.Utils;

  var SYSTEM_PROMPT = [
    'You are Een, the operations assistant inside Oment \u2014 an agency operations platform.',
    '',
    'Oment is NOT a CRM. It handles what happens AFTER a deal is closed:',
    'project delivery, milestones and deliverables, time tracking, attendance and leave,',
    'client invoicing, and project profitability.',
    '',
    'WHO YOU HELP',
    'You are speaking to the company admin/owner. Think like an experienced operations',
    'manager who knows this company, not like a general chatbot.',
    '',
    'HARD RULES \u2014 these are not style preferences:',
    '1. Every number, name and date you state MUST come from a tool result in this',
    '   conversation. Never recall, estimate, or infer figures.',
    '2. If a tool returns nothing, say plainly that the data is not there. Do not guess',
    '   and do not fill the gap with a plausible-sounding answer.',
    '3. If you are unsure which tool answers the question, call the tool and look,',
    '   rather than answering from memory.',
    '4. Money is stored in paise. Divide by 100 for rupees and format Indian style',
    '   (\u20b91,20,000). Time is stored in seconds; convert to hours.',
    '5. You cannot change anything. You can read data and recommend actions.',
    '   If the admin should do something, say what to do and where \u2014 do not claim',
    '   you have done it.',
    '',
    'HOW TO ANSWER',
    '\u2022 Lead with the answer, then the reasoning. Not the other way round.',
    '\u2022 Be specific: names, numbers, dates. "Brand Revamp is 129% over estimate"',
    '  not "some projects are running over".',
    '\u2022 Keep it short. 3-6 lines for most questions. Use a short list only when',
    '  there are genuinely several separate items.',
    '\u2022 When something looks wrong, say what you would do about it and why.',
    '\u2022 Match the language the admin writes in. If they write Hinglish, reply in',
    '  Hinglish. Keep the words simple either way.',
    '\u2022 Never invent a next step that the product cannot do.',
    '',
    'WHAT MATTERS MOST, IN ORDER',
    '1. Money leaking \u2014 projects losing money, delivered work not invoiced,',
    '   payments overdue',
    '2. People blocked \u2014 work sitting in review, someone overloaded',
    '3. Commitments at risk \u2014 deadlines about to slip',
    '4. Everything else'
  ].join('\n');

  var TOOLS = [
    {
      name: 'get_company_snapshot',
      description: 'Overall state of the company right now: totals for projects, ' +
        'money, people and pending work. Call this first for broad questions like ' +
        '"how are we doing" or "summarise today".',
      parameters: { type: 'object', properties: {} },
      run: function () {
        return root.DataAPI.getKpis().then(function (k) {
          var DB = root.DataAPI.raw();
          return {
            projects: { total: k.totalProjects, active: k.activeProjects },
            money: {
              billedRupees: U.paiseToRupees(k.billedPaise),
              receivedRupees: U.paiseToRupees(k.receivedPaise),
              overdueRupees: U.paiseToRupees(k.overduePaise),
              collectionPct: k.collectionPct
            },
            work: {
              openDeliverables: k.openDeliverables,
              awaitingYourReview: k.pendingReview,
              deliveredCount: k.deliveredCount,
              lateCount: k.lateCount,
              onTimePct: k.onTimePct
            },
            people: {
              total: k.totalEmployees,
              presentToday: k.presentToday,
              onLeaveToday: k.onLeaveToday
            },
            today: U.isoDate(new Date())
          };
        });
      }
    },

    {
      name: 'get_attention_signals',
      description: 'Everything that currently needs the admin\'s attention, already ' +
        'detected by the system: missed deadlines, work stuck in review, projects ' +
        'losing money, uninvoiced work, overdue payments, overloaded people. ' +
        'Use this for "what should I look at", "what is wrong", "what is stuck".',
      parameters: {
        type: 'object',
        properties: {
          minSeverity: {
            type: 'string', enum: ['high', 'medium', 'low'],
            description: 'Only return signals at or above this severity. Default medium.'
          }
        }
      },
      run: function (args) {
        var map = { high: 3, medium: 2, low: 1 };
        var min = map[(args && args.minSeverity) || 'medium'];
        return root.EenSignals.scan({ audience: 'ADMIN', minSeverity: min })
          .then(function (list) {
            return {
              count: list.length,
              signals: list.slice(0, 20).map(function (s) {
                return {
                  type: s.type,
                  severity: s.severity === 3 ? 'high' : s.severity === 2 ? 'medium' : 'low',
                  what: s.headline,
                  why: s.why,
                  facts: s.facts
                };
              })
            };
          });
      }
    },

    {
      name: 'get_project_money',
      description: 'Profit and loss for one project or all projects: deal value, ' +
        'invoiced, collected, delivery cost, margin now, forecast margin, budget ' +
        'burn vs delivery progress. Use for any question about profit, margin, cost ' +
        'or whether a project is worth it.',
      parameters: {
        type: 'object',
        properties: {
          projectName: {
            type: 'string',
            description: 'Name of one project. Omit to get all projects.'
          }
        }
      },
      run: function (args) {
        return root.Profit.getPortfolio().then(function (pf) {
          var rows = pf.projects;
          if (args && args.projectName) {
            var q = String(args.projectName).toLowerCase();
            rows = rows.filter(function (p) { return p.name.toLowerCase().indexOf(q) >= 0; });
            if (!rows.length) {
              return { found: false, message: 'No project matches "' + args.projectName + '"',
                       availableProjects: pf.projects.map(function (p) { return p.name; }) };
            }
          }
          return {
            found: true,
            targetMarginPct: pf.targetMarginPct,
            projects: rows.map(function (p) {
              return {
                name: p.name, client: p.client, status: p.status, health: p.health,
                dealValueRupees: U.paiseToRupees(p.contractPaise),
                invoicedRupees: U.paiseToRupees(p.invoicedPaise),
                collectedRupees: U.paiseToRupees(p.collectedPaise),
                deliveredNotInvoicedRupees: U.paiseToRupees(p.wipPaise),
                costRupees: U.paiseToRupees(p.costPaise),
                hoursLogged: p.loggedHours,
                marginNowPct: p.marginPct,
                forecastMarginPct: p.projectedMarginPct,
                budgetBurnedPct: p.burnPct,
                workDeliveredPct: p.deliveryPct,
                spendingFasterThanDelivering: p.burnAhead,
                effectiveRatePerHourRupees: U.paiseToRupees(p.effectiveRatePaise)
              };
            })
          };
        });
      }
    },

    {
      name: 'get_work_status',
      description: 'Deliverables and their status. Filter by status, project or ' +
        'person. Use for "what is Alex working on", "what is in review", ' +
        '"what is overdue", "show me the Swiggy work".',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'REJECTED', 'DONE', 'OVERDUE'],
            description: 'Filter by status. OVERDUE means past deadline and not done.'
          },
          personName: { type: 'string', description: 'Filter by assignee name.' },
          projectName: { type: 'string', description: 'Filter by project name.' }
        }
      },
      run: function (args) {
        args = args || {};
        var DB = root.DataAPI.raw();
        var t = U.isoDate(new Date());
        var rows = DB.deliverables.slice();

        if (args.status === 'OVERDUE') {
          rows = rows.filter(function (d) {
            return d.status !== 'DONE' && d.dueAt && U.isoDate(d.dueAt) < t;
          });
        } else if (args.status) {
          rows = rows.filter(function (d) { return d.status === args.status; });
        }
        if (args.personName) {
          var pq = String(args.personName).toLowerCase();
          var emp = DB.employees.find(function (e) { return e.name.toLowerCase().indexOf(pq) >= 0; });
          if (!emp) {
            return Promise.resolve({ found: false, message: 'No person named "' + args.personName + '"',
              availablePeople: DB.employees.map(function (e) { return e.name; }) });
          }
          rows = rows.filter(function (d) { return (d.assigneeIds || []).indexOf(emp.id) >= 0; });
        }
        if (args.projectName) {
          var jq = String(args.projectName).toLowerCase();
          var proj = DB.projects.find(function (p) { return p.name.toLowerCase().indexOf(jq) >= 0; });
          if (!proj) {
            return Promise.resolve({ found: false, message: 'No project named "' + args.projectName + '"',
              availableProjects: DB.projects.map(function (p) { return p.name; }) });
          }
          rows = rows.filter(function (d) { return d.projectId === proj.id; });
        }

        return Promise.resolve({
          found: true,
          count: rows.length,
          deliverables: rows.slice(0, 30).map(function (d) {
            var proj = DB.projects.find(function (p) { return p.id === d.projectId; });
            return {
              title: d.title,
              project: proj ? proj.name : null,
              status: d.status,
              priority: d.priority,
              assignees: (d.assigneeIds || []).map(function (id) {
                var e = DB.employees.find(function (x) { return x.id === id; });
                return e ? e.name : null;
              }).filter(Boolean),
              dueDate: d.dueAt ? U.isoDate(d.dueAt) : null,
              daysLate: d.dueAt && d.status !== 'DONE' && U.isoDate(d.dueAt) < t
                ? Math.floor((new Date(t) - new Date(U.isoDate(d.dueAt))) / 86400000) : 0,
              progressPct: d.progressPct,
              estimateHours: Math.round(d.estimateSecs / 360) / 10,
              actualHours: Math.round(d.loggedSecs / 360) / 10,
              returnedReason: d.status === 'REJECTED' ? d.rejectionReason : null
            };
          })
        });
      }
    },

    {
      name: 'get_team_capacity',
      description: 'How busy each person is: billable utilisation, how many days of ' +
        'committed work they have ahead, and whether they are overloaded or free. ' +
        'Use for "who can take this", "who is overloaded", "is the team busy".',
      parameters: { type: 'object', properties: {} },
      run: function () {
        return root.HRM.getUtilisation().then(function (u) {
          return {
            periodFrom: u.from, periodTo: u.to, workingDays: u.workingDays,
            people: u.rows.map(function (r) {
              return {
                name: r.name, role: r.role,
                billableUtilisationPct: r.utilisationPct,
                openDeliverables: r.openDeliverables,
                committedDaysAhead: r.committedDays,
                load: r.load
              };
            })
          };
        });
      }
    },

    {
      name: 'get_people_today',
      description: 'Who is present, working, on leave or absent today, plus who came ' +
        'in late. Use for "who is in today", "is anyone on leave", "attendance today".',
      parameters: { type: 'object', properties: {} },
      run: function () {
        return root.HRM.getTodayBoard().then(function (b) {
          return {
            date: b.date,
            isWeekOff: b.isWeekOff,
            holiday: b.holiday ? b.holiday.name : null,
            summary: b.summary,
            people: b.rows.map(function (r) {
              return {
                name: r.name, state: r.state,
                hoursToday: Math.round((r.activeSecs || 0) / 360) / 10,
                workingOn: r.workingOn,
                flags: r.flags.map(function (f) { return f.type; })
              };
            })
          };
        });
      }
    },

    {
      name: 'get_leave_requests',
      description: 'Leave requests, by default the pending ones waiting for approval. ' +
        'Use for "any leave pending", "who has applied for leave".',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] }
        }
      },
      run: function (args) {
        var st = (args && args.status) || 'PENDING';
        return root.HRM.getLeaveRequests({ status: st }).then(function (reqs) {
          var DB = root.DataAPI.raw();
          return {
            status: st, count: reqs.length,
            requests: reqs.slice(0, 20).map(function (r) {
              var e = DB.employees.find(function (x) { return x.id === r.employeeId; });
              return {
                person: e ? e.name : 'Unknown',
                type: r.type, fromDate: r.fromDate, toDate: r.toDate,
                days: r.days, reason: r.reason,
                appliedDaysAgo: Math.floor((Date.now() - new Date(r.appliedAt)) / 86400000)
              };
            })
          };
        });
      }
    },

    {
      name: 'get_invoices',
      description: 'Client invoices with amounts and payment status. Use for ' +
        '"what is unpaid", "which client owes us", "billing status".',
      parameters: {
        type: 'object',
        properties: {
          onlyUnpaid: { type: 'boolean', description: 'Only invoices with money still due.' }
        }
      },
      run: function (args) {
        var DB = root.DataAPI.raw();
        var t = U.isoDate(new Date());
        var rows = DB.invoices.filter(function (i) { return i.status !== 'CANCELLED'; });
        if (args && args.onlyUnpaid) {
          rows = rows.filter(function (i) { return i.paidPaise < i.totalPaise && i.status !== 'DRAFT'; });
        }
        return Promise.resolve({
          count: rows.length,
          invoices: rows.map(function (i) {
            var overdue = i.status !== 'PAID' && i.status !== 'DRAFT' && i.dueDate && i.dueDate < t;
            return {
              number: i.number, client: i.clientName,
              totalRupees: U.paiseToRupees(i.totalPaise),
              paidRupees: U.paiseToRupees(i.paidPaise),
              pendingRupees: U.paiseToRupees(i.totalPaise - i.paidPaise),
              status: i.status,
              dueDate: i.dueDate,
              daysOverdue: overdue
                ? Math.floor((new Date(t) - new Date(i.dueDate)) / 86400000) : 0
            };
          })
        });
      }
    }
  ];

  function toolByName(name) {
    return TOOLS.find(function (t) { return t.name === name; });
  }

  function toolDeclarations() {
    return TOOLS.map(function (t) {
      return { name: t.name, description: t.description, parameters: t.parameters };
    });
  }

  /* ==========================================================================
     CONFIG
     ========================================================================== */
  var config = {
    mode: 'mock',                       // mock | direct | proxy
    model: 'gemini-2.5-flash',
    apiKey: null,                        
    proxyUrl: '/api/een',
    maxToolRounds: 4,                    
    timeoutMs: 25000
  };

  function configure(opts) {
    Object.assign(config, opts || {});
    return clone(config);
  }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function status() {
    return {
      mode: config.mode,
      model: config.model,
      ready: config.mode === 'mock' ||
             (config.mode === 'direct' && !!config.apiKey) ||
             (config.mode === 'proxy' && !!config.proxyUrl),
      warning: config.mode === 'direct'
        ? 'API key is in the browser \u2014 for local testing only. On a live site anyone can steal it.'
        : null
    };
  }

  /* ==========================================================================
     TRANSPORT
     ========================================================================== */
  function callGemini(payload) {
    if (config.mode === 'proxy') {
      return fetchJson(config.proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: config.model, payload: payload })
      });
    }
    if (config.mode === 'direct') {
      if (!config.apiKey) return Promise.reject(new Error('No API key set'));
      var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
                config.model + ':generateContent?key=' + encodeURIComponent(config.apiKey);
      return fetchJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    return Promise.reject(new Error('MOCK_MODE'));
  }

  function fetchJson(url, opts) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    if (ctrl) opts.signal = ctrl.signal;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, config.timeoutMs);

    return fetch(url, opts).then(function (r) {
      clearTimeout(timer);
      if (r.status === 429) {
        var e = new Error('Gemini’s daily limit is exhausted');
        e.code = 'RATE_LIMIT'; throw e;
      }
      if (!r.ok) {
        return r.text().then(function (body) {
          var e2 = new Error('Gemini error ' + r.status + ': ' + body.slice(0, 200));
          e2.code = 'API_ERROR'; throw e2;
        });
      }
      return r.json();
    }).catch(function (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        var e3 = new Error('The answer took too long');
        e3.code = 'TIMEOUT'; throw e3;
      }
      throw err;
    });
  }

  /* ==========================================================================
     ASK — main entry
     ========================================================================== */

  /**
   * @param {string} question
   * @param {Array} history  [{role:'user'|'model', text}]
   * @returns {Promise<{text, sources, mode, toolsUsed, degraded}>}
   */
  function ask(question, history) {
    history = history || [];
    if (config.mode === 'mock') {
      return Promise.resolve(fallbackAnswer(question, 'mock'));
    }


    var contents = history.map(function (m) {
      return { role: m.role === 'model' ? 'model' : 'user', parts: [{ text: m.text }] };
    });
    contents.push({ role: 'user', parts: [{ text: question }] });

    var toolsUsed = [];

    function round(n) {
      if (n > config.maxToolRounds) {
        return Promise.resolve({
          text: 'I got stuck answering that. Try asking in a slightly different way?',
          sources: toolsUsed, mode: config.mode, toolsUsed: toolsUsed, degraded: false
        });
      }

      var payload = {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: contents,
        tools: [{ functionDeclarations: toolDeclarations() }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 900 }
      };

      return callGemini(payload).then(function (res) {
        var cand = res.candidates && res.candidates[0];
        if (!cand) throw Object.assign(new Error('Gemini returned an empty answer'), { code: 'EMPTY' });

        var parts = (cand.content && cand.content.parts) || [];
        var calls = parts.filter(function (p) { return p.functionCall; });

        if (calls.length) {
          contents.push({ role: 'model', parts: parts });
          return Promise.all(calls.map(function (p) {
            var fc = p.functionCall;
            var tool = toolByName(fc.name);
            if (!tool) {
              return Promise.resolve({
                functionResponse: { name: fc.name, response: { error: 'Unknown tool' } }
              });
            }
            toolsUsed.push(fc.name);
            return Promise.resolve()
              .then(function () { return tool.run(fc.args || {}); })
              .then(function (data) {
                return { functionResponse: { name: fc.name, response: data } };
              })
              .catch(function (e) {
                return { functionResponse: { name: fc.name, response: { error: e.message } } };
              });
          })).then(function (responses) {
            contents.push({ role: 'user', parts: responses });
            return round(n + 1);
          });
        }

        var text = parts.map(function (p) { return p.text || ''; }).join('').trim();
        if (!text) throw Object.assign(new Error('Gemini returned an empty answer'), { code: 'EMPTY' });

        return {
          text: text,
          sources: uniq(toolsUsed),
          mode: config.mode,
          toolsUsed: uniq(toolsUsed),
          degraded: false
        };
      });
    }

    return round(1).catch(function (err) {
      console.warn('Een: falling back to rules \u2014', err.message);
      return Promise.resolve(fallbackAnswer(question, err.code || 'ERROR')).then(function (fb) {
        fb.degraded = true;
        fb.degradedReason = err.code === 'RATE_LIMIT'
          ? 'Today’s AI limit is exhausted \u2014 this answer is built directly from your data.'
          : 'AI couldn’t answer right now \u2014 this answer is built directly from your data.';
        return fb;
      });
    });
  }

  function uniq(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }

  /* ── Answers without an AI key (and when the AI is unreachable) ─────────
     Reads the live data and answers the common questions directly:
     money, invoices, attendance, who is free/busy, overdue work, projects,
     a named project or employee, and a daily brief. */
  function fallbackAnswer(question, reason) {
    var q = String(question || '').toLowerCase();
    var D = root.DataAPI.raw();
    var today = U.isoDate(new Date());
    var R = function (p) { return U.fmtRupee(p || 0).replace('.00', ''); };
    function wrap(text, sources) {
      return { text: text, sources: sources || [], mode: 'fallback', toolsUsed: sources || [], degraded: reason !== 'mock' };
    }
    var emps = (D.employees || []).filter(function (e) { return e.active !== false; });
    var name = function (id) { var e = (D.employees || []).find(function (x) { return x.id === id; }); return e ? e.name : 'Unknown'; };
    var att = {}; (D.attendance || []).forEach(function (a) { if (a.date === today) att[a.employeeId] = a; });
    var onLeave = function (id) {
      return (D.leaveRequests || []).some(function (r) { return r.employeeId === id && r.status === 'APPROVED' && r.fromDate <= today && r.toDate >= today; });
    };
    var online = function (id) { var a = att[id]; return !!(a && !a.lastOutAt && a.lastSeenAt && Date.now() - Date.parse(a.lastSeenAt) < 3 * 60 * 1000); };
    var open = (D.deliverables || []).filter(function (d) { return d.status !== 'DONE'; });
    var overdue = open.filter(function (d) { return d.dueAt && Date.parse(d.dueAt) < Date.now(); });
    var review = open.filter(function (d) { return d.status === 'IN_REVIEW'; });
    var invs = (D.invoices || []).filter(function (i) { return i.status !== 'CANCELLED'; });
    var unpaid = invs.filter(function (i) { return i.status !== 'DRAFT' && i.status !== 'PAID' && (i.totalPaise - (i.paidPaise || 0)) > 0; });
    var drafts = invs.filter(function (i) { return i.status === 'DRAFT'; });
    var late = unpaid.filter(function (i) { return i.dueDate && i.dueDate < today; });
    var month = today.slice(0, 7), got = 0;
    invs.forEach(function (i) { (i.payments || []).forEach(function (p) { if (String(p.date).slice(0, 7) === month) got += p.amountPaise || 0; }); });

    /* a named employee or project in the question */
    var emp = emps.find(function (e) { var f = e.name.toLowerCase(); return q.indexOf(f) >= 0 || q.indexOf(f.split(' ')[0]) >= 0; });
    var proj = (D.projects || []).find(function (p) { return q.indexOf(String(p.name).toLowerCase()) >= 0; });

    if (emp && !/invoice|payment/.test(q)) {
      var mine = open.filter(function (d) { return (d.assigneeIds || []).indexOf(emp.id) >= 0; });
      var a = att[emp.id];
      var sc = root.DataAPI.employeeScore ? root.DataAPI.employeeScore(emp.id) : null;
      var lines = ['**' + emp.name + '** \u2014 ' + (emp.role || '')];
      lines.push('Today: ' + (onLeave(emp.id) ? 'on leave' : online(emp.id) ? 'online now' : a && a.firstInAt ? (a.lastOutAt ? 'logged out' : 'checked in, app closed') : 'not checked in') +
        (a && a.activeSecs ? ' \u00b7 worked ' + Math.round(a.activeSecs / 360) / 10 + ' h' : ''));
      lines.push('Open tasks: ' + mine.length + (mine.length ? ' (' + mine.slice(0, 4).map(function (d) { return d.title; }).join(', ') + (mine.length > 4 ? '\u2026' : '') + ')' : ''));
      var od = mine.filter(function (d) { return d.dueAt && Date.parse(d.dueAt) < Date.now(); });
      if (od.length) lines.push('Overdue: ' + od.map(function (d) { return d.title; }).join(', '));
      if (sc && sc.sample) lines.push('Score: ' + sc.score + '/100');
      return Promise.resolve(wrap(lines.join('\n'), ['get_employee']));
    }

    if (proj) {
      var pd = (D.deliverables || []).filter(function (d) { return d.projectId === proj.id; });
      var done = pd.filter(function (d) { return d.status === 'DONE'; }).length;
      var pinv = invs.filter(function (i) { return i.projectId === proj.id; });
      var billed = pinv.reduce(function (t, i) { return t + i.totalPaise; }, 0), paid = pinv.reduce(function (t, i) { return t + (i.paidPaise || 0); }, 0);
      var pl = ['**' + proj.name + '** (' + (proj.clientName || '') + ')',
        'Progress: ' + (root.DataAPI.projectProgress ? root.DataAPI.projectProgress(proj.id) : Math.round(done / Math.max(1, pd.length) * 100)) + '% \u00b7 ' + done + ' of ' + pd.length + ' tasks done',
        'Deadline: ' + (proj.deadline || '\u2014'),
        'Billed ' + R(billed) + ', received ' + R(paid) + ', still due ' + R(billed - paid)];
      var pod = pd.filter(function (d) { return d.status !== 'DONE' && d.dueAt && Date.parse(d.dueAt) < Date.now(); });
      if (pod.length) pl.push('Overdue tasks: ' + pod.map(function (d) { return d.title; }).join(', '));
      return Promise.resolve(wrap(pl.join('\n'), ['get_project']));
    }

    if (/invoice|payment|paid|unpaid|outstanding|due|collect|receiv|money|revenue|profit|margin|loss|cost|earn/.test(q)) {
      var out = unpaid.reduce(function (t, i) { return t + i.totalPaise - (i.paidPaise || 0); }, 0);
      var ml = ['**Money**',
        'Received this month: ' + R(got),
        'Still to collect: ' + R(out) + ' on ' + unpaid.length + ' invoice' + (unpaid.length === 1 ? '' : 's') + (late.length ? ' (' + late.length + ' overdue)' : '')];
      unpaid.slice().sort(function (x, y) { return (y.totalPaise - y.paidPaise) - (x.totalPaise - x.paidPaise); }).slice(0, 5).forEach(function (i) {
        ml.push('\u2022 ' + i.number + ' \u2014 ' + i.clientName + ': ' + R(i.totalPaise - (i.paidPaise || 0)) + (i.dueDate && i.dueDate < today ? ' (overdue since ' + i.dueDate + ')' : ''));
      });
      if (drafts.length) ml.push('Drafts not sent yet: ' + drafts.length);
      if (!root.Profit || !/profit|margin|loss|cost/.test(q)) return Promise.resolve(wrap(ml.join('\n'), ['get_invoices']));
      return root.Profit.getPortfolio().then(function (pf) {
        ml.push('', '**Profit**', 'Overall margin: ' + (pf.totals.marginPct == null ? 'not enough data yet' : pf.totals.marginPct + '%'));
        pf.projects.filter(function (p) { return p.health === 'LOSS' || p.health === 'CRITICAL' || p.health === 'BELOW_TARGET'; }).forEach(function (p) {
          ml.push('\u2022 ' + p.name + ': expected margin ' + p.projectedMarginPct + '%, cost so far ' + R(p.costPaise));
        });
        return wrap(ml.join('\n'), ['get_invoices', 'get_project_money']);
      }).catch(function () { return wrap(ml.join('\n'), ['get_invoices']); });
    }

    if (/absent|present|attendance|leave|online|who is (in|here|working)|checked|late today/.test(q)) {
      var here = emps.filter(function (e) { return online(e.id); }).map(function (e) { return e.name; });
      var lv = emps.filter(function (e) { return onLeave(e.id); }).map(function (e) { return e.name; });
      var none = emps.filter(function (e) { return !onLeave(e.id) && !(att[e.id] && att[e.id].firstInAt); }).map(function (e) { return e.name; });
      return Promise.resolve(wrap(['**Attendance today**',
        'Online now (' + here.length + '): ' + (here.join(', ') || 'nobody'),
        'On leave (' + lv.length + '): ' + (lv.join(', ') || 'nobody'),
        'Not checked in (' + none.length + '): ' + (none.join(', ') || 'nobody')].join('\n'), ['get_attendance']));
    }

    if (/busy|free|load|capacity|who can|available|workload/.test(q)) {
      var load = emps.map(function (e) { return { n: e.name, c: open.filter(function (d) { return (d.assigneeIds || []).indexOf(e.id) >= 0; }).length }; })
        .sort(function (x, y) { return y.c - x.c; });
      return Promise.resolve(wrap(['**Workload (open tasks)**'].concat(load.map(function (x) { return '\u2022 ' + x.n + ': ' + x.c + (x.c === 0 ? ' \u2014 free' : x.c >= 4 ? ' \u2014 busy' : ''); })).join('\n'), ['get_workload']));
    }

    if (/stuck|overdue|late|deadline|review|pending|task|work|block/.test(q)) {
      var wl = ['**Work**', 'Waiting for your review: ' + review.length];
      review.slice(0, 5).forEach(function (d) { wl.push('\u2022 ' + d.title + ' \u2014 ' + (d.assigneeIds || []).map(name).join(', ')); });
      wl.push('Overdue: ' + overdue.length);
      overdue.slice(0, 6).forEach(function (d) { wl.push('\u2022 ' + d.title + ' \u2014 ' + (d.assigneeIds || []).map(name).join(', ') + ', due ' + String(d.dueAt).slice(0, 10)); });
      var blocked = open.filter(function (d) { return d.blocked; });
      if (blocked.length) wl.push('Blocked: ' + blocked.map(function (d) { return d.title; }).join(', '));
      return briefText().then(function (b) {
        return wrap(wl.join('\n') + '\n\n' + b.text, ['get_work', 'get_attention_signals']);
      }).catch(function () { return wrap(wl.join('\n'), ['get_work']); });
    }

    if (/top|best|perform|score|rank/.test(q) && root.DataAPI.employeeScore) {
      var ranked = emps.map(function (e) { return { n: e.name, s: root.DataAPI.employeeScore(e.id) }; }).filter(function (x) { return x.s.sample; })
        .sort(function (x, y) { return y.s.score - x.s.score; }).slice(0, 5);
      return Promise.resolve(wrap(['**Top performers**'].concat(ranked.map(function (x, i) { return (i + 1) + '. ' + x.n + ' \u2014 ' + x.s.score + '/100'; })).join('\n') || 'Not enough data yet.', ['get_scores']));
    }

    if (/summary|brief|today|status|overall|update|how are we/.test(q)) {
      return briefText().then(function (b) {
        var head = ['**Today at a glance**',
          'Online now: ' + emps.filter(function (e) { return online(e.id); }).length + ' of ' + emps.length,
          'Tasks waiting for review: ' + review.length + ' \u00b7 overdue: ' + overdue.length,
          'Received this month: ' + R(got) + ' \u00b7 overdue invoices: ' + late.length, ''];
        return wrap(head.join('\n') + b.text, ['get_attention_signals']);
      });
    }

    return Promise.resolve(wrap(['I can answer from your live data. Try:',
      '\u2022 "Give me today\u2019s brief"', '\u2022 "Who is absent today?"', '\u2022 "Which invoices are unpaid?"',
      '\u2022 "What is overdue?"', '\u2022 "Who is free?"', '\u2022 "Top performers"',
      '\u2022 a project or employee name, e.g. "' + ((D.projects || [])[0] ? D.projects[0].name : 'Project') + '" or "' + (emps[0] ? emps[0].name.split(' ')[0] : 'Alex') + '"',
      reason === 'mock' ? '' : '(The AI service is not reachable right now, so this answer comes from your data.)'].join('\n'), []));
  }

  function briefText() {
    return root.EenSignals.scanForAdmin().then(function (g) {
      var lines = [];
      if (!g.count) {
        lines.push('All clear. Nothing needs attention right now.');
      } else {
        if (g.urgent.length) {
          lines.push('**Needs immediate attention:**');
          g.urgent.slice(0, 4).forEach(function (s) {
            lines.push('\u2022 ' + s.headline);
            lines.push('  ' + s.why);
          });
          lines.push('');
        }
        if (g.watch.length) {
          lines.push('**Keep an eye on:**');
          g.watch.slice(0, 4).forEach(function (s) { lines.push('\u2022 ' + s.headline); });
        }
      }
      return {
        text: lines.join('\n'),
        sources: ['get_attention_signals'],
        mode: 'fallback', toolsUsed: ['get_attention_signals'], degraded: false
      };
    });
  }

  function morningBrief() {
    if (config.mode === 'mock') return briefText();

    return root.EenSignals.scanForAdmin().then(function (g) {
      if (!g.count) return briefText();

      var prompt =
        'Write the admin\'s morning brief for today. Here are the signals the system ' +
        'detected, as JSON:\n\n' + JSON.stringify({
          urgent: g.urgent.slice(0, 5).map(strip),
          watch: g.watch.slice(0, 5).map(strip)
        }, null, 1) +
        '\n\nRules for this brief:\n' +
        '\u2022 Open with one line on how the day looks overall.\n' +
        '\u2022 Then the 2-4 things that actually matter, each with the number that proves it.\n' +
        '\u2022 For each, say what you would do about it.\n' +
        '\u2022 Use ONLY the facts above. Do not add anything.\n' +
        '\u2022 Under 150 words. Simple Hinglish.';

      return ask(prompt, []).then(function (r) {
        r.sources = ['get_attention_signals'];
        return r;
      });
    });
  }

  function strip(s) {
    return { what: s.headline, why: s.why, facts: s.facts, severity: s.severity };
  }

  function employeeNudge(employeeId) {
    return root.EenSignals.scanForEmployee(employeeId).then(function (list) {
      if (!list.length) return null;
      var top = list[0];

      if (config.mode === 'mock') {
        return {
          text: top.headline + '. ' + top.why,
          why: top.why, signalType: top.type, action: top.action, degraded: false
        };
      }

      var prompt =
        'Write ONE short message to an employee. Facts:\n' +
        JSON.stringify(strip(top), null, 1) +
        '\n\nRules \u2014 these matter:\n' +
        '\u2022 State the fact and what to do. Nothing else.\n' +
        '\u2022 NO judgement. Never say they are behind, slow, or should have done better.\n' +
        '\u2022 Under 30 words. Simple Hinglish. Friendly, not bossy.\n' +
        '\u2022 Use only the facts above.';

      return ask(prompt, []).then(function (r) {
        return {
          text: r.text, why: top.why, signalType: top.type,
          action: top.action, degraded: r.degraded
        };
      });
    });
  }

  root.EenBrain = {
    SYSTEM_PROMPT: SYSTEM_PROMPT,
    TOOLS: TOOLS,
    toolDeclarations: toolDeclarations,
    configure: configure,
    status: status,
    ask: ask,
    morningBrief: morningBrief,
    briefText: briefText,
    employeeNudge: employeeNudge
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.EenBrain;

})(typeof window !== 'undefined' ? window : globalThis);

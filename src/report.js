// Self-contained HTML run report: one file per run, no external assets, so it
// can be opened from disk, attached to an email, or committed as evidence of
// what a run actually did.

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function renderReport(runId, events) {
  const request = events.find((e) => e.type === 'request');
  const route = events.find((e) => e.type === 'route');
  const handoff = events.find((e) => e.type === 'handoff');
  const steps = events.filter((e) => e.type === 'step');
  const artifacts = events.filter((e) => e.type === 'artifact');
  const errors = events.filter((e) => e.type === 'error');
  const started = events[0]?.at || '';
  const ended = events[events.length - 1]?.at || '';

  const statusColor = { ok: '#3ecf8e', budget_exceeded: '#ffb454', failed: '#ff6b6b' }[handoff?.status] || '#9aa4b5';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Run ${esc(runId)}</title>
<style>
  :root { --bg:#0f1218; --panel:#171b24; --panel2:#1e2430; --line:#2a3140; --text:#e8ecf3; --muted:#94a0b4; --accent:#4f8cff; --ok:#3ecf8e; --warn:#ffb454; }
  * { box-sizing:border-box; }
  body { margin:0; padding:40px; background:var(--bg); color:var(--text); font:15px/1.55 'Segoe UI',system-ui,sans-serif; }
  .wrap { max-width:900px; margin:0 auto; }
  h1 { font-size:20px; margin:0 0 4px; letter-spacing:-0.01em; }
  .sub { color:var(--muted); font-size:13px; margin-bottom:28px; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:20px; margin-bottom:16px; }
  .row { display:flex; gap:12px; align-items:baseline; justify-content:space-between; }
  .label { font-size:11px; text-transform:uppercase; letter-spacing:0.09em; color:var(--muted); margin-bottom:6px; }
  .pill { display:inline-block; padding:2px 9px; border-radius:99px; font-size:12px; font-weight:600; }
  .mono { font-family:ui-monospace,Consolas,monospace; font-size:13px; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  td { padding:6px 0; border-bottom:1px solid var(--line); vertical-align:top; }
  tr:last-child td { border-bottom:none; }
  .muted { color:var(--muted); }
  ol.steps { list-style:none; counter-reset:s; padding:0; margin:0; }
  ol.steps li { counter-increment:s; display:flex; gap:14px; padding:7px 0; border-bottom:1px solid var(--line); font-size:13px; }
  ol.steps li:last-child { border-bottom:none; }
  ol.steps li::before { content:counter(s); color:var(--muted); min-width:18px; font-variant-numeric:tabular-nums; }
  .stamp { color:var(--muted); font-size:12px; font-family:ui-monospace,Consolas,monospace; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Run ${esc(runId)}</h1>
  <div class="sub">${esc(started)} → ${esc(ended)}</div>

  <div class="card">
    <div class="label">Request</div>
    <div>${esc(request?.text || '')}</div>
  </div>

  <div class="card">
    <div class="label">Routing decision</div>
    <div class="row" style="margin-bottom:10px">
      <div><span class="pill" style="background:rgba(79,140,255,.15); color:var(--accent)">${esc(route?.picked || 'n/a')}</span>
        <span class="muted mono" style="margin-left:10px">confidence ${esc(route?.confidence ?? 0)}</span></div>
      <div class="muted" style="font-size:12px">${route?.viaFallback ? 'via fallback' : 'direct match'}</div>
    </div>
    <table>
      <tr><td class="muted" style="width:150px">Triggered by</td><td>${esc((route?.matched || []).join(', ') || '—')}</td></tr>
      <tr><td class="muted">Reason</td><td>${esc(route?.reason || '')}</td></tr>
      <tr><td class="muted">Considered but rejected</td><td>${esc((route?.rejected || []).map((r) => `${r.name} (${r.score})`).join(', ') || '—')}</td></tr>
    </table>
  </div>

  <div class="card">
    <div class="label">Steps (${steps.length})</div>
    ${steps.length
      ? `<ol class="steps">${steps.map((s) => `<li><span>${esc(s.label)}</span><span class="stamp" style="margin-left:auto">${esc(s.at)}</span></li>`).join('')}</ol>`
      : '<div class="muted">no steps recorded</div>'}
  </div>

  <div class="card">
    <div class="label">Outcome</div>
    <div class="row" style="margin-bottom:10px">
      <div><span class="pill" style="background:${statusColor}22; color:${statusColor}">${esc(handoff?.status || 'unknown')}</span></div>
      <div class="muted" style="font-size:12px">${handoff?.steps ?? 0} step(s), ${artifacts.length} artifact(s)</div>
    </div>
    <table>
      <tr><td class="muted" style="width:150px">Summary</td><td>${esc(handoff?.summary || '')}</td></tr>
      <tr><td class="muted">Next</td><td>${esc(handoff?.next || '')}</td></tr>
      <tr><td class="muted">Handoff note</td><td>${esc(handoff?.note || '')}</td></tr>
      <tr><td class="muted">Artifacts</td><td class="mono">${artifacts.map((a) => esc(a.name)).join('<br>') || '—'}</td></tr>
      ${errors.length ? `<tr><td class="muted">Errors</td><td style="color:#ff6b6b">${errors.map((e) => esc(e.message)).join('<br>')}</td></tr>` : ''}
    </table>
  </div>
</div>
</body>
</html>
`;
}

module.exports = { renderReport };

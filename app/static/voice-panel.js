/* Triright voice panel: explain one matched trial to the patient, on this screen.
   Opened from a trial's "Explain to patient" button. Talks to the voice service in ../voice (port 8001).
   Scripts and agents are built from trial details only, never the patient record. During steps 4 and 5 the patient's
   own voice goes to ElevenLabs, and the teach-back transcript goes to Claude for scoring. */
const SDK = "https://cdn.jsdelivr.net/npm/@elevenlabs/client@1.25.0/+esm";  // loaded only when an agent starts

// Locally the voice service runs on its own port; on Vercel it's served from /voice on this same site.
const VOICE = window.RIGHT_VOICE_URL
  || (["localhost", "127.0.0.1"].includes(location.hostname) ? "http://localhost:8001" : "/voice");
const LANGS = { en: "English", es: "Spanish" };
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const enc = encodeURIComponent;
const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  speaker: svg('<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>'),
  mic: svg('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 17v5"/>'),
};

// Colors come from the EHR's own variables: chrome blue for the header and step markers, green only for the next action.
document.head.insertAdjacentHTML("beforeend", `<style>
  .vp { position: fixed; top: 0; right: 0; bottom: 0; width: min(540px, 100vw); z-index: 50;
        background: var(--bg); border-left: 1px solid var(--chrome-dark); box-shadow: -8px 0 24px rgba(0,0,0,.18);
        display: flex; flex-direction: column; }
  .vp-head { background: linear-gradient(var(--chrome-top), var(--chrome)); color: var(--on-chrome);
             border-bottom: 1px solid var(--chrome-dark); padding: 8px 12px 9px; display: flex; gap: 10px; align-items: flex-start; }
  .vp-head > div { flex: 1; min-width: 0; }
  .vp-eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; font-weight: 700; opacity: .85;
                display: flex; align-items: center; gap: 5px; }
  .vp-eyebrow svg { width: 13px; height: 13px; }
  .vp-head h2 { font-size: 15px; margin: 2px 0 1px; text-wrap: balance; }
  .vp-sub { font-size: 12px; opacity: .85; }
  .vp-x { background: none; border: 0; font-size: 20px; line-height: 1; cursor: pointer; color: var(--on-chrome); padding: 2px 6px; border-radius: 3px; }
  .vp-x:hover { background: rgba(255,255,255,.15); }
  .vp-lang { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: var(--section-head);
             border-bottom: 1px solid var(--border); font-size: 12px; color: var(--muted); }
  .vp-seg { display: inline-flex; border: 1px solid var(--border); border-radius: 3px; overflow: hidden; }
  .vp-seg button { border: 0; background: var(--btn); padding: 3px 12px; cursor: pointer; color: var(--text); font: inherit; }
  .vp-seg button + button { border-left: 1px solid var(--border); }
  .vp-seg button.on { background: var(--chrome); color: var(--on-chrome); font-weight: 600; }
  .vp-body { flex: 1; overflow-y: auto; padding: 10px 12px 16px; display: flex; flex-direction: column; gap: 8px; }

  .vp-step { flex: none; background: var(--panel); border: 1px solid var(--border); border-radius: 3px; }
  .vp-step-h { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; cursor: pointer; color: var(--text);
               background: var(--section-head); border: 0; border-bottom: 1px solid var(--border); padding: 6px 10px; }
  .vp-step-h:hover { background: var(--hover); }
  .vp-step.current > .vp-step-h { background: var(--chrome-light); box-shadow: inset 3px 0 0 var(--accent); }
  .vp-step.collapsed > .vp-step-h { border-bottom: 0; }
  .vp-step.collapsed > .bd { display: none; }
  .vp-step-h .n { flex: none; display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 50%;
                  background: var(--chrome); color: var(--on-chrome); font-size: 11px; font-weight: 700; }
  .vp-step.done .n { background: var(--ok); }
  .vp-step.locked .n { background: var(--neutral-bg); color: var(--muted); }
  .vp-step-h .t { font-weight: 600; white-space: nowrap; }
  .vp-step-h .s { flex: 1; min-width: 0; color: var(--muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .vp-step.done .s { color: var(--ok-text); }
  .vp-step.locked .s { color: var(--warn-text); font-weight: 600; }
  .vp-step-h .chev { flex: none; color: var(--muted); }
  .vp-step .bd { padding: 10px; display: flex; flex-direction: column; gap: 8px; }
  .vp-step.locked .bd { opacity: .5; pointer-events: none; }

  .vp label { font-size: 12px; color: var(--muted); display: flex; flex-direction: column; gap: 3px; }
  .vp input, .vp textarea { font: inherit; color: var(--text); background: var(--panel); border: 1px solid var(--border);
                            border-radius: 3px; padding: 5px 7px; width: 100%; }
  .vp textarea { min-height: 190px; resize: vertical; line-height: 1.45; }
  .vp-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .vp-msg { font-size: 12px; color: var(--muted); }
  .vp-msg.ok { color: var(--ok-text); font-weight: 600; }
  .vp-msg.error { color: var(--alert); font-weight: 600; }
  .vp details summary { cursor: pointer; font-size: 12px; color: var(--muted); }
  .vp-kp { display: grid; grid-template-columns: 28px 1fr; gap: 4px 6px; align-items: center; margin-top: 6px; font-size: 12px; }
  .vp audio { width: 100%; }
  .vp table { border-collapse: collapse; width: 100%; font-size: 12px; }
  .vp td, .vp th { text-align: left; padding: 4px 5px; border-bottom: 1px solid var(--divider); vertical-align: top; }
  .vp th { color: var(--muted); font-weight: 600; }

  /* Voice call: the ring follows the mic while the patient talks and the agent's voice while it speaks. */
  .vp-call { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .vp-orb { --lvl: 0; position: relative; flex: none; width: 46px; height: 46px; border-radius: 50%;
            display: grid; place-items: center; background: var(--neutral-bg); color: var(--muted); }
  .vp-orb::before { content: ""; position: absolute; inset: -6px; border-radius: 50%; background: currentColor; opacity: .16;
                    transform: scale(calc(.8 + var(--lvl) * .45)); transition: transform .12s ease-out; }
  .vp-orb svg { position: relative; width: 20px; height: 20px; }
  .vp-call[data-state="listening"] .vp-orb { background: var(--ok-bg); color: var(--ok); }
  .vp-call[data-state="speaking"] .vp-orb { background: var(--info-bg); color: var(--accent); }
  .vp-call[data-state="connecting"] .vp-orb::before, .vp-call[data-state="scoring"] .vp-orb::before { animation: vp-pulse 1.2s ease-in-out infinite; }
  @keyframes vp-pulse { 50% { transform: scale(1.05); opacity: .3; } }
  .vp-call-info { flex: 1; min-width: 160px; }
  .vp-call-state { font-weight: 600; }
  .vp-call[data-state="listening"] .vp-call-state { color: var(--ok-text); }
  .vp-call[data-state="speaking"] .vp-call-state { color: var(--info-text); }
  .vp-end { font-weight: 600; background: var(--panel); color: var(--alert); border: 1px solid currentColor; border-radius: 3px; padding: 5px 16px; cursor: pointer; }
  .vp-end:hover { background: var(--hover); }
  @media (prefers-reduced-motion: reduce) { .vp-orb::before { transition: none; animation: none !important; } }
  .vp-log { background: var(--storyboard); border: 1px solid var(--divider); border-radius: 3px; padding: 8px;
            max-height: 260px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
  .vp-log:empty { display: none; }
  .vp-bubble { max-width: 85%; padding: 5px 9px; border-radius: 6px; font-size: 12.5px; line-height: 1.4; }
  .vp-bubble .who { display: block; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--muted); }
  .vp-bubble.ai { align-self: flex-start; background: var(--panel); border: 1px solid var(--border); border-bottom-left-radius: 2px; }
  .vp-bubble.user { align-self: flex-end; background: var(--chrome-light); border: 1px solid var(--border); border-bottom-right-radius: 2px; }

  .vp-grade { display: flex; flex-direction: column; gap: 6px; }
  .vp-grade p { margin: 0; }
  .vp-grade-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .vp-score { font-size: 16px; font-weight: 700; }
  .vp-segs { display: inline-flex; gap: 2px; margin-left: auto; }
  .vp-segs span { width: 22px; height: 8px; border-radius: 2px; background: var(--divider); }
  .vp-segs .understood { background: var(--ok); } .vp-segs .partly { background: var(--warn-border); } .vp-segs .missed { background: var(--alert); }
  .vp-pill { font-size: 11px; font-weight: 600; padding: 0 6px; border-radius: 3px; white-space: nowrap; }
  .vp-pill.understood { background: var(--ok-bg); color: var(--ok-text); }
  .vp-pill.partly { background: var(--warn-bg); color: var(--warn-text); }
  .vp-pill.missed { background: var(--neutral-bg); color: var(--alert); }
</style>`);

const root = document.createElement("aside");
root.className = "vp";
root.hidden = true;
root.setAttribute("aria-label", "Explain trial to patient");
document.body.append(root);

const trials = new Map();  // trial id -> that trial's panel state, kept for the page's life so a reopen picks up where it left off
let S = null;          // the open trial's state (see newState)
let convo = null;      // active ElevenLabs conversation, if any
let recorder = null;   // active MediaRecorder, if any
let session = 0;       // bumps when the panel closes or switches trial, so an abandoned call is never scored
let starting = false;  // an agent session is connecting
let agentMode = "listening";  // "speaking" while the agent talks; the silence warning only applies while listening
const sleep = ms => new Promise(r => setTimeout(r, ms));

const newState = (trial, criteria) => ({
  trial, criteria, id: trial.nctId, script: null, approved: null, lang: "en", drafting: false,
  played: false, playLang: "en", playUrl: null, autoAdvance: false,
  recorded: null, recUrl: null, dub: null,
  logs: { qa: [], teachback: [] }, ended: { qa: false, teachback: false }, grade: null,
  open: null,  // expanded step numbers; null means "just the current step"
});

async function api(path, opts = {}) {
  let r;
  try { r = await fetch(VOICE + path, opts); }
  catch { throw new Error("Can't reach the voice service on port 8001. Start it from the voice folder (see voice/README.md)."); }
  if (!r.ok) {
    let m = r.statusText;
    try {
      const d = (await r.json()).detail;
      m = typeof d === "string" ? d : (d || []).map(x => x.msg || JSON.stringify(x)).join("; ") || m;
    } catch {}
    throw new Error(m);
  }
  return r;
}
const post = (path, body) => api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const q = sel => root.querySelector(sel);
function msg(id, text, kind = "") { const el = q("#" + id); if (el) { el.textContent = text; el.className = "vp-msg " + kind; } }
// Tells the EHR page a trial's approval changed, so its "Explain to patient" button can show it.
const changed = st => document.dispatchEvent(new CustomEvent("rightvoice:change", { detail: { id: st.id } }));

/* ---------- Open / close ---------- */
async function open(trial, criteria) {
  await stopAll();
  let st = trials.get(trial.nctId);
  if (!st) trials.set(trial.nctId, st = newState(trial, criteria));
  st.trial = trial; st.criteria = criteria;
  S = st;
  root.hidden = false;
  render();
  if (st.script || st.drafting) return;
  try {
    const d = await (await post("/api/trials", { trial, criteria_summary: criteria })).json();
    st.approved = d.approved;
    st.script = structuredClone(d.approved || d.draft || null);
    if (st.approved) changed(st);
    if (!st.script) return draft(st, false);
    if (S === st) { st.open = null; render(); }
  } catch (e) { if (S === st) msg("scriptMsg", e.message, "error"); }
}
// Learn a trial's approval before its panel opens, so the EHR button shows it even after a page reload.
const checking = new Set();
async function check(trial, criteria) {
  const id = trial.nctId;
  if (trials.has(id) || checking.has(id)) return;
  checking.add(id);
  try {
    const d = await (await post("/api/trials", { trial, criteria_summary: criteria })).json();
    if (trials.has(id)) return;  // the panel opened meanwhile and has its own state
    const st = newState(trial, criteria);
    st.approved = d.approved;
    st.script = structuredClone(d.approved || d.draft || null);
    trials.set(id, st);
    if (st.approved) changed(st);
  } catch {}  // voice service unreachable: the button keeps its default label
  finally { checking.delete(id); }
}
async function stopAll() {
  session++;
  if (recorder) { recorder.onstop = null; recorder.stop(); recorder.stream.getTracks().forEach(t => t.stop()); recorder = null; }
  if (convo) { const c = convo; convo = null; await c.endSession().catch(() => {}); }
}
function close() { root.hidden = true; stopAll(); S = null; }

// Sent with every request, so a fresh serverless instance (Vercel) can answer without the earlier steps' memory.
const ctx = st => ({ trial: st.trial, criteria_summary: st.criteria, script: st.approved });

/* ---------- Steps ---------- */
// Steps 1, 2, 4, 5 are the main path. Step 3 (dubbing) is optional and never the "next" step.
const CORE = [1, 2, 4, 5], GATED = [2, 4, 5];
const isDone = n => [null, !!S.approved, S.played, !!S.dub, S.ended.qa, !!S.grade][n];
const current = () => S.script ? CORE.find(n => !isDone(n)) : 1;
function summary(n) {
  if (GATED.includes(n) && !S.approved) return "Approve the script first";
  if (n === 1) return S.approved ? `Approved ${S.approved.approved_at || ""}` : S.script ? "Claude drafts it. Nothing plays until you approve." : "Claude is drafting…";
  if (n === 2) return S.played ? `Played in ${LANGS[S.playLang]}` : "Stand-in doctor voice";
  if (n === 3) return S.dub ? "Spanish version ready" : "Record it; ElevenLabs dubs it in your voice";
  if (n === 4) return S.ended.qa ? `Ended · ${S.logs.qa.length} messages` : "Answers only from the trial record";
  return S.grade ? `${S.grade.understood} of ${S.grade.total} key points understood` : "Claude scores understanding";
}
// Update step markers in place, so audio, typing, and a live call are never interrupted by a re-render.
function refresh() {
  if (!S) return;
  const cur = current();
  root.querySelectorAll("[data-step]").forEach(sec => {
    const n = +sec.dataset.step, done = isDone(n), open = S.open.has(n);
    sec.classList.toggle("done", done);
    sec.classList.toggle("locked", GATED.includes(n) && !S.approved);
    sec.classList.toggle("current", n === cur);
    sec.classList.toggle("collapsed", !open);
    sec.querySelector(".n").textContent = done ? "✓" : n;
    sec.querySelector(".s").textContent = summary(n);
    sec.querySelector(".chev").textContent = open ? "▾" : "▸";
    sec.querySelector(".vp-step-h").setAttribute("aria-expanded", open);
    sec.querySelectorAll("[data-main]").forEach(b => { b.className = n === cur ? "primary" : "tb-btn"; });
  });
  const ab = q('[data-vp="approve"]');
  if (ab) ab.textContent = S.approved ? "✓ Approved" : "Approve script";
}
// A step finished: fold it away and open whatever comes next.
function advance(n) {
  S.open.delete(n);
  const c = current();
  if (c) S.open.add(c);
  refresh();
}

/* ---------- Render ---------- */
const step = (n, title, body) => `<section class="vp-step" data-step="${n}">
  <button class="vp-step-h" data-toggle="${n}"><span class="n">${n}</span><span class="t">${title}</span><span class="s"></span><span class="chev"></span></button>
  <div class="bd">${body}</div></section>`;
const bubble = m => `<div class="vp-bubble ${m.who}"><span class="who">${m.who === "user" ? "Patient" : "Assistant"}</span>${esc(m.text)}</div>`;
const IDLE = { qa: "The patient talks; the agent answers on this screen.", teachback: "The patient explains the study back in their own words." };
const call = (kind, start, end) => `
  <div class="vp-call" data-call="${kind}" data-state="idle">
    <div class="vp-orb">${ICON.mic}</div>
    <div class="vp-call-info"><div class="vp-call-state" id="${kind}State">${S.ended[kind] ? (kind === "teachback" && S.grade ? "Scored" : "Conversation ended") : "Ready"}</div>
      <div class="vp-msg" id="${kind}Msg">${IDLE[kind]}</div></div>
    <button data-main data-agent="${kind}">${start}</button>
    <button class="vp-end" data-vp="end" hidden>${end}</button>
  </div>
  <div class="vp-log" id="${kind}Log">${S.logs[kind].map(bubble).join("")}</div>`;
const gradeHtml = g => `<div class="vp-grade">
  <div class="vp-grade-top"><span class="vp-score">${g.understood} of ${g.total}</span> key points understood${g.partly ? `, ${g.partly} partly` : ""}
    <span class="vp-segs">${g.points.map(p => `<span class="${esc(p.result)}" title="${esc(p.point)}: ${esc(p.result)}"></span>`).join("")}</span></div>
  <p>${esc(g.clinician_note)}</p>
  <table><tr><th>Key point</th><th>Result</th><th>Patient said</th></tr>${g.points.map(p => `
    <tr><td>${esc(p.point)}</td><td><span class="vp-pill ${esc(p.result)}">${esc(p.result)}</span></td><td>${esc(p.evidence)}</td></tr>`).join("")}</table></div>`;
const dubHtml = d => `<table><tr><th>You said</th><th>Spanish</th></tr>${d.segments
  .map(s => `<tr><td>${esc(s.source)}</td><td>${esc(s.translation)}</td></tr>`).join("")}</table>`;

function render() {
  const s = S.script, L = S.lang;
  if (!S.open) S.open = new Set([current()].filter(Boolean));
  root.innerHTML = `
    <header class="vp-head">
      <div><div class="vp-eyebrow">${ICON.speaker} Explain to patient</div>
        <h2>${esc(S.trial.title)}</h2>
        <div class="vp-sub">${esc(S.id)} · Built from trial details only, never the patient record.</div></div>
      <button class="vp-x" data-vp="close" aria-label="Close">×</button>
    </header>
    <div class="vp-lang">Patient's language
      <span class="vp-seg">${Object.entries(LANGS).map(([k, v]) => `<button data-lang="${k}" class="${k === L ? "on" : ""}">${v}</button>`).join("")}</span>
    </div>
    <div class="vp-body">
      ${step(1, "Review the script", !s ? `<span class="vp-msg" id="scriptMsg"><span class="spin"></span> Claude is writing the script in English and Spanish… about 30 seconds</span>` : `
        <label>Title <input data-field="title" value="${esc(L === "es" ? s.plain_title_es : s.plain_title)}"></label>
        <label><span id="vpTextLabel">What the patient will hear (${LANGS[L]})</span> <textarea data-field="text">${esc(s[L])}</textarea></label>
        <details><summary>Key points for the teach-back check (${s.key_points.length})</summary>
          <div class="vp-kp">${s.key_points.map((k, i) => `<b>${esc(k.id)}</b><input data-kp="${i}" value="${esc(k[L])}">`).join("")}</div></details>
        <div class="vp-row">
          <button data-main data-vp="approve"></button>
          <button class="tb-btn" data-vp="redraft">Redraft</button>
          <span class="vp-msg ${S.approved ? "ok" : ""}" id="scriptMsg">${S.approved ? `Approved ${esc(S.approved.approved_at || "")}. Edit to change it.` : "Edits apply to both the audio and the agents once approved."}</span>
        </div>`)}
      ${step(2, "Play the summary", `
        <div class="vp-row"><button data-main data-vp="play">Play in ${LANGS[L]}</button><span class="vp-msg" id="playMsg"></span></div>
        <audio id="vpPlay" controls ${S.playUrl ? `src="${S.playUrl}"` : "hidden"}></audio>`)}
      ${step(3, `Your message in Spanish <span class="pill neutral">Optional</span>`, `
        <div class="vp-row"><button class="tb-btn" data-vp="record">${S.recorded ? "Record again" : "Record message"}</button>
          <button class="tb-btn" data-vp="sample">Use sample message</button>
          <button class="primary" data-vp="dub" ${S.recorded ? "" : "disabled"}>Dub into Spanish</button></div>
        <audio id="vpRec" controls ${S.recUrl ? `src="${S.recUrl}"` : "hidden"}></audio>
        <span class="vp-msg" id="dubMsg">${S.dub ? `Spanish version ready (project ${esc(S.dub.project_id)}).` : ""}</span>
        <audio id="vpDub" controls ${S.dub ? `src="${esc(S.dub.url)}"` : "hidden"}></audio>
        <div id="vpDubText">${S.dub ? dubHtml(S.dub) : ""}</div>`)}
      ${step(4, "Patient's questions", call("qa", "Start conversation", "End"))}
      ${step(5, "Teach-back check", call("teachback", "Start teach-back", "End and score") + `<div id="vpGrade">${S.grade ? gradeHtml(S.grade) : ""}</div>`)}
    </div>
    <footer class="disclaimer">Screening aid only. Final eligibility is determined by the study team.</footer>`;
  refresh();
}
function applyLang() {
  // Swap the visible language in place, so played audio, the dub, and teach-back results stay on screen.
  const s = S.script, L = S.lang;
  root.querySelectorAll("[data-lang]").forEach(b => b.classList.toggle("on", b.dataset.lang === L));
  q('[data-vp="play"]').textContent = `Play in ${LANGS[L]}`;
  if (!s) return;
  q('[data-field="title"]').value = L === "es" ? s.plain_title_es : s.plain_title;
  q('[data-field="text"]').value = s[L];
  q("#vpTextLabel").textContent = `What the patient will hear (${LANGS[L]})`;
  root.querySelectorAll("[data-kp]").forEach(el => { el.value = s.key_points[+el.dataset.kp][L]; });
}
function setApproved(st, a) {
  st.approved = a;
  // A changed script hasn't been played or checked yet.
  if (!a) { st.played = false; st.ended = { qa: false, teachback: false }; st.grade = null; }
  changed(st);
  if (st !== S) return;
  if (a) { msg("scriptMsg", `Approved ${a.approved_at || ""}. Edit to change it.`, "ok"); return advance(1); }
  const g = q("#vpGrade");
  if (g) g.innerHTML = "";
  S.open = new Set([1]);
  refresh();
}

/* ---------- Script ---------- */
async function draft(st, fresh) {
  st.drafting = true; st.script = null;
  if (st.approved) setApproved(st, null);
  if (S === st) { st.open = null; render(); }
  try {
    st.script = await (await post(`/api/trials/${enc(st.id)}/script${fresh ? "?refresh=true" : ""}`, { ...ctx(st), script: null })).json();
    if (S === st) { st.open = null; render(); }
  } catch (e) { if (S === st) msg("scriptMsg", "Claude couldn't draft the script: " + e.message, "error"); }
  st.drafting = false;
}
root.addEventListener("input", e => {
  if (!S?.script) return;
  const f = e.target.dataset.field, kp = e.target.dataset.kp, L = S.lang;
  if (f === "title") S.script[L === "es" ? "plain_title_es" : "plain_title"] = e.target.value;
  else if (f === "text") S.script[L] = e.target.value;
  else if (kp !== undefined) S.script.key_points[+kp][L] = e.target.value;
  else return;
  if (S.approved) { setApproved(S, null); msg("scriptMsg", "Edited. Approve again to use the changes."); }
});
// "ended" doesn't bubble, so listen in the capture phase. A fresh play that runs to the end moves on to the next step.
root.addEventListener("ended", e => {
  if (e.target.id === "vpPlay" && S?.autoAdvance) { S.autoAdvance = false; advance(2); }
}, true);

/* ---------- Actions ---------- */
root.addEventListener("click", async e => {
  const toggle = e.target.closest("[data-toggle]");
  if (toggle) {
    const n = +toggle.dataset.toggle;
    S.open.has(n) ? S.open.delete(n) : S.open.add(n);
    return refresh();
  }
  const lang = e.target.closest("[data-lang]");
  if (lang) { if (convo || starting) return; S.lang = lang.dataset.lang; return applyLang(); }
  const agent = e.target.closest("[data-agent]");
  if (agent) return startAgent(agent.dataset.agent);
  const b = e.target.closest("[data-vp]");
  if (!b) return;
  const act = b.dataset.vp, st = S;
  if (act === "close") return close();
  if (act === "redraft") { await stopAll(); return draft(st, true); }
  if (act === "end") return convo?.endSession();
  if (act === "approve") {
    try { setApproved(st, await (await post(`/api/trials/${enc(st.id)}/approve`, st.script)).json()); }
    catch (err) { if (S === st) msg("scriptMsg", err.message, "error"); }
  }
  if (act === "play") {
    const lang = st.lang;
    msg("playMsg", "Generating audio…");
    try {
      const blob = await (await post(`/api/trials/${enc(st.id)}/speech`, { ...ctx(st), language: lang })).blob();
      if (st.playUrl) URL.revokeObjectURL(st.playUrl);
      Object.assign(st, { playUrl: URL.createObjectURL(blob), playLang: lang, played: true, autoAdvance: true });
      if (S !== st) return;
      const a = q("#vpPlay"); a.src = st.playUrl; a.hidden = false;
      refresh();
      await a.play();
      msg("playMsg", "Playing.", "ok");
    } catch (err) { if (S === st) msg("playMsg", err.message, "error"); }
  }
  if (act === "record") return record(st);
  if (act === "sample") {
    msg("dubMsg", "Generating a sample message in the stand-in doctor voice…");
    try {
      const blob = await (await post("/api/sample-doctor-message", {})).blob();
      setRecorded(st, new File([blob], "sample-doctor-message.mp3", { type: "audio/mpeg" }));
      if (S === st) msg("dubMsg", "Sample ready. Listen, then dub it into Spanish.", "ok");
    } catch (err) { if (S === st) msg("dubMsg", err.message, "error"); }
  }
  if (act === "dub") return dub(st);
});

/* ---------- Doctor's message, dubbed ---------- */
function setRecorded(st, file) {
  if (st.recUrl) URL.revokeObjectURL(st.recUrl);
  st.recorded = file; st.recUrl = URL.createObjectURL(file);
  if (S !== st) return;
  const a = q("#vpRec"); a.src = st.recUrl; a.hidden = false;
  q('[data-vp="dub"]').disabled = false;
}
async function record(st) {
  if (recorder) { recorder.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const type = recorder?.mimeType || "audio/webm";
      recorder = null;
      setRecorded(st, new File(chunks, "doctor-message." + (type.includes("mp4") ? "mp4" : "webm"), { type }));
      if (S !== st) return;
      q('[data-vp="record"]').textContent = "Record again";
      msg("dubMsg", "Recorded. Listen back, then dub it into Spanish.");
    };
    recorder.start();
    q('[data-vp="record"]').textContent = "Stop recording";
    msg("dubMsg", "Recording… speak for about 15 seconds.");
  } catch (err) { msg("dubMsg", "Microphone unavailable: " + err.message, "error"); }
}
async function dub(st) {
  const say = (text, kind) => { if (S === st) msg("dubMsg", text, kind); };
  const button = on => { if (S === st) q('[data-vp="dub"]').disabled = !on; };
  const fd = new FormData(); fd.append("file", st.recorded); fd.append("target_language", "es");
  button(false); say("Uploading…");
  try {
    const { project_id } = await (await api("/api/dub", { method: "POST", body: fd })).json();
    const t0 = Date.now();
    let misses = 0;
    while (true) {
      if (Date.now() - t0 > 5 * 60000) throw new Error(`Dubbing is taking over 5 minutes (project ${project_id}). Try again later.`);
      let d;
      try { d = await (await api(`/api/dub/${enc(project_id)}`)).json(); misses = 0; }
      catch (err) { if (++misses >= 3) throw err; await sleep(4000); continue; }
      if (d.status === "failed") throw new Error("Dubbing failed.");
      if (d.status === "completed") {
        st.dub = { project_id, url: `${VOICE}/api/dub/${enc(project_id)}/audio`, segments: d.segments || [] };
        if (S === st) {
          const a = q("#vpDub"); a.src = st.dub.url; a.hidden = false;
          q("#vpDubText").innerHTML = dubHtml(st.dub);
          refresh();
        }
        say(`Spanish version ready (project ${project_id}).`, "ok");
        break;
      }
      say(`Dubbing into Spanish… ${Math.round((Date.now() - t0) / 1000)}s`);
      await sleep(4000);
    }
  } catch (err) { say(err.message, "error"); }
  button(true);
}

/* ---------- Agents: questions and teach-back ---------- */
// Listen to the mic for a moment before connecting. A blocked or virtual mic delivers exact digital silence, which
// otherwise looks like a patient who never speaks. Real mics always pick up some room noise.
async function micCheck() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const track = stream.getAudioTracks()[0];
  const ctx = new AudioContext();
  await ctx.resume();
  const an = ctx.createAnalyser();
  an.fftSize = 2048;
  ctx.createMediaStreamSource(stream).connect(an);
  const buf = new Float32Array(an.fftSize);
  let peak = 0;
  for (const t0 = performance.now(); performance.now() - t0 < 900;) {
    await sleep(60);
    an.getFloatTimeDomainData(buf);
    for (const v of buf) peak = Math.max(peak, Math.abs(v));
  }
  const info = { label: track.label || "default microphone", deviceId: track.getSettings().deviceId, peak };
  stream.getTracks().forEach(t => t.stop());
  ctx.close();
  return info;
}

// The call view for one agent step: idle, connecting, listening, speaking, or scoring.
function setCall(kind, state, text) {
  const el = q(`[data-call="${kind}"]`);
  if (!el) return;
  el.dataset.state = state;
  q(`#${kind}State`).textContent = text;
  el.querySelector("[data-agent]").hidden = state !== "idle";
  el.querySelector('[data-vp="end"]').hidden = state !== "listening" && state !== "speaking";
  if (state !== "listening" && state !== "speaking") setLevel(kind, 0);
}
const setLevel = (kind, v) => q(`[data-call="${kind}"] .vp-orb`)?.style.setProperty("--lvl", v.toFixed(2));
const agentButtons = on => root.querySelectorAll("[data-agent]").forEach(b => { b.disabled = !on; });

async function startAgent(kind) {
  if (convo || starting) return;
  starting = true;
  const st = S, mine = ++session, live = () => mine === session;
  let convoId = null, done = false, micLabel = "";
  st.logs[kind] = []; st.ended[kind] = false;
  q(`#${kind}Log`).innerHTML = "";
  if (kind === "teachback") { st.grade = null; q("#vpGrade").innerHTML = ""; }
  agentMode = "listening";
  agentButtons(false);
  refresh();
  setCall(kind, "connecting", "Checking the microphone…");
  msg(kind + "Msg", "");
  try {
    const mic = await micCheck();
    if (!live()) return;
    micLabel = `Microphone: ${mic.label}`;
    msg(kind + "Msg", micLabel);
    if (mic.peak < 1e-5) {
      throw new Error(`"${mic.label}" is sending silence. On a Mac, check System Settings › Privacy & Security › ` +
        "Microphone for this browser, and System Settings › Sound › Input for the right device and level. Then try again.");
    }
    setCall(kind, "connecting", "Connecting…");
    const { Conversation } = await import(SDK);
    const s = await (await post(`/api/agents/${kind}/session`, { ...ctx(st), trial_id: st.id, language: st.lang })).json();
    const c = await Conversation.startSession({
      conversationToken: s.token,
      connectionType: "webrtc",
      inputDeviceId: mic.deviceId,  // the mic that just passed the check
      dynamicVariables: s.dynamic_variables,
      overrides: { agent: { language: s.language } },
      onConnect: ({ conversationId } = {}) => {
        convoId = conversationId || convoId;
        if (live()) setCall(kind, "listening", "Connected. The patient can talk now.");
      },
      onMessage: m => {
        if (!live()) return;
        const entry = { who: (m.source ?? m.role) === "user" ? "user" : "ai", text: m.message };
        st.logs[kind].push(entry);
        const log = q(`#${kind}Log`);
        log.insertAdjacentHTML("beforeend", bubble(entry));
        log.scrollTop = log.scrollHeight;
      },
      onModeChange: m => {
        if (!live()) return;
        agentMode = m.mode;
        setCall(kind, m.mode === "speaking" ? "speaking" : "listening", m.mode === "speaking" ? "Assistant speaking…" : "Listening…");
      },
      onError: err => { if (live()) msg(kind + "Msg", String(err?.message || err), "error"); },
      onDisconnect: () => finished(),
    });
    convoId = c.getId() || convoId;
    if (live() && !done) { convo = c; watchMic(c, kind, mine, micLabel); }
    else c.endSession().catch(() => {});  // the panel closed while connecting
  } catch (err) {
    const text = err.name === "NotAllowedError"
      ? "The browser blocked the microphone. Allow it for this page (the icon at the left of the address bar). The Claude app's built-in browser can't use microphones, so open http://localhost:8000 in Chrome."
      : err.name === "NotFoundError" ? "No microphone found. Plug one in or pick an input in System Settings › Sound." : err.message;
    if (live()) { setCall(kind, "idle", "Couldn't start"); msg(kind + "Msg", text, "error"); agentButtons(true); }
  } finally {
    starting = false;
  }

  async function finished() {
    if (done) return;
    done = true;
    if (!live()) return;  // closed or switched trial: don't score an abandoned call
    convo = null;
    st.ended[kind] = true;
    if (kind !== "teachback" || !convoId) {
      setCall(kind, "idle", "Conversation ended");
      agentButtons(true);
      return kind === "qa" ? advance(4) : refresh();
    }
    setCall(kind, "scoring", "Scoring with Claude…");
    try {
      const g = await (await post("/api/teachback/grade", { ...ctx(st), conversation_id: convoId, trial_id: st.id })).json();
      if (!live()) return;
      st.grade = g;
      q("#vpGrade").innerHTML = gradeHtml(g);
      setCall(kind, "idle", "Scored");
      refresh();
    } catch (err) { if (live()) { setCall(kind, "idle", "Couldn't score"); msg(kind + "Msg", err.message, "error"); } }
    if (live()) agentButtons(true);
  }
}

function watchMic(c, kind, mine, micLabel) {
  let quietSince = Date.now(), warned = false;
  const timer = setInterval(() => {
    if (mine !== session || convo !== c) return clearInterval(timer);
    const input = c.getInputVolume?.() ?? 0, speaking = agentMode === "speaking";
    setLevel(kind, Math.min(1, (speaking ? c.getOutputVolume?.() ?? 0 : input) * 3));
    if (input > 0.01) {
      quietSince = Date.now();
      if (warned) { warned = false; msg(kind + "Msg", micLabel); }
    } else if (Date.now() - quietSince > 8000 && !speaking) {
      msg(kind + "Msg", "No sound from the microphone. Check that it's unmuted and the right input is selected.", "error");
      warned = true;
      quietSince = Date.now();
    }
  }, 100);
}

document.addEventListener("keydown", e => { if (e.key === "Escape" && !root.hidden && !convo) close(); });
window.RightVoice = { open, close, check, isApproved: id => !!trials.get(id)?.approved };

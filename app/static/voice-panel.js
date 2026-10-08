/* right voice panel: explain one matched trial to the patient, on this screen.
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

document.head.insertAdjacentHTML("beforeend", `<style>
  .vp { position: fixed; top: 0; right: 0; bottom: 0; width: min(540px, 100vw); z-index: 50;
        background: var(--bg); border-left: 1px solid var(--border); box-shadow: -8px 0 24px rgba(0,0,0,.18);
        display: flex; flex-direction: column; }
  .vp-head { background: var(--panel); border-bottom: 1px solid var(--border); padding: 10px 14px;
             display: flex; gap: 10px; align-items: flex-start; }
  .vp-head > div { flex: 1; min-width: 0; }
  .vp-eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: var(--accent); font-weight: 700; }
  .vp-head h2 { font-size: 15px; margin: 2px 0; text-wrap: balance; }
  .vp-sub { color: var(--muted); font-size: 12px; }
  .vp-x { background: none; border: 0; font-size: 22px; line-height: 1; cursor: pointer; color: var(--muted); padding: 0 4px; }
  .vp-lang { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: var(--panel);
             border-bottom: 1px solid var(--border); font-size: 12px; color: var(--muted); }
  .vp-seg { display: inline-flex; border: 1px solid var(--border); border-radius: 3px; overflow: hidden; }
  .vp-seg button { border: 0; background: var(--btn); padding: 4px 12px; cursor: pointer; color: var(--text); font: inherit; }
  .vp-seg button.on { background: var(--accent); color: var(--panel); font-weight: 600; }
  .vp-body { flex: 1; overflow-y: auto; padding: 12px 14px 24px; display: flex; flex-direction: column; gap: 10px; }
  .vp-step { background: var(--panel); border: 1px solid var(--border); border-radius: 3px; }
  .vp-step h3 { margin: 0; font-size: 13px; padding: 7px 10px; background: var(--section-head);
                border-bottom: 1px solid var(--border); display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
  .vp-step h3 .n { display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 50%;
                   background: var(--accent); color: var(--panel); font-size: 11px; }
  .vp-step h3 small { font-weight: 400; color: var(--muted); }
  .vp-step .bd { padding: 10px; display: flex; flex-direction: column; gap: 8px; }
  .vp-step.locked .bd { opacity: .5; pointer-events: none; }
  .vp-step.locked h3::after { content: "Approve the script first"; margin-left: auto; font-size: 11px; font-weight: 600; color: var(--warn-text); }
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
  .vp-log { background: var(--storyboard); border: 1px solid var(--divider); border-radius: 3px; padding: 6px 8px;
            max-height: 200px; overflow-y: auto; font-size: 12px; display: flex; flex-direction: column; gap: 3px; }
  .vp-log:empty { display: none; }
  .vp-log .who { font-weight: 700; color: var(--accent); }
  .vp-log .user .who { color: var(--ok-text); }
  .vp table { border-collapse: collapse; width: 100%; font-size: 12px; }
  .vp td, .vp th { text-align: left; padding: 4px 5px; border-bottom: 1px solid var(--divider); vertical-align: top; }
  .vp th { color: var(--muted); font-weight: 600; }
  .vp-score { font-size: 16px; font-weight: 700; }
  .vp-pill { font-size: 11px; font-weight: 600; padding: 0 6px; border-radius: 3px; white-space: nowrap; }
  .vp-pill.understood { background: var(--ok-bg); color: var(--ok-text); }
  .vp-pill.partly { background: var(--warn-bg); color: var(--warn-text); }
  .vp-pill.missed { background: var(--neutral-bg); color: var(--alert); }
  .vp-meter { display: inline-block; width: 70px; height: 6px; border-radius: 3px; background: var(--divider); overflow: hidden; vertical-align: middle; }
  .vp-meter span { display: block; height: 100%; width: 0; background: var(--ok); transition: width .1s; }
  .vp-mic { font-size: 11px; color: var(--muted); }
</style>`);

const root = document.createElement("aside");
root.className = "vp";
root.hidden = true;
root.setAttribute("aria-label", "Explain trial to patient");
document.body.append(root);

let S = null;          // the open trial: { trial, id, script, approved, lang, drafting }
let convo = null;      // active ElevenLabs conversation, if any
let recorder = null;   // active MediaRecorder, if any
let recorded = null;   // the doctor's message to dub (File)
let session = 0;       // bumps when the panel closes or switches trial, so an abandoned call is never scored
let starting = false;  // an agent session is connecting
let agentMode = "listening";  // "speaking" while the agent talks; the silence warning only applies while listening
const sleep = ms => new Promise(r => setTimeout(r, ms));

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

/* ---------- Open / close ---------- */
async function open(trial, criteria) {
  await stopAll();
  S = { trial, criteria, id: trial.nctId, script: null, approved: null, lang: "en", drafting: false };
  recorded = null;
  root.hidden = false;
  render();
  try {
    const d = await (await post("/api/trials", { trial, criteria_summary: criteria })).json();
    S.approved = d.approved;
    S.script = structuredClone(d.approved || d.draft || null);
    if (S.script) render(); else await draft(false);
  } catch (e) { msg("scriptMsg", e.message, "error"); }
}
async function stopAll() {
  session++;
  if (recorder) { recorder.onstop = null; recorder.stop(); recorder = null; }
  if (convo) { const c = convo; convo = null; await c.endSession().catch(() => {}); }
}
function close() { root.hidden = true; stopAll(); S = null; }

// Sent with every request, so a fresh serverless instance (Vercel) can answer without the earlier steps' memory.
const ctx = () => ({ trial: S.trial, criteria_summary: S.criteria, script: S.approved });

/* ---------- Render ---------- */
function render() {
  const s = S.script, L = S.lang;
  const locked = S.approved ? "" : "locked";
  root.innerHTML = `
    <header class="vp-head">
      <div><div class="vp-eyebrow">Explain to patient</div>
        <h2>${esc(S.trial.title)}</h2>
        <div class="vp-sub">${esc(S.id)} · Plays on this screen. Built from trial details only, never the patient record.</div></div>
      <button class="vp-x" data-vp="close" aria-label="Close">×</button>
    </header>
    <div class="vp-lang">Patient's language
      <span class="vp-seg">${Object.entries(LANGS).map(([k, v]) => `<button data-lang="${k}" class="${k === L ? "on" : ""}">${v}</button>`).join("")}</span>
    </div>
    <div class="vp-body">
      <section class="vp-step"><h3><span class="n">1</span> Review the script <small>Claude drafts it. Nothing plays until you approve.</small></h3>
        <div class="bd">${!s ? `<span class="vp-msg" id="scriptMsg"><span class="spin"></span> Claude is writing the script in English and Spanish… about 30 seconds</span>` : `
          <label>Title <input data-field="title" value="${esc(L === "es" ? s.plain_title_es : s.plain_title)}"></label>
          <label><span id="vpTextLabel">What the patient will hear (${LANGS[L]})</span> <textarea data-field="text">${esc(s[L])}</textarea></label>
          <details><summary>Key points for the teach-back check (${s.key_points.length})</summary>
            <div class="vp-kp">${s.key_points.map((k, i) => `<b>${esc(k.id)}</b><input data-kp="${i}" value="${esc(k[L])}">`).join("")}</div></details>
          <div class="vp-row">
            <button class="primary" data-vp="approve">${S.approved ? "Approved" : "Approve script"}</button>
            <button class="tb-btn" data-vp="redraft">Redraft</button>
            <span class="vp-msg ${S.approved ? "ok" : ""}" id="scriptMsg">${S.approved ? `Approved ${esc(S.approved.approved_at || "")}. Edit to change it.` : "Edits apply to both the audio and the agents once approved."}</span>
          </div>`}
        </div></section>

      <section class="vp-step ${locked}" data-needs-approval><h3><span class="n">2</span> Play the summary <small>Stand-in doctor voice</small></h3>
        <div class="bd"><div class="vp-row"><button class="primary" data-vp="play">Play in ${LANGS[L]}</button><span class="vp-msg" id="playMsg"></span></div>
          <audio id="vpPlay" controls hidden></audio></div></section>

      <section class="vp-step"><h3><span class="n">3</span> Your message in Spanish, in your voice <small>ElevenLabs dubbing, about 30 seconds</small></h3>
        <div class="bd">
          <div class="vp-row"><button class="tb-btn" data-vp="record">Record message</button>
            <button class="tb-btn" data-vp="sample">Use sample message</button>
            <button class="primary" data-vp="dub" ${recorded ? "" : "disabled"}>Dub into Spanish</button></div>
          <audio id="vpRec" controls hidden></audio>
          <span class="vp-msg" id="dubMsg"></span>
          <audio id="vpDub" controls hidden></audio>
          <div id="vpDubText"></div>
        </div></section>

      <section class="vp-step ${locked}" data-needs-approval><h3><span class="n">4</span> Patient's questions <small>Voice agent answers only from the trial record</small></h3>
        <div class="bd"><div class="vp-row"><button class="primary" data-agent="qa">Start conversation</button>
            <button class="tb-btn" data-vp="end" disabled>End</button><span class="vp-meter" id="qaMeter" title="Microphone level"><span></span></span><span class="vp-msg" id="qaMsg"></span></div>
          <div class="vp-mic" id="qaMic"></div>
          <div class="vp-log" id="qaLog"></div></div></section>

      <section class="vp-step ${locked}" data-needs-approval><h3><span class="n">5</span> Teach-back check <small>Patient explains it back; Claude scores understanding</small></h3>
        <div class="bd"><div class="vp-row"><button class="primary" data-agent="teachback">Start teach-back</button>
            <button class="tb-btn" data-vp="end" disabled>End and score</button><span class="vp-meter" id="teachbackMeter" title="Microphone level"><span></span></span><span class="vp-msg" id="teachbackMsg"></span></div>
          <div class="vp-mic" id="teachbackMic"></div>
          <div class="vp-log" id="teachbackLog"></div><div id="vpGrade"></div></div></section>
    </div>`;
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
function setApproved(a) {
  S.approved = a;
  root.querySelectorAll("[data-needs-approval]").forEach(el => el.classList.toggle("locked", !a));
  const b = q('[data-vp="approve"]');
  if (b) b.textContent = a ? "Approved" : "Approve script";
  if (a) msg("scriptMsg", `Approved ${a.approved_at || ""}. Edit to change it.`, "ok");
}

/* ---------- Script ---------- */
async function draft(refresh) {
  S.script = null; S.approved = null; render();
  try {
    S.script = await (await post(`/api/trials/${enc(S.id)}/script${refresh ? "?refresh=true" : ""}`, { ...ctx(), script: null })).json();
    render();
  } catch (e) { msg("scriptMsg", "Claude couldn't draft the script: " + e.message, "error"); }
}
root.addEventListener("input", e => {
  if (!S?.script) return;
  const f = e.target.dataset.field, kp = e.target.dataset.kp, L = S.lang;
  if (f === "title") S.script[L === "es" ? "plain_title_es" : "plain_title"] = e.target.value;
  else if (f === "text") S.script[L] = e.target.value;
  else if (kp !== undefined) S.script.key_points[+kp][L] = e.target.value;
  else return;
  if (S.approved) { setApproved(null); msg("scriptMsg", "Edited. Approve again to use the changes."); }
});

/* ---------- Actions ---------- */
root.addEventListener("click", async e => {
  const lang = e.target.closest("[data-lang]");
  if (lang) { if (convo || starting) return; S.lang = lang.dataset.lang; return applyLang(); }
  const agent = e.target.closest("[data-agent]");
  if (agent) return startAgent(agent.dataset.agent, agent);
  const b = e.target.closest("[data-vp]");
  if (!b) return;
  const act = b.dataset.vp;
  if (act === "close") return close();
  if (act === "redraft") return draft(true);
  if (act === "end") return convo?.endSession();
  if (act === "approve") {
    try { setApproved(await (await post(`/api/trials/${enc(S.id)}/approve`, S.script)).json()); }
    catch (err) { msg("scriptMsg", err.message, "error"); }
  }
  if (act === "play") {
    msg("playMsg", "Generating audio…");
    try {
      const blob = await (await post(`/api/trials/${enc(S.id)}/speech`, { ...ctx(), language: S.lang })).blob();
      const a = q("#vpPlay"); a.src = URL.createObjectURL(blob); a.hidden = false; await a.play();
      msg("playMsg", "Playing.", "ok");
    } catch (err) { msg("playMsg", err.message, "error"); }
  }
  if (act === "record") return record(b);
  if (act === "sample") {
    msg("dubMsg", "Generating a sample message in the stand-in doctor voice…");
    try {
      const blob = await (await post("/api/sample-doctor-message", {})).blob();
      setRecorded(new File([blob], "sample-doctor-message.mp3", { type: "audio/mpeg" }));
      msg("dubMsg", "Sample ready. Listen, then dub it into Spanish.", "ok");
    } catch (err) { msg("dubMsg", err.message, "error"); }
  }
  if (act === "dub") return dub(b);
});

/* ---------- Doctor's message, dubbed ---------- */
function setRecorded(file) {
  recorded = file;
  const a = q("#vpRec"); a.src = URL.createObjectURL(file); a.hidden = false;
  q('[data-vp="dub"]').disabled = false;
}
async function record(btn) {
  if (recorder) { recorder.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const type = recorder?.mimeType || "audio/webm";
      setRecorded(new File(chunks, "doctor-message." + (type.includes("mp4") ? "mp4" : "webm"), { type }));
      recorder = null; btn.textContent = "Record again";
      msg("dubMsg", "Recorded. Listen back, then dub it into Spanish.");
    };
    recorder.start();
    btn.textContent = "Stop recording";
    msg("dubMsg", "Recording… speak for about 15 seconds.");
  } catch (err) { msg("dubMsg", "Microphone unavailable: " + err.message, "error"); }
}
async function dub(btn) {
  const fd = new FormData(); fd.append("file", recorded); fd.append("target_language", "es");
  btn.disabled = true; msg("dubMsg", "Uploading…");
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
        const a = q("#vpDub"); a.src = `${VOICE}/api/dub/${enc(project_id)}/audio`; a.hidden = false;
        q("#vpDubText").innerHTML = `<table><tr><th>You said</th><th>Spanish</th></tr>${(d.segments || [])
          .map(s => `<tr><td>${esc(s.source)}</td><td>${esc(s.translation)}</td></tr>`).join("")}</table>`;
        msg("dubMsg", `Spanish version ready (project ${project_id}).`, "ok");
        break;
      }
      msg("dubMsg", `Dubbing into Spanish… ${Math.round((Date.now() - t0) / 1000)}s`);
      await sleep(4000);
    }
  } catch (err) { msg("dubMsg", err.message, "error"); }
  btn.disabled = false;
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

async function startAgent(kind, btn) {
  if (convo || starting) return;
  starting = true;
  const mine = ++session, trialId = S.id;
  const log = q(`#${kind}Log`), end = btn.parentElement.querySelector('[data-vp="end"]');
  const agentButtons = on => root.querySelectorAll("[data-agent]").forEach(b => { b.disabled = !on; });
  let convoId = null, done = false;
  log.innerHTML = "";
  if (kind === "teachback") q("#vpGrade").innerHTML = "";
  agentButtons(false);
  msg(kind + "Msg", "Connecting…");
  try {
    msg(kind + "Msg", "Checking the microphone…");
    const mic = await micCheck();
    q(`#${kind}Mic`).textContent = `Microphone: ${mic.label}`;
    if (mic.peak < 1e-5) {
      throw new Error(`"${mic.label}" is sending silence. On a Mac, check System Settings › Privacy & Security › ` +
        "Microphone for this browser, and System Settings › Sound › Input for the right device and level. Then try again.");
    }
    const { Conversation } = await import(SDK);
    const s = await (await post(`/api/agents/${kind}/session`, { ...ctx(), trial_id: S.id, language: S.lang })).json();
    const c = await Conversation.startSession({
      conversationToken: s.token,
      connectionType: "webrtc",
      inputDeviceId: mic.deviceId,  // the mic that just passed the check
      dynamicVariables: s.dynamic_variables,
      overrides: { agent: { language: s.language } },
      onConnect: ({ conversationId } = {}) => {
        convoId = conversationId || convoId;
        if (mine === session) { msg(kind + "Msg", "Connected. The patient can talk now.", "ok"); end.disabled = false; }
      },
      onMessage: m => {
        if (mine !== session) return;
        const who = (m.source ?? m.role) === "user" ? "user" : "ai";
        log.insertAdjacentHTML("beforeend", `<div class="${who}"><span class="who">${who === "user" ? "Patient" : "Assistant"}:</span> ${esc(m.message)}</div>`);
        log.scrollTop = log.scrollHeight;
      },
      onModeChange: m => {
        if (mine !== session) return;
        agentMode = m.mode;
        msg(kind + "Msg", m.mode === "speaking" ? "Assistant speaking…" : "Listening…", "ok");
      },
      onError: err => { if (mine === session) msg(kind + "Msg", String(err?.message || err), "error"); },
      onDisconnect: () => finished(),
    });
    convoId = c.getId() || convoId;
    if (mine === session && !done) { convo = c; watchMic(c, kind, mine); }
    else c.endSession().catch(() => {});  // the panel closed while connecting
  } catch (err) {
    const text = err.name === "NotAllowedError"
      ? "The browser blocked the microphone. Allow it for this page (the icon at the left of the address bar). The Claude app's built-in browser can't use microphones, so open http://localhost:8000 in Chrome."
      : err.name === "NotFoundError" ? "No microphone found. Plug one in or pick an input in System Settings › Sound." : err.message;
    if (mine === session) { msg(kind + "Msg", text, "error"); agentButtons(true); }
  }
  starting = false;

  async function finished() {
    q(`#${kind}Meter span`)?.style.setProperty("width", "0");
    if (done) return;
    done = true;
    if (mine !== session || S?.id !== trialId) return;  // closed or switched trial: don't score an abandoned call
    convo = null; agentButtons(true); end.disabled = true;
    if (kind !== "teachback" || !convoId) return msg(kind + "Msg", "Conversation ended.");
    msg(kind + "Msg", "Scoring with Claude…");
    try {
      const g = await (await post("/api/teachback/grade", { ...ctx(), conversation_id: convoId, trial_id: trialId })).json();
      if (mine !== session) return;
      q("#vpGrade").innerHTML = `
        <div class="vp-score">${g.understood} of ${g.total} key points understood${g.partly ? `, ${g.partly} partly` : ""}</div>
        <p>${esc(g.clinician_note)}</p>
        <table><tr><th>Key point</th><th>Result</th><th>Patient said</th></tr>${g.points.map(p => `
          <tr><td>${esc(p.point)}</td><td><span class="vp-pill ${p.result}">${p.result}</span></td><td>${esc(p.evidence)}</td></tr>`).join("")}</table>`;
      msg(kind + "Msg", "Scored.", "ok");
    } catch (err) { if (mine === session) msg(kind + "Msg", err.message, "error"); }
  }
}

function watchMic(c, kind, mine) {
  let quietSince = Date.now();
  const timer = setInterval(() => {
    if (mine !== session || convo !== c) return clearInterval(timer);
    const v = c.getInputVolume?.() ?? 0;
    const bar = q(`#${kind}Meter span`);
    if (bar) bar.style.width = Math.min(100, Math.round(v * 300)) + "%";
    if (v > 0.01) quietSince = Date.now();
    else if (Date.now() - quietSince > 8000 && agentMode !== "speaking") {
      msg(kind + "Msg", "No sound from the microphone. Check that it's unmuted and the right input is selected.", "error");
      quietSince = Date.now();
    }
  }, 100);
}

document.addEventListener("keydown", e => { if (e.key === "Escape" && !root.hidden && !convo) close(); });
window.RightVoice = { open, close };

// Drives the real Triright UI (serve_snapshot.py on :8010) in headless Chrome and saves 2x screenshots of each state
// the film shows, plus element rectangles (CSS px) so the film can aim the camera and cursor at real positions.
//   node demo/launch-film/tools/capture.mjs
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../assets/ui");
const URL = "http://127.0.0.1:8010/";
const W = 1440, H = 900, DPR = 2, PORT = 9334;
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, "--hide-scrollbars", "--no-first-run",
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "triright-capture-"))}`, "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rects = {};

try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(t => t.type === "page"); } catch {}
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = bad; });
  let id = 0; const waiting = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); waiting.get(m.id)?.(m); waiting.delete(m.id); };
  const send = (method, params = {}) => new Promise((ok, bad) => {
    waiting.set(++id, m => m.error ? bad(new Error(`${method}: ${m.error.message}`)) : ok(m.result));
    ws.send(JSON.stringify({ id, method, params }));
  });
  const js = async expr => {
    const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || expr);
    return r.result.value;
  };
  const until = async (expr, ms = 15000) => {
    for (const t0 = Date.now(); Date.now() - t0 < ms; await sleep(100)) if (await js(expr).catch(() => false)) return;
    throw new Error("timed out waiting for " + expr);
  };
  const size = async (w, h) => send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: DPR, mobile: false });
  // Rectangles of named elements, in CSS px of the current viewport.
  const measure = async (name, sels) => {
    rects[name] = await js(`(${(sels) => Object.fromEntries(Object.entries(sels).map(([k, s]) => {
      const el = document.querySelector(s); if (!el) return [k, null];
      const r = el.getBoundingClientRect(); return [k, { x: r.x, y: r.y, w: r.width, h: r.height }];
    }))})(${JSON.stringify(sels)})`);
  };
  const shot = async (name, sels = {}) => {
    // Keep the patient list at the same scroll in every shot, so cuts between states don't jump.
    await js(`(() => { const l = document.getElementById("mtList"), a = l && l.querySelector(".mt-pt.active");
      if (a) l.scrollTop = a.offsetTop - l.clientHeight * 0.45; })()`);
    await js("new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))");
    await measure(name, sels);
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(OUT, name + ".png"), Buffer.from(data, "base64"));
    console.log("captured", name);
  };

  await size(W, H);
  await send("Page.enable");
  // Same-origin voice calls (proxied to :8011), and a slower match so the "screening" state can be captured.
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    window.RIGHT_VOICE_URL = "/voice";
    const realFetch = window.fetch;
    window.fetch = async (u, o) => { if (String(u).includes("/api/match") && window.__slowMatch) await new Promise(r => setTimeout(r, 4000)); return realFetch(u, o); };` });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
  await send("Page.navigate", { url: URL });
  await until(`document.querySelectorAll(".mt-pt").length === 24`);

  // 00: department schedule, the EHR the clinician already uses.
  await js(`document.getElementById("navSchedule").click()`);
  await shot("00-schedule", { table: "#schedTable", tabs: "#wsTabs", match: "#navMatch" });

  // 01: Triright tab, synthetic patient Nadia Feld selected, before the match.
  await js(`document.getElementById("navMatch").click()`);
  await until(`document.querySelector('[data-pid="P-016"]')`);
  await js(`document.querySelector('[data-pid="P-016"]').click()`);
  await js(`document.querySelector('[data-pid="P-016"]').scrollIntoView({ block: "center" })`);
  await shot("01-patient", { run: "[data-run]", banner: ".mt-banner", count: ".mt-count", list: "#mtList", active: ".mt-pt.active", main: "#mtMain", note: ".mt-note" });

  // 02: screening in progress.
  await js(`window.__slowMatch = true; document.querySelector("[data-run]").click()`);
  await sleep(1300);
  await shot("02-screening", { count: ".mt-count", spin: ".mt-count .spin" });

  // 03: ranked results.
  await until(`document.querySelector(".mt-table")`);
  await js(`window.__slowMatch = false`);
  const rowSels = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(i => [`row${i}`, `tr[data-row="${i}"]`]));
  await shot("03-results", { table: ".mt-table", head: ".mt-table thead", count: ".mt-count", ruled: "[data-act-ruled]", pill0: 'tr[data-row="0"] .pill', title0: 'tr[data-row="0"] .pt', ...rowSels });

  // 04: top trial opened: toolbar with Explain to patient, summary, criterion-by-criterion evidence.
  await js(`document.querySelector('tr[data-row="0"]').click()`);
  await until(`document.querySelector(".mt-detail")`);
  await js(`document.getElementById("mtMain").scrollTop = 0`);
  const detailSels = { detail: ".mt-detail", actions: ".mt-actions", voice: ".vp-launch", why: ".mt-cols > div:nth-child(2)", crit: ".crit-tbl", row0: 'tr[data-row="0"]' };
  await shot("04-open", detailSels);
  // A tall version of the same state, so the film can pan down the evidence and the "Confirm with patient" list.
  await size(W, 2200);
  await js(`document.getElementById("mtMain").scrollTop = 0`);
  const critRows = await js(`document.querySelectorAll(".crit-tbl tr").length`);
  const critSels = Object.fromEntries([...Array(critRows).keys()].map(i => [`crit${i}`, `.crit-tbl tr:nth-child(${i + 1})`]));
  await shot("04-open-tall", { ...detailSels, ...critSels, confirm: ".mt-cols > div:nth-child(2) ul:last-child", confirmHead: ".mt-cols > div:nth-child(2) h4:last-of-type" });
  await size(W, H);
  await js(`document.getElementById("mtMain").scrollTop = 0`);

  // 05–07: Explain to patient panel: English draft, Spanish, then approved.
  await js(`document.querySelector(".vp-launch").click()`);
  await until(`document.querySelector('.vp textarea[data-field="text"]')`);
  const vpSels = { panel: ".vp", head: ".vp-head", lang: ".vp-lang", es: '[data-lang="es"]', en: '[data-lang="en"]', text: '.vp textarea[data-field="text"]',
    approve: '[data-vp="approve"]', step1: '[data-step="1"]', step2: '[data-step="2"]', step4: '[data-step="4"]', step5: '[data-step="5"]', voice: ".vp-launch" };
  await shot("05-panel-en", vpSels);
  await js(`document.querySelector('[data-lang="es"]').click()`);
  await shot("06-panel-es", vpSels);
  await js(`document.querySelector('[data-vp="approve"]').click()`);
  await until(`document.querySelector('[data-step="1"]').classList.contains("done")`);
  await shot("07-panel-approved", { ...vpSels, play: '[data-vp="play"]' });

  // 08: the patient's-questions step opened: the voice call view (answers only from the trial record).
  await js(`document.querySelector('[data-toggle="4"]').click()`);
  await sleep(200);
  await shot("08-panel-call", { ...vpSels, call: '[data-call="qa"]', orb: '[data-call="qa"] .vp-orb', start: '[data-call="qa"] [data-agent]' });

  writeFileSync(join(OUT, "rects.json"), JSON.stringify({ viewport: { w: W, h: H, dpr: DPR }, rects }, null, 1));
  console.log("wrote rects.json");
  ws.close();
} finally {
  chrome.kill();
}

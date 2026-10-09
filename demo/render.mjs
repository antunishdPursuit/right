// Renders app/static/demo.html to PNG frames with headless Chrome, frame by frame, so motion is smooth
// no matter how fast the machine is. No npm packages: Node 22+ and Google Chrome only.
//   node demo/render.mjs [outDir] [fps] [stillsOnly]
// Encode the frames to MP4 with any tool, e.g. ffmpeg -framerate 60 -i f_%05d.png -pix_fmt yuv420p demo.mp4
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(process.argv[2] || join(ROOT, "demo", "frames"));
const FPS = Number(process.argv[3] || 60);
const STILLS = process.argv[4] ? process.argv[4].split(",").map(Number) : null;  // e.g. "1.5,4.5,6.4"
const PORT = 9333;
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

mkdirSync(OUT, { recursive: true });
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "right-demo-"))}`,
  "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1920,1080", "--no-first-run",
  "--allow-file-access-from-files", "about:blank",
], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));

try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(t => t.type === "page"); } catch {}
  }
  if (!target) throw new Error("Chrome did not start. Set CHROME to its binary path.");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = bad; });
  let id = 0; const waiting = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } };
  const send = (method, params = {}) => new Promise((ok, bad) => {
    waiting.set(++id, m => m.error ? bad(new Error(`${method}: ${m.error.message}`)) : ok(m.result));
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expr => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.value;

  await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send("Page.enable");
  await send("Page.navigate", { url: pathToFileURL(join(ROOT, "app/static/demo.html")).href + "?capture" });
  for (let i = 0; i < 100 && !(await evaluate("window.__ready === true").catch(() => false)); i++) await sleep(100);
  if (!(await evaluate("window.__ready === true"))) throw new Error("demo.html never reported ready");

  const DUR = await evaluate("window.__duration");
  const times = STILLS || Array.from({ length: Math.round(DUR * FPS) }, (_, i) => i / FPS);
  for (const [i, t] of times.entries()) {
    await evaluate(`window.__seek(${t}); new Promise(r => requestAnimationFrame(() => r(1)))`);
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(OUT, STILLS ? `still_${t.toFixed(2)}.png` : `f_${String(i).padStart(5, "0")}.png`), Buffer.from(data, "base64"));
    if (!STILLS && i % FPS === 0) process.stdout.write(`${t}s `);
  }
  console.log(`\n${times.length} frame(s) in ${OUT}`);
  ws.close();
} finally {
  chrome.kill();
}

// Regenerate: node assets/hero.mjs assets/hero.svg && rsvg-convert -z 2 assets/hero.svg -o assets/hero.png
// The README hero: a Claude Code session with the commits.sh band above the
// prompt and the /commits pane docked at the right. Figures are realistic and
// consistent with each other (the pane's session = the band's session).
import fs from "node:fs";

const W = 1202, H = 590;
const C = {
  page: "#09090b", window: "#0c0c0e", chrome: "#141417", line: "#27272a", rule: "#1f1f23",
  fg: "#fafafa", fg2: "#d4d4d8", muted: "#8b8b94", faint: "#52525b",
  green: "#22c55e", greenDim: "#15803d", amber: "#f59e0b", claude: "#d97757",
};
const FONT = "Menlo, 'SF Mono', ui-monospace, monospace";
const CH = 8.43; // Menlo advance at 14px
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const out = [];
const text = (x, y, s, fill = C.fg2, extra = "") => out.push(`<text x="${x}" y="${y}" fill="${fill}" ${extra}>${esc(s)}</text>`);
const rect = (x, y, w, h, fill, extra = "") => out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`);
/** One line of runs: [text, color, bold?]. */
const runs = (x, y, parts) => {
  const spans = parts.map(([s, fill, bold]) => `<tspan fill="${fill}"${bold ? ' font-weight="700"' : ""}>${esc(s)}</tspan>`).join("");
  out.push(`<text x="${x}" y="${y}" xml:space="preserve">${spans}</text>`);
};

// Window
const WX = 1, WY = 1, WW = W - 2, WH = H - 2;
out.push(`<rect x="${WX}" y="${WY}" width="${WW}" height="${WH}" rx="12" fill="${C.window}" stroke="${C.line}"/>`);
out.push(`<path d="M${WX} ${WY + 12}a12 12 0 0 1 12-12h${WW - 24}a12 12 0 0 1 12 12v24h-${WW}z" fill="${C.chrome}"/>`);
rect(WX, WY + 36, WW, 1, C.line);
["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => out.push(`<circle cx="${WX + 20 + i * 20}" cy="${WY + 18}" r="6" fill="${c}"/>`));
text(W / 2, WY + 23, "claude — ~/commit-markets", C.muted, 'text-anchor="middle" font-size="12"');

// Split: transcript | pane
const PX = WX + 760; // pane's left edge
rect(PX, WY + 37, 1, WH - 37, C.line);

// Transcript (left): bullets are shapes, text sits on one indent.
const LX = WX + 28, TX = LX + 20;
const dot = (y, fill) => out.push(`<circle cx="${LX + 5}" cy="${y - 4.5}" r="4" fill="${fill}"/>`);
const tree = (y, s) => { runs(TX, y, [["⎿  ", C.faint], [s, C.muted]]); };
let y = WY + 78;
runs(LX, y, [["> ", C.faint], ["make the For you wall reach every starred repo", C.fg2]]);
y += 36; dot(y, C.green); runs(TX, y, [["Read", C.fg, true], ["(web/src/lib/exploreView.ts)", C.muted]]);
y += 22; tree(y, "Read 144 lines");
y += 32; dot(y, C.claude); runs(TX, y, [["The wall's cursor stops at card 2,712; the pool", C.fg2]]);
y += 22; runs(TX, y, [["holds 2,992. Raising the bound and holding it to", C.fg2]]);
y += 22; runs(TX, y, [["the pool sizes in a test.", C.fg2]]);
y += 32; dot(y, C.green); runs(TX, y, [["Update", C.fg, true], ["(web/src/lib/exploreView.ts)", C.muted]]);
y += 22; tree(y, "MAX_CARD_OFFSET 2_700 → 6_000");
y += 32; dot(y, C.green); runs(TX, y, [["Bash", C.fg, true], ["(npm run test:discovery)", C.muted]]);
y += 22; tree(y, "# pass 1009");
y += 32; dot(y, C.claude); runs(TX, y, [["Every page loads now: 2,992 of 2,992.", C.fg2]]);

// The band: one row above the prompt
const BY = WY + WH - 132;
const band = [
  ["SESSION ", C.faint], ["38.2M ", C.fg, true], ["▁▂▂▅▃▇▅▂▃▆█▅ ", C.green], ["$14.10 est", C.muted],
  ["   TODAY ", C.faint], ["412M", C.fg2],
  ["   CACHE ", C.faint], ["3:41", C.fg2],
  ["   5H ", C.faint], ["62%", C.amber],
];
runs(LX, BY, band);

// Prompt box
const PBY = BY + 16;
out.push(`<rect x="${LX - 8}" y="${PBY}" width="${PX - LX - 20}" height="44" rx="8" fill="none" stroke="${C.line}"/>`);
runs(LX + 6, PBY + 27, [["> ", C.muted]]);
rect(LX + 6 + 2 * CH, PBY + 14, CH, 18, C.fg2);
// Status line
runs(LX, PBY + 72, [["38.2M tok · $14.10 est", C.faint]]);
text(PX - 28, PBY + 72, "? for shortcuts", C.faint, 'text-anchor="end"');

// The pane (right)
const QX = PX + 24, QW = WX + WW - QX - 24;
let q = WY + 74;
runs(QX, q, [["COMMITS.SH", C.fg, true]]);
text(QX + QW, q, "@maxmoneycash", C.muted, 'text-anchor="end"');
q += 16; rect(QX, q, QW, 1, C.rule);

q += 36;
runs(QX, q, [["TODAY ", C.faint], ["412.6M", C.fg, true], [" tok   $187 est   61 turns", C.muted]]);
// hourly bars
q += 16;
const hours = [0, 0, 0, 0, 0, 0, 0, 0.08, 0.22, 0.41, 0.66, 0.52, 0.30, 0.45, 0.78, 1, 0.83, 0.57, 0.36, 0.48, 0.71, 0.0, 0, 0];
const nowHour = 20, bw = QW / 24, maxH = 74;
hours.forEach((v, i) => {
  if (i > nowHour) return;
  if (v <= 0) { rect(QX + i * bw + bw / 2 - 1, q + maxH - 2, 2, 2, C.faint); return; }
  rect(QX + i * bw + 1.5, q + maxH - v * maxH, bw - 3, v * maxH, i === nowHour ? C.green : C.greenDim, 'rx="1.5"');
});
q += maxH + 18;
text(QX, q, "00", C.faint, 'font-size="11"');
text(QX + QW, q, "23", C.faint, 'font-size="11" text-anchor="end"');
q += 14; rect(QX, q, QW, 1, C.rule);

q += 36;
runs(QX, q, [["SESSION ", C.faint], ["38.2M", C.fg, true], [" tok   cache hits 97.9%", C.muted]]);
const models = [["opus-5-5", 36.9, "36.9M"], ["haiku-5-5", 1.3, "1.3M"]];
for (const [name, v, label] of models) {
  q += 30;
  runs(QX, q, [[name.padEnd(11), C.muted], [label.padStart(6), C.fg2]]);
  const bx = QX + 18 * CH, bwid = QW - 18 * CH;
  rect(bx, q - 10, bwid, 8, C.rule, 'rx="2"');
  rect(bx, q - 10, Math.max(3, bwid * (v / 36.9)), 8, C.green, 'rx="2"');
}
q += 22; runs(QX, q, [["prompt cache warm 3:41", C.faint]]);
q += 16; rect(QX, q, QW, 1, C.rule);

q += 36;
for (const [label, pct, reset, color] of [["5H", 62, "2h 14m", C.amber], ["7D", 41, "Fri 9:00", C.green]]) {
  runs(QX, q, [[label, C.faint]]);
  const bx = QX + 4 * CH, bwid = QW - 4 * CH - 16 * CH;
  rect(bx, q - 10, bwid, 8, C.rule, 'rx="2"');
  rect(bx, q - 10, bwid * pct / 100, 8, color, 'rx="2"');
  runs(bx + bwid + 10, q, [[`${pct}%`.padStart(3), C.fg2], [`  ${reset}`, C.faint]]);
  q += 30;
}
q -= 12; rect(QX, q, QW, 1, C.rule);
q += 36;
runs(QX, q, [["ALL AGENTS ", C.faint], ["211.8B", C.fg, true], [" tok   4.4M/min", C.muted]]);
q += 24;
runs(QX, q, [["commits.sh/maxmoneycash", C.green]]);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}" font-size="14">
${out.join("\n")}
</svg>`;
fs.writeFileSync(process.argv[2], svg);

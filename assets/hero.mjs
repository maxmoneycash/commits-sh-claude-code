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

// The band: direction B, powerline pills and solid bars.
const K = { mint: "#7df9aa", navy: "#1c3a5e", blue: "#3b76f0", white: "#f4f4f5", yellow: "#fcf392", teal: "#8dfbd2", ink: "#09090b", green: "#50fa7b", orange: "#ffa500", red: "#ff4646", track: "#2e2e33", dim: "#8b8b94" };
const pill = (x, y, s, bg, fg) => { const w = [...s].length * CH; out.push(`<rect x="${x}" y="${y - 15}" width="${w}" height="21" rx="2" fill="${bg}"/>`); runs(x, y, [[s, fg, true]]); return x + w; };
const sbar = (x, y, pct, cells, color) => { const w = cells * CH, f = Math.round(pct / 100 * cells) * CH; rect(x, y - 13, w, 16, K.track, 'rx="2"'); rect(x, y - 13, f, 16, color, 'rx="2"'); return x + w; };
const BY = WY + WH - 132;
{
  let x = LX;
  x = pill(x, BY, " ◆ commits.sh ", K.mint, K.navy) + CH;
  x = pill(x, BY, " 38.2M tok ", K.blue, K.white) + CH;
  x = pill(x, BY, " $14.10 ", K.yellow, K.ink) + CH;
  x = pill(x, BY, " ⏱ 3:41 ", K.teal, K.ink) + 3 * CH;
  runs(x, BY, [["5H ", K.dim]]); x += 3 * CH;
  x = sbar(x, BY, 62, 10, K.orange); runs(x, BY, [[" 62%", K.orange, true]]); x += 7 * CH;
  runs(x, BY, [["7D ", K.dim]]); x += 3 * CH;
  x = sbar(x, BY, 41, 10, K.green); runs(x, BY, [[" 41%", K.green, true]]);
}

// Prompt box
const PBY = BY + 16;
out.push(`<rect x="${LX - 8}" y="${PBY}" width="${PX - LX - 20}" height="44" rx="8" fill="none" stroke="${C.line}"/>`);
runs(LX + 6, PBY + 27, [["> ", C.muted]]);
rect(LX + 6 + 2 * CH, PBY + 14, CH, 18, C.fg2);
// Status line
runs(LX, PBY + 72, [["38.2M tok · $14.10 est", C.faint]]);
text(PX - 28, PBY + 72, "? for shortcuts", C.faint, 'text-anchor="end"');

// The pane (right): the same vocabulary.
const QX = PX + 24, QW = WX + WW - QX - 24;
let q = WY + 76;
{ const x = pill(QX, q, " ◆ commits.sh ", K.mint, K.navy) + CH; pill(x, q, " @maxmoneycash ", K.blue, K.white); }
q += 44;
{ runs(QX, q, [["TODAY  ", K.dim]]); let x = QX + 7 * CH; x = pill(x, q, " 412.6M tok ", K.blue, K.white) + CH; x = pill(x, q, " $187 ", K.yellow, K.ink); runs(x + CH, q, [["61 turns", K.dim]]); }
q += 14;
const hours = [0, 0, 0, 0, 0, 0, 0, 0.08, 0.22, 0.41, 0.66, 0.52, 0.30, 0.45, 0.78, 1, 0.83, 0.57, 0.36, 0.48, 0.71, 0, 0, 0];
const nowHour = 20, bw = QW / 24, maxH = 70;
hours.forEach((v, i) => {
  if (i > nowHour) return;
  const h = Math.max(3, v * maxH);
  rect(QX + i * bw + 1.5, q + maxH - h, bw - 3, h, v <= 0 ? K.track : i === nowHour ? K.green : "#2fbf5f", 'rx="2"');
});
q += maxH + 16;
text(QX, q, "00", K.dim, 'font-size="11"'); text(QX + QW, q, "23", K.dim, 'font-size="11" text-anchor="end"');
q += 14; rect(QX, q, QW, 1, C.rule);
q += 32;
{ runs(QX, q, [["SESSION  ", K.dim]]); let x = QX + 9 * CH; x = pill(x, q, " 38.2M tok ", K.blue, K.white) + CH; x = pill(x, q, " $14.10 ", K.yellow, K.ink) + CH; pill(x, q, " ⏱ 3:41 ", K.teal, K.ink); }
for (const [name, v, label] of [["opus-5-5", 36.9, "36.9M"], ["haiku-5-5", 1.3, "1.3M"]]) {
  q += 28;
  runs(QX, q, [[name.padEnd(11), K.dim], [label.padStart(6), C.fg, true]]);
  sbar(QX + 19 * CH, q, v / 36.9 * 100, Math.floor((QW - 19 * CH) / CH), K.blue);
}
q += 26; runs(QX, q, [["cache hits  ", K.dim], ["97.9%", K.teal, true]]);
q += 16; rect(QX, q, QW, 1, C.rule);
q += 32;
for (const [label, pct, reset, color] of [["5H", 62, "2h 14m", K.orange], ["7D", 41, "Fri 9:00", K.green]]) {
  runs(QX, q, [[label + " ", K.dim]]);
  const x = sbar(QX + 3 * CH, q, pct, 24, color);
  runs(x, q, [[` ${pct}%`, color, true], [`  ${reset}`, K.dim]]);
  q += 28;
}
q -= 12; rect(QX, q, QW, 1, C.rule);
q += 32;
{ runs(QX, q, [["ALL AGENTS  ", K.dim]]); const x = pill(QX + 12 * CH, q, " 211.8B tok ", K.mint, K.navy); runs(x + CH, q, [["4.4M/min", K.dim]]); }
q += 28; runs(QX, q, [["commits.sh/maxmoneycash", K.green]]);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}" font-size="14">
${out.join("\n")}
</svg>`;
fs.writeFileSync(process.argv[2], svg);

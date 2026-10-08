import gifenc from "gifenc";
import { SALE } from "../sale.js";

const { GIFEncoder } = gifenc; // CommonJS package: no named imports from ESM

// GET /api/public/countdown → an animated GIF of the time left in the sale
// (api/_lib/sale.js), for emails: they cannot run a script, so the countdown is
// an image drawn at the moment the email is opened, ticking for 60 seconds
// and then stopping on its last frame (the usual email-countdown technique).
// Reopening the email fetches a fresh one. After the sale, a still 00 00 00 00.
//
// Drawn by hand, no canvas: rose boxes, seven-segment digits, a 5×7 pixel
// font for the unit labels. Rendered at twice the display size (the email sets
// width/height to half), so the client's own downscaling smooths the edges.

const S = 2; // render scale
const BOX_W = 62 * S, BOX_H = 64 * S, GAP = 10 * S, RADIUS = 10 * S;
export const COUNTDOWN_W = 4 * 62 + 3 * 10; // display size, used by the email
export const COUNTDOWN_H = 64;
const W = COUNTDOWN_W * S, H = COUNTDOWN_H * S;
const FRAMES = 60;

const BOX = 1, DIGIT = 2, LABEL = 3, SAME = 4; // 0 = white background
// SAME is the transparent index: after the first frame, every pixel that did
// not change is written as SAME and left showing the previous frame (dispose
// 1), so a frame costs only the digits that moved — about 3 KB instead of 3 MB.
const PALETTE = [[255, 255, 255], [216, 53, 74], [255, 255, 255], [255, 214, 220], [0, 255, 0]];

// Seven segments: a top, b top-right, c bottom-right, d bottom, e bottom-left,
// f top-left, g middle.
const SEGMENTS = ["abcdef", "bc", "abged", "abgcd", "fgbc", "afgcd", "afgedc", "abc", "abcdefg", "abcdfg"];
const DW = 36, DH = 60, T = 8; // digit cell and stroke, render pixels

const FONT = {
  J: ["..###", "...#.", "...#.", "...#.", "#..#.", "#..#.", ".##.."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  N: ["#...#", "##..#", "#.#.#", "#.#.#", "#..##", "#...#", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
};
const PX = 3; // font pixel size, render pixels

function rect(buf, x, y, w, h, c) {
  for (let j = Math.max(0, y); j < Math.min(H, y + h); j++) buf.fill(c, j * W + Math.max(0, x), j * W + Math.min(W, x + w));
}

function roundedBox(buf, x, y) {
  for (let j = 0; j < BOX_H; j++) {
    for (let i = 0; i < BOX_W; i++) {
      const cx = i < RADIUS ? RADIUS - i : i >= BOX_W - RADIUS ? i - (BOX_W - RADIUS - 1) : 0;
      const cy = j < RADIUS ? RADIUS - j : j >= BOX_H - RADIUS ? j - (BOX_H - RADIUS - 1) : 0;
      if (cx * cx + cy * cy <= RADIUS * RADIUS) buf[(y + j) * W + x + i] = BOX;
    }
  }
}

function digit(buf, x, y, n) {
  const on = SEGMENTS[n];
  const half = Math.floor(DH / 2);
  const seg = {
    a: [x + T, y, DW - 2 * T, T],
    d: [x + T, y + DH - T, DW - 2 * T, T],
    g: [x + T, y + half - T / 2, DW - 2 * T, T],
    f: [x, y + T, T, half - T - T / 2 + 1],
    b: [x + DW - T, y + T, T, half - T - T / 2 + 1],
    e: [x, y + half + T / 2, T, half - T - T / 2],
    c: [x + DW - T, y + half + T / 2, T, half - T - T / 2],
  };
  for (const s of on) rect(buf, ...seg[s], DIGIT);
}

function label(buf, cx, y, text) {
  const w = text.length * 6 * PX - PX;
  let x = Math.round(cx - w / 2);
  for (const ch of text) {
    FONT[ch].forEach((row, j) => [...row].forEach((p, i) => { if (p === "#") rect(buf, x + i * PX, y + j * PX, PX, PX, LABEL); }));
    x += 6 * PX;
  }
}

function frame(msLeft) {
  const buf = new Uint8Array(W * H); // all background (0)
  const s = Math.max(0, Math.floor(msLeft / 1000));
  const values = [Math.min(99, Math.floor(s / 86400)), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
  ["J", "H", "MIN", "S"].forEach((unit, k) => {
    const x = k * (BOX_W + GAP);
    roundedBox(buf, x, 0);
    const pairW = 2 * DW + 6 * S;
    const dx = x + Math.round((BOX_W - pairW) / 2);
    const v = values[k];
    digit(buf, dx, 9 * S, Math.floor(v / 10));
    digit(buf, dx + DW + 6 * S, 9 * S, v % 10);
    label(buf, x + BOX_W / 2, 46 * S, unit);
  });
  return buf;
}

export function countdownGif(now = Date.now()) {
  const left = SALE.endsAt - now;
  const gif = GIFEncoder();
  const n = left > 0 ? Math.min(FRAMES, Math.ceil(left / 1000)) : 1;
  let prev = null;
  for (let i = 0; i < n; i++) {
    const cur = frame(left - i * 1000);
    if (!prev) {
      // repeat -1: play once and stay on the last frame, rather than jumping back.
      gif.writeFrame(cur, W, H, { palette: PALETTE, delay: 1000, repeat: -1, colorDepth: 3, dispose: 1 });
    } else {
      const diff = cur.map((v, k) => (v === prev[k] ? SAME : v));
      gif.writeFrame(diff, W, H, { delay: 1000, colorDepth: 3, dispose: 1, transparent: true, transparentIndex: SAME });
    }
    prev = cur;
  }
  gif.finish();
  return Buffer.from(gif.bytes());
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  // Never cached: the image is only right at the moment it is drawn.
  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Expires", "0");
  res.status(200).send(countdownGif());
}

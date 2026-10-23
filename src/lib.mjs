// 공용 도우미
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE } from './data.mjs';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const won = n => Number(n).toLocaleString('ko-KR') + '원';
export const nl2br = s => esc(s).replace(/\n/g, '<br>');

// 페이지 출력 경로(예: services/motorcycle/index.html) 기준 상대 경로
export function makeUrl(outPath) {
  const depth = outPath.split('/').length - 1;
  const prefix = depth ? '../'.repeat(depth) : './';
  return to => {
    if (/^(https?:|mailto:|tel:|sms:|#|\/\/)/.test(to)) return to;
    const p = to.replace(/^\//, '');
    return p === '' ? prefix : prefix + p;
  };
}
// 출력 경로 → 공개 주소
export const pageUrl = outPath => SITE.url + outPath.replace(/index\.html$/, '');

export const jsonld = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;


export const kdate = d => { const [y, m, dd] = d.split('-'); return `${y}.${m}.${dd}`; };

// ── 사진: assets/img/<dir>/<file> 의 실제 크기를 읽어 width·height를 붙인다(레이아웃 흔들림 방지) ──
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sizeCache = new Map();
export function webpSize(rel) {
  if (sizeCache.has(rel)) return sizeCache.get(rel);
  const b = fs.readFileSync(path.join(ROOT, rel));
  const fmt = b.toString('ascii', 12, 16);
  let wh;
  if (b[0] === 0xff && b[1] === 0xd8) { // JPEG: SOF 마커에서 크기
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1], len = b.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) { wh = [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; break; }
      i += 2 + len;
    }
  } else if (b.toString('ascii', 1, 4) === 'PNG') wh = [b.readUInt32BE(16), b.readUInt32BE(20)];
  else if (fmt === 'VP8 ') wh = [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  else if (fmt === 'VP8L') wh = [1 + (((b[22] & 0x3f) << 8) | b[21]), 1 + (((b[24] & 0xf) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6))];
  else if (fmt === 'VP8X') wh = [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (!wh) throw new Error('이미지 크기를 읽지 못함: ' + rel);
  sizeCache.set(rel, wh);
  return wh;
}
// u: 상대 경로 함수, rel: assets/ 부터의 경로(WebP)
export function img(u, rel, alt, { cls = '', lazy = true, priority = false, sizes = '' } = {}) {
  const [w, h] = webpSize(rel);
  return `<img src="${u(rel)}" alt="${esc(alt)}" width="${w}" height="${h}"${cls ? ` class="${cls}"` : ''}${lazy && !priority ? ' loading="lazy"' : ''} decoding="async"${priority ? ' fetchpriority="high"' : ''}${sizes ? ` sizes="${sizes}"` : ''}>`;
}
// 스켈레톤 자리(.ph) 안의 사진 — 받는 동안 반짝이는 회색 칸
export const phImg = (u, rel, alt, o = {}) => `<div class="ph${o.wrapCls ? ' ' + o.wrapCls : ''}">${img(u, rel, alt, o)}</div>`;
// 한글 문장을 스크롤 단어 밝힘용 <span class="w">로 나눈다. **강조** 는 hl
export function words(s) {
  return s.split(/(\*\*[^*]+\*\*)/).flatMap(part => {
    const hl = /^\*\*/.test(part);
    return part.replace(/\*\*/g, '').split(/\s+/).filter(Boolean).map(w => `<span class="w${hl ? ' hl' : ''}">${esc(w)}</span>`);
  }).join(' ');
}

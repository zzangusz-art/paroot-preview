// 대학로 연극 가이드 글(content/blog/*.md) 읽기: 머리말 파싱 + 마크다운(필요한 만큼만) → HTML, 목차·FAQ 추출
import fs from 'node:fs';
import path from 'node:path';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function parseFrontmatter(src) {
  const m = src.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error('머리말(---)이 없습니다');
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  meta.tags = (meta.tags || '').split(',').map(t => t.trim()).filter(Boolean);
  return { meta, body: m[2].trim() };
}

// 사이트 안 링크로 허용하는 경로(사이트 루트 기준)
const INTERNAL = /^(shows\/([a-z0-9-]+\/)?|about\/|notice\/|visit\/|news\/|contact\/|faq\/|blog\/([a-z0-9-]+\/)?)(#[a-z0-9-]+)?$|^#[a-z0-9-]+$/i;
export const isInternal = href => INTERNAL.test(href) || href === '';

// 인라인: **굵게**, [링크](주소). link(href) 로 상대 경로를 만든다
function inline(t, link) {
  let s = esc(t);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, href) => {
    const h = href.replace(/&amp;/g, '&');
    if (/^https?:\/\//.test(h)) return `<a href="${esc(h)}" target="_blank" rel="noopener">${txt}</a>`;
    if (!isInternal(h)) return txt;
    return `<a href="${esc(link(h))}">${txt}</a>`;
  });
  return s;
}

export function renderMarkdown(md, link = h => h) {
  const lines = md.replace(/\r/g, '').split('\n');
  const out = [], toc = [];
  let i = 0, h2 = 0, para = [];
  const flush = () => { if (para.length) out.push(`<p>${inline(para.join(' '), link)}</p>`); para = []; };
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { flush(); i++; continue; }
    let m;
    if ((m = l.match(/^##\s+(.+)/)) && !l.startsWith('###')) {
      flush(); const id = 'h-' + (++h2); toc.push({ id, t: m[1].trim() });
      out.push(`<h2 id="${id}">${inline(m[1].trim(), link)}</h2>`); i++; continue;
    }
    if ((m = l.match(/^###\s+(.+)/))) { flush(); out.push(`<h3>${inline(m[1].trim(), link)}</h3>`); i++; continue; }
    if (/^>\s?/.test(l)) {
      flush(); const q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${inline(q.join(' '), link)}</blockquote>`); continue;
    }
    if (/^\|.*\|\s*$/.test(l)) {
      flush(); const rows = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) rows.push(lines[i++]);
      const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(rows[0]); const body = rows.slice(/^\|\s*:?-{2,}/.test(rows[1] || '') ? 2 : 1).map(cells);
      out.push(`<div class="tbl-scroll"><table class="tbl"><thead><tr>${head.map(c => `<th scope="col">${inline(c, link)}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${r.map((c, j) => j === 0 ? `<th scope="row">${inline(c, link)}</th>` : `<td>${inline(c, link)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(l) || /^\s*\d+[.)]\s+/.test(l)) {
      flush(); const ordered = /^\s*\d+[.)]\s+/.test(l), items = [];
      while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/).test(lines[i])) items.push(lines[i++].replace(/^\s*(?:[-*]|\d+[.)])\s+/, ''));
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.map(t => `<li>${inline(t, link)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }
    para.push(l.trim()); i++;
  }
  flush();
  return { html: out.join('\n'), toc };
}

// "## 자주 묻는 질문" 아래 "### Q. 질문" + 답 → FAQ
export function splitFaq(body) {
  const m = body.match(/\n##\s+자주 묻는 질문\s*\n([\s\S]*?)(?=\n##\s|$)/);
  if (!m) return { body, faq: [] };
  const faq = [];
  for (const part of m[1].split(/(?:^|\n)\s*###\s+/).map(s => s.trim()).filter(Boolean)) {
    const [qLine, ...rest] = part.split('\n');
    const q = qLine.replace(/^Q[.:]\s*/, '').trim();
    const a = rest.join(' ').replace(/\s+/g, ' ').trim().replace(/^A[.:]\s*/, '');
    if (q && a) faq.push({ q, a });
  }
  return { body: body.replace(m[0], '\n'), faq };
}

// 글 목록(최신순). 미래 날짜 글은 빌드에 넣지 않는다(예약 발행)
export function loadPosts(dir, { today } = {}) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.md') && !f.startsWith('_')).map(f => {
    const { meta, body } = parseFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const k of ['title', 'description', 'slug', 'date', 'category']) if (!meta[k]) throw new Error(`${f}: ${k} 누락`);
    const { body: main, faq } = splitFaq(body);
    const chars = body.replace(/\s+/g, '').length;
    return { ...meta, file: f, main, faq, minutes: Math.max(2, Math.ceil(chars / 500)), chars };
  }).filter(p => !today || p.date <= today)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.time || '').localeCompare(a.time || '') || a.slug.localeCompare(b.slug)));
}

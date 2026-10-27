// 파릇 「대학로 연극 가이드」 — AI 글 자동 작성기 (GitHub Actions가 하루 3번 실행: 09:05 · 13:05 · 18:05 KST)
// 사용:
//   node tools/blog-ai/generate.mjs              다음 주제 1편 작성 → 검증 통과 시 content/blog/<slug>.md 로 발행
//   node tools/blog-ai/generate.mjs --count 3    3편 연속 작성
//   node tools/blog-ai/generate.mjs --topic id   특정 주제
//   node tools/blog-ai/generate.mjs --check      API 호출 없이 기존 글 전체를 같은 검증기로 검사
// 남은 주제(todo)가 6개 아래로 떨어지면 기존 글과 겹치지 않는 새 주제를 AI에게 받아 대기열에 보충한다.
// 검증에 실패한 글은 발행하지 않고 content/drafts/ 에 남긴다(사람이 고쳐서 content/blog/ 로 옮기면 발행).
// (퀵서비스다·미래애드원 발행기를 바탕으로, 사실 목록·금지어·주제를 파릇에 맞게 바꿨다)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, loadPosts, isInternal } from '../blog/lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BLOG = path.join(ROOT, 'content/blog');
const DRAFTS = path.join(ROOT, 'content/drafts');
const TOPICS = path.join(BLOG, '_topics.json');
const MODEL = process.env.BLOG_MODEL || 'claude-opus-5-5';
const args = process.argv.slice(2);
const flag = n => args.includes(n);
const opt = n => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : null; };

const D = await import('../../src/data.mjs');
const { SITE, SHOWS, VENUES, RULES, FAQ, HISTORY, AWARDS, TOUR_CITIES, BLOG_CATEGORIES, ASOF_LABEL, venueOf, priceFrom, totalReviews, avgRating, NOTICES, noticePeriod } = D;
const won = n => n.toLocaleString('ko-KR') + '원';
const RULE_NAME = { play: '연극', kids: '어린이 뮤지컬', drag: '드랙인혜화' };

// ── 사실 목록: 사이트 데이터(src/data.mjs)에서만 만든다. 순서를 고정해 프롬프트 캐시가 유지되게 한다
export function factSheet() {
  const L = [];
  L.push(`[회사] ${SITE.name}(${SITE.nameEn}, ${SITE.en}). 서울 종로구 대학로(혜화)의 공연 제작사. 2016년 어린이뮤지컬 기획으로 시작. 슬로건 "${SITE.tagline}" 대표전화 ${SITE.phone}, 공연·제휴 문의 ${SITE.email}, 오디션 ${SITE.audition}. 주소 ${SITE.address.full}.`);
  L.push(`[현재 공연] ${SHOWS.length}편: ${SHOWS.map(s => `${s.title}(${s.kind})`).join(', ')}. 네이버 예약 관람평 합계 ${totalReviews().toLocaleString('ko-KR')}건, 관람평 수로 가중한 평균 ${avgRating().toFixed(2)}점(${ASOF_LABEL} 기준).`);
  for (const s of SHOWS) {
    const v = venueOf(s);
    L.push(`[공연:${s.title}] ${s.full}${s.original ? ` — 원작 「${s.original}」` : ''}. 장르 ${s.genre}. ${s.lead} 한 줄 소개: ${s.hook}`);
    L.push(`[공연:${s.title} 줄거리] ${s.synopsis.replace(/\n+/g, ' ')}`);
    L.push(`[공연:${s.title} 특징] ${s.points.map(([t, d]) => `${t} — ${d}`).join(' / ')}`);
    L.push(`[공연:${s.title} 정보] 공연장 ${v.name}${v.alias ? `(${v.alias})` : ''}, ${v.addr}, 혜화역 ${v.exit}번 출구 — ${v.walk}. ${s.sinceLabel}. 공연 시간 ${s.runtime}분. 관람 연령 ${s.age}. 회차: ${s.schedule.map(([d, t]) => `${d} ${t}`).join(' / ')}. ${s.scheduleNote}${s.credits ? ` ${s.credits}.` : ''}`);
    L.push(`[공연:${s.title} 가격(네이버 예약, ${ASOF_LABEL})] ${s.prices.map(p => `${p.name} ${won(p.price)}${p.note ? `(${p.note})` : ''}`).join(', ')}. 정가 ${won(Math.max(...s.prices.map(p => p.normal)))}. 조건 없는 가장 낮은 일반 가격 ${won(priceFrom(s))}.`);
    if (s.rating) L.push(`[공연:${s.title} 관람평] 네이버 예약 평균 ${s.rating.avg}점, ${s.rating.count.toLocaleString('ko-KR')}건(${s.rating.asof} 기준). 점수 분포 5점 ${s.rating.dist[5]}건, 4점대 ${s.rating.dist[4]}건, 3점대 ${s.rating.dist[3]}건, 2점대 ${s.rating.dist[2]}건, 1점대 ${s.rating.dist[1]}건.${s.voted.length ? ` 관객 키워드 투표: ${s.voted.map(([k, n]) => `"${k}" ${n}`).join(', ')}.` : ''}${s.rating.note ? ` ${s.rating.note}.` : ''}`);
    for (const r of s.reviews) L.push(`[공연:${s.title} 관람평 원문] ${r.who}(${r.date}, ${r.score}점): "${r.body.replace(/\s*\n+\s*/g, ' ')}"`);
    L.push(`[공연:${s.title} 예매] 네이버 예약 ${s.booking.url}${s.booking.phone ? `, 문의 ${s.booking.phone}` : ''}${s.booking.operator ? `, 예매처 운영 ${s.booking.operator}` : ''}. 사이트 안 상세 페이지 경로 shows/${s.slug}/`);
    for (const f of s.faq) L.push(`[공연:${s.title} FAQ] ${f.q} → ${f.a}`);
  }
  for (const [k, l] of Object.entries(RULES)) L.push(`[관람 규정:${RULE_NAME[k]}] ${l.join(' ')}`);
  for (const v of VENUES) L.push(`[공연장] ${v.name}${v.alias ? `(${v.alias})` : ''}: ${v.addr}. 혜화역 ${v.exit}번 출구 — ${v.walk}. 주차 시설 없음. 상영 작품: ${SHOWS.filter(s => s.venue === v.id).map(s => s.title).join(', ')}.`);
  for (const a of AWARDS) L.push(`[수상·성과] ${a.t}: ${a.d} (${a.src})`);
  L.push(`[한뼘사이 지역 공연 도시] ${TOUR_CITIES.join(', ')}. 초청 공연: 삼성전자, 포항 POSCO, 건양대학교, 광양제철소(2025년 1월, 관객 1,145명).`);
  for (const h of HISTORY) L.push(`[연혁 ${h.year}] ${h.items.map(([d, t]) => `${d} ${t}`).join(' / ')}`);
  for (const f of FAQ) L.push(`[FAQ] ${f.q} → ${f.a}`);
  // 공지사항·이벤트 게시판의 이벤트(기간 포함). 글에서는 notice/#<id> 로 연결
  for (const n of NOTICES.filter(x => x.cat === 'event')) L.push(`[이벤트:${n.title.replace(/[「」]/g, '')}] 기간 ${n.start ? `${n.start}~` : ''}${n.end || '상시'}(${noticePeriod(n)}). ${n.summary} ${n.body.join(' ')} 상세 notice/#${n.id}`);
  return L.join('\n');
}
function allowedNumbers(sheet) {
  const set = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '2026', '2027', '1997', '97']);
  for (const m of sheet.matchAll(/\d[\d,]*(?:\.\d+)?/g)) set.add(m[0].replace(/,/g, ''));
  return set;
}

// 다른 제작사 공연·예매처 순위 등 — 이름을 쓰지 않는다(비교·폄하 분쟁 방지)
const OTHERS = ['옥탑방 고양이', '옥탑방고양이', '쉬어매드니스', '오백에 삼십', '오백에삼십', '김종욱 찾기', '김종욱찾기', '보잉보잉', '룸넘버13', '그놈은 멋있었다', '701호', '운빨 로맨스', '운빨로맨스', '내가하면 로맨스', '서툰 사람들', '늘근도둑', '스페셜 라이어', '튜즈데이', '나의 PS 파트너', '죽여주는 이야기', '연애하기 좋은 날', '극적인 하룻밤', '인터파크 1위', '예매율 1위'];
const BANNED = [
  [/최고의|최상의|업계 ?1위|국내 ?1위|대학로 ?1위|유일한|유일하게|단연|압도적|완벽한|완벽하게|혁신적인|놀라운|무조건|100% ?보장|100% ?만족|강력 ?추천합니다/, '최상급·과장 표현'],
  [/보장합니다|후회하지 않으실|실패 없는|절대 (?:후회|실패)/, '보장성 단정'],
  [/알아보겠습니다|살펴보겠습니다|결론적으로|요약하자면|꿀팁|정리해 ?드리겠습니다|에 대해 알아|소개해 ?드리겠습니다|🙂|😊|👍|✨|💡|🎭|❤️/, '상투 표현·이모지'],
  [/디시|더쿠|갤러리에서/, '커뮤니티 이름'],
];
const UNITS = /(\d[\d,]*(?:\.\d+)?)\s*(원|분|시간|시|%|개월|개|일|명|건|편|년|월|세|층|회|곳|점|km|m)/g;

function validate(md, { allowed, slugs }) {
  const errs = [];
  let meta, body;
  try { ({ meta, body } = parseFrontmatter(md)); } catch (e) { return { ok: false, errs: ['머리말 형식 오류: ' + e.message] }; }
  for (const k of ['title', 'description', 'slug', 'category', 'tags', 'keyword']) if (!meta[k] || (Array.isArray(meta[k]) && !meta[k].length)) errs.push(`머리말 ${k} 누락`);
  if (meta.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.slug)) errs.push('slug는 영문 소문자·숫자·하이픈만');
  if (meta.slug && slugs.has(meta.slug)) errs.push(`이미 있는 slug: ${meta.slug}`);
  if (meta.category && !BLOG_CATEGORIES.includes(meta.category)) errs.push(`category는 ${BLOG_CATEGORIES.join('/')} 중 하나`);
  if (meta.show && !SHOWS.some(s => s.slug === meta.show)) errs.push(`show는 공연 slug(${SHOWS.map(s => s.slug).join(', ')}) 또는 빈칸`);
  if (meta.title && (meta.title.length < 12 || meta.title.length > 60)) errs.push(`제목은 12~60자(현재 ${meta.title.length}자)`);
  if (meta.description && (meta.description.length < 40 || meta.description.length > 150)) errs.push(`설명은 40~150자(현재 ${meta.description.length}자)`);
  if (meta.keyword && meta.title && !meta.title.replace(/\s/g, '').includes(meta.keyword.replace(/\s/g, ''))) errs.push(`대표 키워드 "${meta.keyword}"가 제목에 없음`);
  const first = (body || '').split(/\n\s*\n/)[0] || '';
  if (meta.keyword && !first.replace(/\s/g, '').includes(meta.keyword.replace(/\s/g, ''))) errs.push(`대표 키워드 "${meta.keyword}"가 첫 문단에 없음`);
  const len = (body || '').replace(/\s+/g, '').length;
  if (len < 900 || len > 4500) errs.push(`본문 길이 ${len}자(공백 제외) — 900~4,500자`);
  if (!/\n##\s+자주 묻는 질문/.test('\n' + body)) errs.push('"## 자주 묻는 질문" 섹션 없음');
  if ((body.match(/\n###\s+Q\./g) || []).length < 2) errs.push('FAQ 질문(### Q.) 2개 이상 필요');
  if ((body.match(/^##\s/mg) || []).length < 4) errs.push('## 소제목 4개 이상 필요(FAQ 포함)');
  for (const [re, why] of BANNED) { const m = md.match(re); if (m) errs.push(`금지 표현(${why}): "${m[0]}"`); }
  for (const c of OTHERS) if (body.includes(c)) errs.push(`다른 공연·예매처 순위 언급: ${c}`);
  for (const m of body.matchAll(/(?<![\d-])0\d{1,2}-\d{3,4}-\d{4}/g)) if (![SITE.phone, ...SHOWS.map(s => s.booking.phone)].includes(m[0])) errs.push(`사실 목록에 없는 전화번호: ${m[0]}`);
  for (const m of md.matchAll(/https?:\/\/[^\s)]+/g)) errs.push(`외부 링크 금지: ${m[0]}`);
  for (const m of body.matchAll(/\]\(([^)\s]+)\)/g)) if (!/^https?:/.test(m[1]) && !isInternal(m[1])) errs.push(`허용되지 않은 내부 링크: ${m[1]}`);
  for (const m of body.matchAll(/\]\(blog\/([a-z0-9-]+)\/\)/g)) if (!slugs.has(m[1]) && !fs.existsSync(path.join(BLOG, `${m[1]}.md`))) errs.push(`없는 글 링크: blog/${m[1]}/`);
  const unknown = new Set();
  for (const m of body.matchAll(UNITS)) { const n = m[1].replace(/,/g, ''); if (!allowed.has(n)) unknown.add(m[0]); }
  if (unknown.size) errs.push(`사실 목록에 없는 수치: ${[...unknown].join(', ')}`);
  return { ok: errs.length === 0, errs, meta, len };
}

// 제목 유사도(문자 2-gram 자카드) — 같은 주제 반복 방지
const grams = s => { const t = s.replace(/\s+/g, ''); const g = new Set(); for (let i = 0; i < t.length - 1; i++) g.add(t.slice(i, i + 2)); return g; };
const sim = (a, b) => { const A = grams(a), B = grams(b); let n = 0; A.forEach(x => B.has(x) && n++); return n / Math.max(1, A.size + B.size - n); };

const LINKS = ['shows/', 'visit/', 'faq/', 'about/', 'contact/', 'news/', 'notice/', ...SHOWS.map(s => `shows/${s.slug}/`)];
const SYSTEM = sheet => `당신은 대학로 공연 제작사 "파릇"(주식회사 파릇) 홈페이지의 「대학로 연극 가이드」 담당 에디터입니다. 대학로·혜화에서 공연을 보려는 사람이 검색창이나 AI 비서에게 묻는 질문에, 파릇이 직접 확인한 사실로 답하는 글을 씁니다. 독자는 데이트 코스를 찾는 20~30대, 친구 모임, 아이와 처음 공연을 보는 부모, 연극이 처음인 사람입니다.

# 반드시 지킬 것
- 아래 [사실 목록]에 있는 내용만 사실로 씁니다. 목록에 없는 가격·시간·통계·순위·후기·배우 이름·사례를 만들지 않습니다.
- 대학로 일반(맛집, 거리, 다른 극장, 교통 시간 등)에 대해 사실 목록에 없는 정보를 단정하지 않습니다. 쓰더라도 "직접 확인하세요" 수준으로만 씁니다.
- 다른 제작사의 공연 이름, 예매처 순위, 커뮤니티 이름을 쓰지 않습니다. 다른 공연을 깎아내리지 않습니다. 파릇 공연을 소개할 때는 "파릇 공연 기준"임을 밝힙니다.
- 최상급·과장 표현(최고, 1위, 유일, 완벽, 무조건, 보장, 후회하지 않으실)과 상투 표현(알아보겠습니다, 결론적으로, 꿀팁, 소개해 드리겠습니다), 이모지를 쓰지 않습니다.
- 가격과 회차는 바뀔 수 있으니 "${ASOF_LABEL} 네이버 예약 기준"을 함께 씁니다. 관람평을 인용할 때는 원문을 고치지 않고 짧게 인용하며 출처(네이버 예약 관람평)를 밝힙니다.

# 문체
- 존댓말 "-습니다/-입니다"체. 한 문장은 짧게, 한 문단은 2~4문장.
- 첫 문단에서 질문에 바로 답합니다(결론 먼저). 대표 키워드를 첫 문단과 제목에 자연스럽게 한 번씩 넣고, 본문에서 억지로 반복하지 않습니다.
- 비교는 마크다운 표로 씁니다. 목록은 꼭 필요할 때만.
- 공연기획팀 직원이 관객에게 설명하듯 구체적으로. 같은 문장 구조를 반복하지 않고, 문단을 "~하는 것이 중요합니다" 같은 말로 끝내지 않습니다.
- 내부 링크는 다음 경로만 씁니다(사이트 루트 기준, 앞에 / 없이): ${LINKS.join(', ')}, 그리고 이미 발행된 글 blog/<slug>/. 외부 링크와 전화번호 링크는 쓰지 않습니다.

# 출력 형식 (이 형식 외의 말은 출력하지 않습니다)
---
title: (12~60자, 대표 키워드를 포함하고 검색 질문이 드러나게)
description: (40~150자, 글의 답을 한 문장으로)
slug: (영문 소문자-하이픈, 주제 뜻이 드러나게)
category: (${BLOG_CATEGORIES.join(' | ')} 중 하나)
tags: (쉼표로 구분 3~5개)
keyword: (대표 키워드 1개)
show: (주로 다루는 파릇 공연 slug — ${SHOWS.map(s => s.slug).join(' | ')} — 없으면 비움)
---
(첫 문단: 질문에 대한 답, 대표 키워드 포함)

## (소제목 3~5개, 질문형 소제목을 1개 이상 섞기)
...

## 자주 묻는 질문

### Q. (질문)
(답 1~3문장)

### Q. (질문)
(답 1~3문장)

본문은 공백 제외 1,200~2,600자로 씁니다.

[사실 목록]
${sheet}`;

function userMsg(topic, posts, today) {
  return `오늘 날짜: ${today}
주제 ID: ${topic.id}
주제: ${topic.title}
대표 키워드: ${topic.keyword}
다룰 방향: ${topic.angle}
함께 쓸 검색어: ${(topic.keywords || []).join(', ')}
권장 카테고리: ${topic.category}
관련 공연: ${topic.show || '없음'}

이미 발행된 글(내용·제목이 겹치지 않게 하고, 관련 있으면 내부 링크로 연결):
${posts.slice(0, 80).map(p => `- ${p.title} [${p.keyword || ''}] → blog/${p.slug}/`).join('\n') || '- 없음'}

위 형식대로 글 한 편을 써 주세요.`;
}

async function callClaude(client, system, messages, maxTokens = 16000) {
  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default', // 안전 분류기가 거절하면 서버가 거절 분야에 맞는 모델로 다시 시도
    output_config: { effort: 'high' }, // Opus 5.5 기본값은 medium 이라 명시
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages,
  });
  if (res.stop_reason === 'refusal') return { refused: true, res };
  if (res.stop_reason === 'max_tokens') throw new Error('max_tokens 도달 — 글이 잘렸습니다');
  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('').trim().replace(/^```(?:markdown|json)?\s*|\s*```$/g, '');
  return { text, res };
}

// 주제 보충: 기존 주제·글과 겹치지 않는 새 주제 12개
async function refillTopics(client, system, topics, posts) {
  const known = [...topics.map(t => `${t.title} [${t.keyword}]`), ...posts.map(p => `${p.title} [${p.keyword || ''}]`)];
  const msg = `「대학로 연극 가이드」에 이어서 쓸 새 주제 12개를 제안해 주세요. 조건:
- 아래 기존 주제·글과 대표 키워드가 겹치지 않을 것
- [사실 목록]만으로 정확하게 쓸 수 있을 것(목록에 없는 숫자가 필요한 주제는 제외)
- 카테고리(${BLOG_CATEGORIES.join(', ')})를 고르게 섞고, "대학로 연극" "혜화 연극"이 들어간 검색어와 파릇 공연 이름이 들어간 검색어를 반씩
- 사람들이 실제로 검색하는 질문 형태(예: ~ 시간, ~ 후기, ~ 가격, ~ 자리, ~ 데이트, ~ 아이와)

기존 주제·글:
${known.map(t => `- ${t}`).join('\n')}

JSON 배열만 출력하세요. 각 항목: {"id": "영문-소문자-하이픈", "title": "주제", "keyword": "대표 키워드", "angle": "다룰 내용과 주의점 1~2문장", "category": "카테고리", "keywords": ["함께 쓸 검색어"], "show": "${SHOWS.map(s => s.slug).join('|')}|"}`;
  const out = await callClaude(client, system, [{ role: 'user', content: msg }], 8000);
  if (out.refused) return 0;
  let list;
  try { list = JSON.parse(out.text.slice(out.text.indexOf('['), out.text.lastIndexOf(']') + 1)); } catch (e) { console.log('주제 보충 응답을 읽지 못했습니다:', e.message); return 0; }
  const ids = new Set(topics.map(t => t.id)), kws = new Set([...topics.map(t => t.keyword), ...posts.map(p => p.keyword)].filter(Boolean));
  let n = 0;
  for (const t of list) {
    if (!t || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.id || '') || ids.has(t.id) || !BLOG_CATEGORIES.includes(t.category) || !t.title || !t.keyword || kws.has(t.keyword)) continue;
    topics.push({ id: t.id, title: String(t.title), keyword: String(t.keyword), angle: String(t.angle || ''), category: t.category, keywords: (t.keywords || []).map(String).slice(0, 6), show: SHOWS.some(s => s.slug === t.show) ? t.show : '', status: 'todo', source: 'ai' });
    ids.add(t.id); kws.add(t.keyword); n++;
  }
  return n;
}

async function main() {
  const sheet = factSheet();
  const allowed = allowedNumbers(sheet);
  const posts = loadPosts(BLOG);

  if (flag('--check')) {
    let bad = 0;
    const files = fs.readdirSync(BLOG).filter(f => f.endsWith('.md') && !f.startsWith('_'));
    const kw = new Map();
    for (const f of files) {
      const v = validate(fs.readFileSync(path.join(BLOG, f), 'utf8'), { allowed, slugs: new Set() });
      if (v.meta?.keyword) { if (kw.has(v.meta.keyword)) { v.ok = false; v.errs.push(`대표 키워드 중복: ${kw.get(v.meta.keyword)}`); } kw.set(v.meta.keyword, f); }
      console.log(`${v.ok ? 'OK ' : 'NG '} ${f} (${v.len ?? '?'}자)${v.ok ? '' : '\n    - ' + v.errs.join('\n    - ')}`);
      if (!v.ok) bad++;
    }
    process.exit(bad ? 1 : 0);
  }
  if (flag('--facts')) { console.log(sheet); return; }

  // 사람이 미리 써 둔 예약 글이 남아 있으면 AI 작성은 쉰다(하루 3편 유지). --force 로 무시
  {
    const n = new Date(), d = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(n);
    const nowKST = d + ' ' + new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(n);
    const pending = posts.filter(p => `${p.date} ${p.time || '00:00'}` > nowKST);
    if (pending.length && !flag('--force')) { console.log(`예약 발행 대기 글 ${pending.length}편(마지막 ${pending.map(p => p.date).sort().pop()}) — AI 글 작성을 건너뜁니다.`); return; }
  }
  const topics = JSON.parse(fs.readFileSync(TOPICS, 'utf8'));
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic(); // ANTHROPIC_API_KEY 등 환경 자격 증명 사용
  const now = new Date();
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(now);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const system = SYSTEM(sheet);
  const count = Math.max(1, Math.min(5, Number(opt('--count')) || 1));

  if (topics.filter(t => t.status === 'todo').length < 6) {
    const n = await refillTopics(client, system, topics, posts);
    console.log(`주제 보충: ${n}개 추가`);
    fs.writeFileSync(TOPICS, JSON.stringify(topics, null, 2) + '\n');
  }

  // 한 편이 검증에 두 번 떨어지면 초안으로 돌리고 다음 주제로 넘어가, 정해진 편수를 채운다(최대 count+2 주제 시도)
  const id = opt('--topic');
  let published = 0, tried = 0;
  while (published < count && tried < (id ? 1 : count + 2)) {
    tried++;
    const topic = id ? topics.find(t => t.id === id) : topics.find(t => t.status === 'todo');
    if (!topic) { console.log('작성할 주제가 없습니다(_topics.json 의 status:"todo" 없음).'); break; }
    if (await writeOne(topic)) published++;
    fs.writeFileSync(TOPICS, JSON.stringify(topics, null, 2) + '\n');
  }
  console.log(`이번 실행: 발행 ${published}편 / 시도 ${tried}개 주제`);
  if (!published && !flag('--allow-empty')) process.exitCode = 2;

  async function writeOne(topic) {
    const cur = loadPosts(BLOG);
    const slugs = new Set(cur.map(p => p.slug));
    const base = userMsg(topic, cur, today);
    let out, v, msg = base;
    for (let attempt = 1; attempt <= 2; attempt++) {
      out = await callClaude(client, system, [{ role: 'user', content: msg }]);
      if (out.refused) { console.log(`[${topic.id}] 거절됨(${out.res.stop_details?.category ?? '분류 없음'}) — 이 주제는 건너뜁니다.`); topic.status = 'skipped'; return false; }
      const u = out.res.usage;
      console.log(`[${topic.id}] 응답 ${attempt}차: 입력 ${u.input_tokens} / 캐시 읽기 ${u.cache_read_input_tokens ?? 0} / 출력 ${u.output_tokens} 토큰, 모델 ${out.res.model}`);
      v = validate(out.text, { allowed, slugs });
      if (v.ok) {
        const dup = cur.find(p => (p.keyword && p.keyword === v.meta.keyword) || sim(p.title, v.meta.title) >= 0.5);
        if (dup) { v.ok = false; v.errs.push(`기존 글과 겹침: ${dup.title}`); }
      }
      if (v.ok) break;
      console.log('검증 실패:\n  - ' + v.errs.join('\n  - '));
      // 고쳐 쓰기는 이전 응답 블록을 되돌려 보내지 않고, 원고 텍스트와 고칠 점을 새 메시지로 보낸다
      msg = `${base}\n\n아래는 직전에 쓴 원고입니다. 문제를 고쳐서 같은 형식으로 글 전체를 다시 써 주세요.\n고칠 점:\n- ${v.errs.join('\n- ')}\n\n[직전 원고]\n${out.text}`;
    }
    let md;
    try {
      const { meta, body } = parseFrontmatter(out.text);
      let slug = meta.slug || topic.id; while (slugs.has(slug)) slug += '-2';
      const front = ['---', `title: ${meta.title}`, `description: ${meta.description}`, `slug: ${slug}`, `date: ${today}`, `time: ${time}`,
        `category: ${meta.category}`, `tags: ${meta.tags.join(', ')}`, `keyword: ${meta.keyword}`, `show: ${meta.show || topic.show || ''}`, 'author: 파릇 공연기획팀', `generated: ${MODEL} ${today}`, `topic: ${topic.id}`, '---'].join('\n');
      md = `${front}\n${body}\n`;
      if (v.ok) {
        fs.writeFileSync(path.join(BLOG, `${slug}.md`), md);
        console.log(`발행: content/blog/${slug}.md (${v.len}자)`);
        topic.status = 'done'; topic.slug = slug; topic.date = today;
        return true;
      }
    } catch (e) { md = out.text; }
    fs.mkdirSync(DRAFTS, { recursive: true });
    const f = path.join(DRAFTS, `${today}-${topic.id}.md`);
    fs.writeFileSync(f, `<!-- 검증 실패로 발행하지 않음:\n- ${v.errs.join('\n- ')}\n-->\n` + md);
    console.log(`초안으로 저장: ${path.relative(ROOT, f)}`);
    topic.status = 'draft'; topic.draft = path.relative(ROOT, f).replace(/\\/g, '/');
    return false;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(async err => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk').catch(() => ({ default: null }));
    if (Anthropic && err instanceof Anthropic.AuthenticationError) console.error('인증 실패: ANTHROPIC_API_KEY를 확인하세요.');
    else if (Anthropic && err instanceof Anthropic.RateLimitError) console.error('요청 한도 초과: 잠시 뒤 다시 실행하세요.');
    else if (Anthropic && err instanceof Anthropic.BadRequestError) console.error('요청 오류(400):', err.message);
    else if (Anthropic && err instanceof Anthropic.APIConnectionError) console.error('연결 오류:', err.message);
    else if (Anthropic && err instanceof Anthropic.APIError) console.error(`API 오류 ${err.status}:`, err.message);
    else console.error(err);
    process.exit(1);
  });
}

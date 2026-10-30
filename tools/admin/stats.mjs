// 자체 방문 통계(어드민 「유입·트래픽」): 쿠키 없이 날짜별 합계만 저장한다. IP·브라우저 정보 원문은 저장하지 않는다.
//  - 브라우저가 보내는 /api/hit: 페이지 조회(유입 경로·첫 페이지·기기)와 예매·전화·메일 버튼 클릭
//  - 서버가 직접 본 검색엔진·AI 크롤러 방문(User-Agent): 어떤 엔진이 언제 무엇을 가져갔는지
//  - IndexNow 전송 기록
// 방문자 수는 「그날의 임의 값 + IP + 브라우저」 해시로 그날 안에서만 센다(다음 날 다시 못 잇는다).
// 저장: DATA_DIR/stats.json — Railway에서는 볼륨을 붙이고 DATA_DIR을 그 경로로 둬야 배포 때 지워지지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const KEEP_DAYS = 400;
const MAX_KEYS = 300; // 하루 안에서 주소·사이트 종류가 너무 많아지면(공격·스팸) 나머지는 「기타」로 모은다
export const dayKST = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);

// 검색엔진·AI 크롤러(로봇 이름은 각 사 공식 User-Agent 기준)
export const BOTS = [
  ['Googlebot', /Googlebot|Google-InspectionTool/i, 'search'],
  ['Bingbot', /bingbot/i, 'search'],
  ['네이버 Yeti', /Yeti\//i, 'search'],
  ['다음 Daumoa', /Daumoa/i, 'search'],
  ['Applebot', /Applebot/i, 'search'],
  ['DuckDuckBot', /DuckDuckBot/i, 'search'],
  ['GPTBot', /GPTBot/i, 'ai'],
  ['OAI-SearchBot', /OAI-SearchBot/i, 'ai'],
  ['ChatGPT-User', /ChatGPT-User/i, 'ai'],
  ['ClaudeBot', /ClaudeBot/i, 'ai'],
  ['Claude-SearchBot', /Claude-SearchBot/i, 'ai'],
  ['Claude-User', /Claude-User/i, 'ai'],
  ['PerplexityBot', /PerplexityBot/i, 'ai'],
  ['Perplexity-User', /Perplexity-User/i, 'ai'],
  ['Meta AI', /meta-externalagent|meta-externalfetcher/i, 'ai'],
  ['Amazonbot', /Amazonbot/i, 'ai'],
  ['Bytespider', /Bytespider/i, 'ai'],
  ['CCBot', /CCBot/i, 'ai'],
];
const ANY_BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|scrap|facebookexternalhit|python|curl|wget|go-http|java\/|okhttp|httpclient|axios|node-fetch/i;
export const botOf = ua => { for (const [name, re, group] of BOTS) if (re.test(ua)) return { name, group }; return ANY_BOT.test(ua) ? { name: '기타 로봇', group: 'other' } : null; };

// 유입 경로 묶음. AI 답변을 맨 앞에 둬야 gemini.google.com이 「구글 검색」으로 빠지지 않는다
const CHANNELS = [
  ['AI 답변', /(^|\.)(chatgpt\.com|chat\.openai\.com|openai\.com|perplexity\.ai|gemini\.google\.com|copilot\.microsoft\.com|claude\.ai|wrtn\.ai|liner\.com|you\.com|meta\.ai|grok\.com|deepseek\.com|lilys\.ai|felo\.ai|cue\.search\.naver\.com)$/],
  ['네이버 검색', /(^|\.)search\.naver\.com$/],
  ['네이버 블로그·카페', /(^|\.)(blog|cafe|post|in)\.naver\.com$/],
  ['네이버 기타', /(^|\.)naver\.(com|me)$/],
  ['구글 검색', /(^|\.)google\.[a-z.]+$/],
  ['다음·카카오', /(^|\.)(daum\.net|kakao\.com|kakaocdn\.net)$/],
  ['빙 검색', /(^|\.)bing\.com$/],
  ['SNS', /(^|\.)(instagram\.com|facebook\.com|fb\.com|threads\.(net|com)|t\.co|x\.com|twitter\.com|youtube\.com|youtu\.be|tiktok\.com|band\.us|linkedin\.com)$/],
];
export const CHANNEL_NAMES = [...CHANNELS.map(c => c[0]), '광고', '캠페인(UTM)', '다른 사이트', '직접 방문'];
const hostOf = s => { try { return new URL(s).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
function channelOf(refHost, q) {
  const src = String(q.get('utm_source') || '').toLowerCase().replace(/^www\./, ''), med = String(q.get('utm_medium') || '').toLowerCase();
  if (/^(cpc|ppc|paid|ad|ads|display|banner|sa|da)$/.test(med)) return '광고';
  for (const [name, re] of CHANNELS) if ((refHost && re.test(refHost)) || (src && re.test(src.includes('.') ? src : `${src}.com`))) return name;
  if (src) return '캠페인(UTM)';
  return refHost ? '다른 사이트' : '직접 방문';
}

const inc = (o, k, n = 1) => {
  if (!(k in o) && Object.keys(o).length >= MAX_KEYS) k = '(기타)';
  o[k] = (o[k] || 0) + n;
};
const emptyDay = () => ({ pv: 0, uv: 0, entries: 0, ch: {}, ref: {}, pages: {}, land: {}, dev: {}, book: {}, call: 0, mail: 0, bots: {} });
const ipOf = req => String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

export function createStats({ dir, persistent }) {
  const file = path.join(dir, 'stats.json');
  let db = { v: 1, days: {}, seen: {}, indexnow: [], today: { d: '', salt: '', ids: [] } };
  try { db = { ...db, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch { /* 처음 */ }
  let ids = new Set(db.today.ids), dirty = false;
  const started = new Date().toISOString();

  function day() {
    const d = dayKST();
    if (db.today.d !== d) { db.today = { d, salt: crypto.randomBytes(16).toString('hex'), ids: [] }; ids = new Set(); prune(); }
    return (db.days[d] ??= emptyDay());
  }
  function prune() {
    const cut = dayKST(Date.now() - KEEP_DAYS * 864e5);
    for (const d of Object.keys(db.days)) if (d < cut) delete db.days[d];
  }
  function save() {
    if (!dirty) return;
    db.today.ids = [...ids].slice(-50000);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file + '.tmp', JSON.stringify(db));
    fs.renameSync(file + '.tmp', file);
    dirty = false;
  }
  setInterval(() => { try { save(); } catch (e) { console.error('통계 저장 실패:', e.message); } }, 30_000).unref();

  // 브라우저 비컨: { t: 'pv' | 'ev', p: 경로, r: document.referrer, q: location.search, w: 화면 폭, e: 이벤트, s: 공연 }
  function hit(req, b, siteHost) {
    const ua = String(req.headers['user-agent'] || '');
    if (!ua || botOf(ua)) return; // 화면을 그리는 크롤러(Googlebot 등)도 비컨을 보낸다 → 사람 통계에서 뺀다
    const D = day();
    const p = normPath(b.p);
    if (b.t === 'ev') {
      if (b.e === 'book_click') inc(D.book, String(b.s || '(공연 미상)').slice(0, 60));
      else if (b.e === 'contact_call') D.call++;
      else if (b.e === 'contact_email') D.mail++;
      dirty = true; return;
    }
    if (!p) return;
    D.pv++; inc(D.pages, p);
    const id = crypto.createHash('sha256').update(db.today.salt + ipOf(req) + ua).digest('base64url').slice(0, 12);
    if (!ids.has(id)) { ids.add(id); D.uv++; inc(D.dev, Number(b.w) > 0 && Number(b.w) < 768 ? '모바일' : '데스크톱'); }
    const refHost = hostOf(b.r);
    const q = new URLSearchParams(String(b.q || '').slice(0, 500));
    if (refHost && refHost === String(siteHost).replace(/:\d+$/, '').replace(/^www\./, '') && !q.get('utm_source')) { dirty = true; return; } // 사이트 안 이동
    D.entries++; inc(D.land, p);
    inc(D.ch, channelOf(refHost, q));
    if (refHost) inc(D.ref, refHost);
    dirty = true;
  }

  // 서버가 본 크롤러 방문(HTML·sitemap·RSS·robots·llms.txt)
  function bot(req, pathname) {
    const b = botOf(String(req.headers['user-agent'] || ''));
    if (!b || b.group === 'other') return;
    inc(day().bots, b.name);
    db.seen[b.name] = { t: new Date().toISOString(), p: String(pathname).slice(0, 120), g: b.group };
    dirty = true;
  }

  function indexNow(urls, res) {
    db.indexnow.unshift({ t: new Date().toISOString(), n: urls.length, urls: urls.slice(0, 5), res: res.map(([e, s]) => `${new URL(e).host} ${s}`) });
    db.indexnow = db.indexnow.slice(0, 30); dirty = true;
  }

  // 최근 n일(오늘 포함) 합계
  function summary(n = 30) {
    day();
    const out = { days: [], pv: 0, uv: 0, entries: 0, ch: {}, ref: {}, pages: {}, land: {}, dev: {}, book: {}, call: 0, mail: 0, bots: {} };
    for (let i = n - 1; i >= 0; i--) {
      const d = dayKST(Date.now() - i * 864e5), x = db.days[d] || emptyDay();
      out.days.push({ d, pv: x.pv, uv: x.uv, entries: x.entries, book: Object.values(x.book).reduce((a, b) => a + b, 0) });
      out.pv += x.pv; out.uv += x.uv; out.entries += x.entries; out.call += x.call; out.mail += x.mail;
      for (const k of ['ch', 'ref', 'pages', 'land', 'dev', 'book', 'bots']) for (const [kk, v] of Object.entries(x[k])) out[k][kk] = (out[k][kk] || 0) + v;
    }
    const since = Object.keys(db.days).sort()[0] || dayKST();
    return { ...out, seen: db.seen, indexnow: db.indexnow.slice(0, 10), since, started, persistent };
  }
  // 글 하나하나의 조회 수(블로그 목록용)
  function pageViews(n = 30) {
    const o = {};
    for (let i = 0; i < n; i++) for (const [k, v] of Object.entries((db.days[dayKST(Date.now() - i * 864e5)] || emptyDay()).pages)) o[k] = (o[k] || 0) + v;
    return o;
  }
  return { hit, bot, indexNow, summary, pageViews, save };
}

// 주소 정리: 쿼리·해시를 떼고, 사이트 안 페이지 형태(/…/)만 받는다
function normPath(p) {
  const s = String(p || '').split(/[?#]/)[0].slice(0, 200);
  if (!/^\/[a-z0-9\-/._%]*$/i.test(s)) return '';
  return s.endsWith('/') || /\.[a-z0-9]+$/i.test(s) ? s : s + '/';
}

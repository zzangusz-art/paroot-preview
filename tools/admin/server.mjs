// 어드민(/admin/): 유입·트래픽, 블로그 글, 공지·이벤트만 다루는 간단한 관리 화면. tools/serve.mjs가 불러 쓴다.
//  - 로그인: 환경 변수 ADMIN_PASSWORD(없으면 어드민이 꺼져 있고 설정 안내만 보여 준다). 12시간 서명 쿠키
//  - 저장: GITHUB_TOKEN이 있으면 GitHub 저장소에 커밋 → Railway·GitHub Pages가 다시 배포(github.mjs)
//          로컬 PC에서 ADMIN_LOCAL_WRITE=1로 띄우면 파일만 고친다(deploy.bat이 올림)
//    어느 쪽이든 서버의 파일도 바로 고치고 다시 빌드해 몇 초 안에 사이트에 보인다
//  - 방문 통계: stats.mjs (/api/hit 비컨 + 크롤러 기록)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { githubOn, githubRepo, readFile, commitFiles } from './github.mjs';
import { CHANNEL_NAMES, BOTS, dayKST } from './stats.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UI = path.join(HERE, 'ui');
const UI_TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const COOKIE = 'pa_admin';
const SESSION_MS = 12 * 3600e3;

export async function createAdmin({ ROOT, stats, rebuild, siteHost }) {
  const D = await import('../../src/data.mjs');
  const { parseFrontmatter, loadPosts } = await import('../blog/lib.mjs');
  const { validate } = await import('../blog-ai/generate.mjs');
  const BLOG = path.join(ROOT, 'content/blog');
  const NOTICES = 'content/notices.json';
  const pw = () => process.env.ADMIN_PASSWORD || '';
  const writer = () => (githubOn() ? 'github' : process.env.ADMIN_LOCAL_WRITE ? 'local' : null);

  // ── 로그인 ──
  const secret = () => crypto.createHash('sha256').update('paroot-admin|' + pw()).digest();
  const sign = exp => `${exp}.${crypto.createHmac('sha256', secret()).update(String(exp)).digest('base64url')}`;
  const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
  const cookieOf = req => (String(req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(COOKIE + '=')) || '').slice(COOKIE.length + 1);
  const authed = req => { const c = cookieOf(req), exp = Number(c.split('.')[0]); return !!pw() && exp > Date.now() && same(c, sign(exp)); };
  const ipOf = req => String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const secure = req => String(req.headers['x-forwarded-proto'] || '').startsWith('https') || !/^(localhost|127\.|\[::1\])/.test(String(req.headers.host || ''));
  const fails = new Map(); // ip → { n, t } 로그인 실패 제한(15분 8회)
  const hits = new Map();  // ip → { n, t } 비컨 제한(1분 240회)
  const limited = (map, ip, max, win) => { const now = Date.now(), r = map.get(ip); if (!r || now - r.t > win) { map.set(ip, { n: 1, t: now }); return false; } return ++r.n > max; };
  setInterval(() => { const now = Date.now(); for (const m of [fails, hits]) for (const [k, r] of m) if (now - r.t > 15 * 60e3) m.delete(k); }, 5 * 60e3).unref();

  // ── 응답 도우미 ──
  const HDR = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' };
  const json = (res, status, obj, extra = {}) => res.writeHead(status, { ...HDR, 'Content-Type': 'application/json; charset=utf-8', ...extra }).end(JSON.stringify(obj));
  const body = (req, limit) => new Promise((ok, no) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > limit) { no(Object.assign(new Error('너무 큽니다'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => ok(Buffer.concat(chunks).toString('utf8'))); req.on('error', no);
  });
  const readJson = async (req, limit = 256 * 1024) => { try { return JSON.parse(await body(req, limit) || '{}'); } catch (e) { throw Object.assign(new Error(e.status === 413 ? '보낸 내용이 너무 큽니다' : '요청 형식이 올바르지 않습니다'), { status: e.status || 400 }); } };
  const fail = (status, message, extra) => Object.assign(new Error(message), { status, extra });

  // ── 파일 읽기·쓰기(GitHub가 원본, 서버 파일은 즉시 반영용 사본) ──
  // GitHub 쪽 오류(토큰 만료·권한 없음 등)는 502로 바꿔 로그인 오류와 헷갈리지 않게 한다
  const viaGithub = async fn => { try { return await fn(); } catch (e) { throw fail(502, `GitHub 연결 오류(${e.message}). 토큰(GITHUB_TOKEN)의 기한·권한을 확인하세요`); } };
  async function readText(rel) {
    if (writer() === 'github') { const b = await viaGithub(() => readFile(rel)); return b == null ? null : b.toString('utf8'); }
    const f = path.join(ROOT, rel); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
  }
  async function write(files, message) {
    const mode = writer();
    if (!mode) throw fail(503, '저장이 꺼져 있습니다. Railway 환경 변수 GITHUB_TOKEN을 설정하세요.');
    let sha = null;
    if (mode === 'github') sha = await viaGithub(() => commitFiles(files, `${message}\n\n어드민(${siteHost}/admin/)에서 저장`));
    for (const f of files) {
      const abs = path.join(ROOT, f.path);
      if (f.content == null) fs.rmSync(abs, { force: true });
      else { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, f.content); }
    }
    // 다시 빌드가 끝난 뒤 답한다(목록·사이트에 바로 보이게). 너무 오래 걸리면 기다리지 않는다
    await Promise.race([rebuild(), new Promise(ok => setTimeout(ok, 20_000))]);
    return { mode, sha };
  }
  const exists = rel => fs.existsSync(path.join(ROOT, rel));

  // ── 화면용 기본 정보 ──
  const nowKST = () => { const t = new Date(Date.now() + 9 * 3600e3).toISOString(); return `${t.slice(0, 10)} ${t.slice(11, 16)}`; };
  const SHOWS = D.SHOWS.map(s => ({ slug: s.slug, title: s.title }));
  const STATIC_TITLES = { '/': '홈', '/shows/': '공연 목록', '/blog/': '대학로 연극 가이드(블로그)', '/about/': '회사 소개', '/visit/': '오시는 길', '/notice/': '공지사항·이벤트', '/news/': '뉴스·보도', '/contact/': '문의', '/faq/': '자주 묻는 질문', '/privacy/': '개인정보 처리 안내' };
  function titles() {
    const t = { ...STATIC_TITLES };
    for (const s of D.SHOWS) t[`/shows/${s.slug}/`] = s.title;
    for (const p of safePosts()) t[`/blog/${p.slug}/`] = p.title;
    return t;
  }
  function safePosts() { try { return loadPosts(BLOG); } catch (e) { console.error('글 읽기 실패:', e.message); return []; } }

  // ── 블로그 ──
  function listPosts() {
    const now = nowKST(), views = stats.pageViews(30);
    return safePosts().map(p => ({
      slug: p.slug, title: p.title, category: p.category, date: p.date, time: p.time || '00:00', show: p.show || '', editor: p.editor || '',
      status: `${p.date} ${p.time || '00:00'}` <= now ? 'live' : 'scheduled', views: views[`/blog/${p.slug}/`] || 0, chars: p.chars,
    }));
  }
  const ORDER = ['title', 'description', 'slug', 'date', 'time', 'updated', 'category', 'tags', 'keyword', 'show', 'author', 'editor'];
  const oneLine = v => String(v ?? '').replace(/\s*\r?\n\s*/g, ' ').trim();
  function toMarkdown(meta, text) {
    const keys = [...ORDER, ...Object.keys(meta).filter(k => !ORDER.includes(k))].filter(k => meta[k] != null && meta[k] !== '' && !(Array.isArray(meta[k]) && !meta[k].length));
    return `---\n${keys.map(k => `${k}: ${Array.isArray(meta[k]) ? meta[k].map(oneLine).join(', ') : oneLine(meta[k])}`).join('\n')}\n---\n${String(text || '').replace(/\r\n/g, '\n').trim()}\n`;
  }
  async function getPost(slug) {
    if (!/^[a-z0-9-]+$/.test(slug)) throw fail(400, '주소가 올바르지 않습니다');
    const src = await readText(`content/blog/${slug}.md`);
    if (src == null) throw fail(404, '글이 없습니다');
    const { meta, body: text } = parseFrontmatter(src);
    return { ...meta, tags: meta.tags.join(', '), body: text };
  }
  async function savePost(b) {
    const isNew = !b.original;
    const slug = oneLine(isNew ? b.slug : b.original).toLowerCase();
    let meta = {}, old = null;
    if (!isNew) {
      old = await readText(`content/blog/${slug}.md`);
      if (old == null) throw fail(404, '저장소에서 글을 찾지 못했습니다(다른 곳에서 지웠을 수 있음)');
      meta = parseFrontmatter(old).meta;
    } else if (/^[a-z0-9-]+$/.test(slug) && await readText(`content/blog/${slug}.md`) != null) throw fail(400, '검사를 통과하지 못했습니다', { errors: [`이미 있는 주소(slug)입니다: ${slug}`] });
    const today = dayKST();
    const m = {
      ...meta, title: oneLine(b.title), description: oneLine(b.description), slug, date: oneLine(b.date), time: oneLine(b.time) || '09:00',
      category: oneLine(b.category), tags: oneLine(b.tags).split(',').map(t => t.trim()).filter(Boolean),
      keyword: oneLine(b.keyword), show: oneLine(b.show), author: meta.author || '파릇 공연기획팀', editor: 'admin',
    };
    // 이미 공개된 글의 제목·요약·본문이 바뀌면 updated(사이트맵 lastmod → 검색엔진·IndexNow에 「바뀜」으로 알림)를 오늘로
    const wasLive = !isNew && `${meta.date} ${meta.time || '00:00'}` <= nowKST();
    const sig = (t, d, x) => JSON.stringify([oneLine(t), oneLine(d), String(x || '').replace(/\s+/g, ' ').trim()]);
    if (wasLive && sig(m.title, m.description, b.body) !== sig(meta.title, meta.description, parseFrontmatter(old).body)) m.updated = today;
    const md = toMarkdown(m, b.body);
    const v = validate(md, { allowed: new Set(), slugs: new Set() });
    const errors = v.ok ? [] : [...v.errs];
    if (m.keyword) { const dup = safePosts().find(p => p.slug !== slug && p.keyword === m.keyword); if (dup) errors.push(`대표 키워드가 다른 글과 같습니다: 「${dup.title}」`); }
    if (errors.length) throw fail(400, '검사를 통과하지 못했습니다', { errors });
    const r = await write([{ path: `content/blog/${slug}.md`, content: md }], `어드민: 블로그 글 ${isNew ? '추가' : '수정'} — ${m.title}`);
    return { ...r, slug };
  }
  async function deletePost(slug) {
    if (!/^[a-z0-9-]+$/.test(slug)) throw fail(400, '주소가 올바르지 않습니다');
    if (await readText(`content/blog/${slug}.md`) == null) throw fail(404, '글이 없습니다');
    const files = [{ path: `content/blog/${slug}.md`, content: null }];
    if (exists(`assets/img/blog/${slug}.jpg`)) files.push({ path: `assets/img/blog/${slug}.jpg`, content: null });
    return write(files, `어드민: 블로그 글 삭제 — ${slug}`);
  }

  // ── 공지·이벤트 ──
  const CATS = { event: 'ev', notice: 'nt', audition: 'au' };
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  const imgPath = (id, k) => `assets/img/notice/${id}${k ? `-${k + 1}` : ''}.webp`;
  const isWebp = b => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';
  async function getNotices() { return JSON.parse(await readText(NOTICES) || '[]'); }
  async function saveNotice(b) {
    const n = b.notice || {}, errors = [];
    const cat = n.cat in CATS ? n.cat : (errors.push('분류를 고르세요'), 'notice');
    const item = {
      cat, show: oneLine(n.show), date: oneLine(n.date) || dayKST(), start: cat === 'event' ? oneLine(n.start) : '', end: cat === 'event' ? oneLine(n.end) : '',
      title: oneLine(n.title), summary: oneLine(n.summary),
      body: (Array.isArray(n.body) ? n.body : String(n.body || '').split('\n')).map(oneLine).filter(Boolean).slice(0, 12), note: oneLine(n.note),
    };
    if (item.title.length < 4 || item.title.length > 80) errors.push(`제목은 4~80자입니다(현재 ${item.title.length}자)`);
    if (item.summary.length < 10 || item.summary.length > 300) errors.push(`요약은 10~300자입니다(현재 ${item.summary.length}자)`);
    for (const k of ['date', 'start', 'end']) if (item[k] && !DATE.test(item[k])) errors.push('날짜 형식은 YYYY-MM-DD입니다');
    if (item.start && item.end && item.start > item.end) errors.push('시작일이 종료일보다 늦습니다');
    if (item.show && !SHOWS.some(s => s.slug === item.show)) errors.push('공연을 다시 고르세요');
    if (item.body.some(t => t.length > 300)) errors.push('본문 항목 하나는 300자까지입니다');
    const imgs = Array.isArray(b.images) ? b.images : null;
    const bufs = [];
    if (imgs) {
      if (imgs.length > 6) errors.push('이미지는 6장까지입니다');
      for (const [k, im] of imgs.slice(0, 6).entries()) {
        const main = Buffer.from(String(im.main || ''), 'base64'), thumb = k === 0 ? Buffer.from(String(im.thumb || ''), 'base64') : null;
        if (!isWebp(main) || main.length > 1.6e6 || (thumb && (!isWebp(thumb) || thumb.length > 4e5))) { errors.push(`${k + 1}번째 이미지를 처리하지 못했습니다(크롬·엣지에서 다시 올려 주세요)`); break; }
        bufs.push({ main, thumb });
      }
    }
    if (errors.length) throw fail(400, '검사를 통과하지 못했습니다', { errors: [...new Set(errors)] });
    const list = await getNotices();
    const at = n.id ? list.findIndex(x => x.id === n.id) : -1;
    if (n.id && at < 0) throw fail(404, '저장소에서 이 공지를 찾지 못했습니다(다른 곳에서 지웠을 수 있음)');
    const prev = at > -1 ? list[at] : null;
    const id = prev ? prev.id : `${CATS[cat]}-${dayKST().replace(/-/g, '')}-${crypto.randomBytes(2).toString('hex')}`;
    const oldN = prev ? prev.imgs || 0 : 0, files = [];
    let newN = oldN;
    if (imgs) {
      newN = bufs.length;
      bufs.forEach((x, k) => files.push({ path: imgPath(id, k), content: x.main }));
      if (bufs[0]) files.push({ path: `assets/img/notice/${id}-t.webp`, content: bufs[0].thumb });
      for (let k = newN; k < oldN; k++) if (exists(imgPath(id, k))) files.push({ path: imgPath(id, k), content: null });
      if (!newN && exists(`assets/img/notice/${id}-t.webp`)) files.push({ path: `assets/img/notice/${id}-t.webp`, content: null });
    }
    const out = { id, cat: item.cat };
    for (const k of ['show', 'date', 'start', 'end', 'title', 'summary']) if (item[k]) out[k] = item[k];
    out.body = item.body; out.imgs = newN;
    if (imgs?.length) out.v = Date.now().toString(36); else if (!imgs && prev?.v && newN) out.v = prev.v; // 이미지 주소 버전(캐시 비키기)
    if (item.note) out.note = item.note;
    if (prev?.legacy) out.legacy = prev.legacy;
    if (at > -1) list[at] = out; else list.unshift(out);
    files.push({ path: NOTICES, content: JSON.stringify(list, null, 2) + '\n' });
    const r = await write(files, `어드민: ${item.cat === 'event' ? '이벤트' : item.cat === 'audition' ? '오디션 공고' : '공지'} ${prev ? '수정' : '추가'} — ${item.title}`);
    return { ...r, id };
  }
  async function deleteNotice(id) {
    const list = await getNotices(), at = list.findIndex(x => x.id === id);
    if (at < 0) throw fail(404, '공지가 없습니다');
    const [gone] = list.splice(at, 1), files = [{ path: NOTICES, content: JSON.stringify(list, null, 2) + '\n' }];
    for (let k = 0; k < (gone.imgs || 0); k++) if (exists(imgPath(id, k))) files.push({ path: imgPath(id, k), content: null });
    if (exists(`assets/img/notice/${id}-t.webp`)) files.push({ path: `assets/img/notice/${id}-t.webp`, content: null });
    return write(files, `어드민: 공지·이벤트 삭제 — ${gone.title}`);
  }

  // ── 라우팅: 처리했으면 true ──
  return async function handle(req, res, url) {
    const p = url.pathname;
    if (p === '/api/hit') {
      if (req.method !== 'POST') { res.writeHead(405, { Allow: 'POST' }).end(); return true; }
      if (!limited(hits, ipOf(req), 240, 60e3)) { try { stats.hit(req, JSON.parse(await body(req, 4096) || '{}'), siteHost); } catch { /* 깨진 비컨은 버림 */ } }
      res.writeHead(204, { 'Cache-Control': 'no-store' }).end();
      return true;
    }
    if (p === '/admin') { res.writeHead(301, { Location: '/admin/' }).end(); return true; }
    if (!p.startsWith('/admin/')) return false;

    // 화면 파일
    if (req.method === 'GET' && !p.startsWith('/admin/api/')) {
      const name = p === '/admin/' ? (pw() ? 'index.html' : 'setup.html') : p.slice('/admin/'.length);
      const f = path.join(UI, path.normalize(name));
      if (!f.startsWith(UI + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404, HDR).end('Not found'); return true; }
      res.writeHead(200, { ...HDR, 'Content-Type': UI_TYPES[path.extname(f)] || 'application/octet-stream',
        'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
      fs.createReadStream(f).pipe(res);
      return true;
    }

    try {
      if (req.method === 'POST') {
        // 다른 사이트에서 대신 보내는 요청(CSRF) 막기: 같은 출처 + 어드민 화면만 붙이는 머리글
        const origin = req.headers.origin, host = (() => { try { return new URL(origin).host; } catch { return null; } })();
        const self = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
        if (req.headers['x-admin'] !== '1' || (origin && host !== self)) throw fail(403, '허용되지 않은 요청입니다');
      }
      if (p === '/admin/api/login' && req.method === 'POST') {
        if (!pw()) throw fail(503, '어드민 비밀번호(ADMIN_PASSWORD)가 설정되지 않았습니다');
        const ip = ipOf(req), r = fails.get(ip);
        if (r && r.n >= 8 && Date.now() - r.t < 15 * 60e3) throw fail(429, '로그인 시도가 너무 많습니다. 15분 뒤 다시 시도하세요');
        const { password } = await readJson(req, 4096);
        const ok = same(crypto.createHash('sha256').update(String(password || '')).digest('hex'), crypto.createHash('sha256').update(pw()).digest('hex'));
        if (!ok) { limited(fails, ip, 1e9, 15 * 60e3); throw fail(401, '비밀번호가 맞지 않습니다'); }
        fails.delete(ip);
        const exp = Date.now() + SESSION_MS;
        json(res, 200, { ok: true }, { 'Set-Cookie': `${COOKIE}=${sign(exp)}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MS / 1000}${secure(req) ? '; Secure' : ''}` });
        return true;
      }
      if (p === '/admin/api/logout' && req.method === 'POST') { json(res, 200, { ok: true }, { 'Set-Cookie': `${COOKIE}=; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=0` }); return true; }
      if (p === '/admin/api/me') { json(res, 200, { auth: authed(req), configured: !!pw() }); return true; }
      if (!authed(req)) throw fail(401, '로그인이 필요합니다');

      if (p === '/admin/api/meta') { json(res, 200, { writer: writer(), repo: githubRepo(), persistent: stats.summary(1).persistent, shows: SHOWS, categories: D.BLOG_CATEGORIES, site: D.SITE.url, today: dayKST(), now: nowKST(), channels: CHANNEL_NAMES, bots: BOTS.map(([n, , g]) => ({ name: n, group: g })) }); return true; }
      if (p === '/admin/api/stats') { const n = [7, 30, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 30; json(res, 200, { ...stats.summary(n), titles: titles() }); return true; }
      if (p === '/admin/api/posts') { json(res, 200, { posts: listPosts(), now: nowKST() }); return true; }
      if (p === '/admin/api/post' && req.method === 'GET') { json(res, 200, await getPost(String(url.searchParams.get('slug') || ''))); return true; }
      if (p === '/admin/api/post' && req.method === 'POST') { json(res, 200, await savePost(await readJson(req, 512 * 1024))); return true; }
      if (p === '/admin/api/post/delete' && req.method === 'POST') { json(res, 200, await deletePost(String((await readJson(req)).slug || ''))); return true; }
      if (p === '/admin/api/notices') { json(res, 200, { notices: await getNotices(), today: dayKST() }); return true; }
      if (p === '/admin/api/notice' && req.method === 'POST') { json(res, 200, await saveNotice(await readJson(req, 12 * 1024 * 1024))); return true; }
      if (p === '/admin/api/notice/delete' && req.method === 'POST') { json(res, 200, await deleteNotice(String((await readJson(req)).id || ''))); return true; }
      throw fail(404, '없는 주소입니다');
    } catch (e) {
      if (!e.status || e.status >= 500) console.error('어드민 오류:', e.message);
      json(res, e.status && e.status < 600 ? e.status : 500, { error: e.status ? e.message : '서버 오류가 났습니다. 잠시 뒤 다시 시도하세요', ...(e.extra || {}) });
      return true;
    }
  };
}

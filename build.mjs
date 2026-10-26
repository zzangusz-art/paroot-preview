// 파릇 정적 사이트 빌드
//   node build.mjs                       → dist/ (운영: 검색 노출 허용)
//   node build.mjs --preview <주소>       → dist/ (미리보기: 모든 페이지 noindex, robots Disallow)
//   node build.mjs --out <폴더>           → 출력 폴더 변경
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : null; };
const PREVIEW = opt('--preview');
if (PREVIEW) process.env.SITE_URL = PREVIEW;
const OUT = path.resolve(ROOT, opt('--out') || 'dist');

const D = await import('./src/data.mjs');
const { SITE, SHOWS, FAQ, VENUES, HISTORY, AWARDS, PRESS, BLOG_CATEGORIES, KEYWORDS, ASOF, ASOF_LABEL, venueOf, priceFrom, totalReviews, avgRating, TOUR_CITIES } = D;
const { makeUrl, pageUrl, esc, won } = await import('./src/lib.mjs');
const S = await import('./src/schema.mjs');
const { page } = await import('./src/layout.mjs');
const { homeBody } = await import('./src/home.mjs');
const P = await import('./src/pages.mjs');
const { loadPosts, renderMarkdown } = await import('./tools/blog/lib.mjs');

const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());

// ── 준비 ──
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const copyDir = (src, dst) => { fs.mkdirSync(dst, { recursive: true }); for (const e of fs.readdirSync(src, { withFileTypes: true })) { const s = path.join(src, e.name), d = path.join(dst, e.name); e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d); } };
copyDir(path.join(ROOT, 'assets'), path.join(OUT, 'assets'));
for (const f of ['favicon.ico']) if (fs.existsSync(path.join(ROOT, f))) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
const V = crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, 'assets/css/style.css'))).update(fs.readFileSync(path.join(ROOT, 'assets/js/app.js'))).digest('hex').slice(0, 8);

const write = (rel, html) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
const pages = []; // sitemap용 {out, mod, pri}
const agency = !PREVIEW && SITE.agencyScript ? `<script src="${SITE.agencyScript}" async></script>` : '';

function emit({ out, title, description, body, schema, section, ogImage, ogType, published, mod = ASOF, pri = '0.7', bodyClass = '', keywords = [] }) {
  const u = makeUrl(out);
  const url = pageUrl(out);
  const html = page({ title, description, url, schema, section, ogImage, ogType, published, v: V, noindex: !!PREVIEW, bodyClass, extraScripts: agency, keywords }, u, body(u));
  write(out, html);
  pages.push({ out, mod, pri });
}
const bc = items => S.breadcrumb(items.map(([name, rel]) => ({ name, url: SITE.url + rel })));

// ── 블로그 글 ──
const BLOG = path.join(ROOT, 'content/blog');
const posts = loadPosts(BLOG, { today }).map(p => {
  const link = h => h.startsWith('#') ? h : '../../' + h; // blog/<slug>/index.html 기준
  const r = renderMarkdown(p.main, link);
  const thumbRel = `assets/img/blog/${p.slug}.jpg`;
  const has = fs.existsSync(path.join(ROOT, thumbRel));
  if (!has) console.warn(`썸네일 없음 → 공연 커버로 대신: ${p.slug} (python tools/thumbs/build_thumbs.py)`);
  const show = p.show && SHOWS.find(s => s.slug === p.show);
  return { ...p, html: r.html, toc: r.toc, thumb: has ? thumbRel : `assets/img/shows/${show ? show.slug : 'hanbbeumsai'}/cover.webp` };
});
const lastPost = posts[0]?.date || ASOF;

// ── 홈 ──
{
  const out = 'index.html', url = pageUrl(out);
  const t = '대학로 연극·혜화 연극 | 파릇 — 한뼘사이·사내연애 보고서·플러팅';
  const d = `대학로·혜화에서 연극과 어린이 뮤지컬을 만드는 공연 제작사 파릇. 2017년부터 오픈런 중인 로맨틱 코미디 「한뼘사이」, 「사내연애 보고서」, 섹시 코미디 「플러팅」, 심야 쇼 「드랙인혜화」, 어린이 뮤지컬 「늑대숲 또옹돼지 원정대」·「피노키오야 노올자」, 「수상한 룸메이트」 예매·오시는 길.`;
  emit({ out, pri: '1.0', mod: lastPost > ASOF ? lastPost : ASOF, bodyClass: 'home', title: t, description: d,
    keywords: ['대학로 연극', '혜화 연극', '대학로 연극 추천', '혜화 연극 추천', ...SHOWS.map(s => s.title), '파릇'],
    schema: S.graph(S.organization(), S.website(), S.webpage({ url, title: t, description: d }), S.showList(url), S.faqPage(FAQ.filter(f => f.pages.includes('home')), url)),
    body: u => homeBody(u, posts) });
}

// ── 공연 ──
{
  const out = 'shows/index.html', url = pageUrl(out);
  const t = '대학로 연극·뮤지컬 공연 전체 — 가격·회차·공연장 비교 | 파릇';
  const d = `파릇이 대학로·혜화에서 공연 중인 연극 3편, 어린이 뮤지컬 2편, 심야 쇼 1편의 공연장·공연 시간·관람 연령·가격·관람평을 한 번에 비교합니다(${ASOF_LABEL} 기준).`;
  emit({ out, section: 'shows/', pri: '0.9', title: t, description: d, keywords: ['대학로 연극 추천', '혜화 연극 추천', '대학로 공연', '대학로 어린이 뮤지컬'],
    schema: S.graph(S.organization(), S.website(), S.webpage({ url, title: t, description: d, type: 'CollectionPage' }), S.showList(url), bc([['홈', ''], ['공연', 'shows/']])),
    body: u => P.showsIndex(u) });
}
for (const s of SHOWS) {
  const out = `shows/${s.slug}/index.html`, url = pageUrl(out);
  const v = venueOf(s);
  const d = `${s.full} — ${s.lead} ${v.name}(혜화역 ${v.exit}번 출구), ${s.runtime}분, ${s.age.replace(/\(.*\)/, '')}, ${won(priceFrom(s))}부터.`.slice(0, 158);
  const image = SITE.url + `assets/img/shows/${s.slug}/og.jpg`;
  emit({ out, section: 'shows/', pri: '0.9', title: `${s.seo.title} | 파릇`, description: d, ogImage: `assets/img/shows/${s.slug}/og.jpg`, keywords: s.seo.keywords,
    schema: S.graph(S.organization(), S.website(), S.webpage({ url, title: s.seo.title, description: d, image }), S.event(s, url, [image, SITE.url + `assets/img/shows/${s.slug}/poster.webp`]), bc([['홈', ''], ['공연', 'shows/'], [s.title, `shows/${s.slug}/`]]), S.faqPage(s.faq, url)),
    body: u => P.showPage(u, s, posts) });
}

// ── 안내 페이지 ──
const info = [
  { out: 'about/index.html', name: '파릇 소개', render: P.about, pri: '0.7', type: 'AboutPage',
    title: '파릇 소개·연혁 — 대학로 공연 제작사 주식회사 파릇', description: '주식회사 파릇은 2016년 어린이뮤지컬 기획으로 시작해 연극 「한뼘사이」 「사내연애 보고서」 「플러팅」 「비누향기(수상한 룸메이트)」와 어린이뮤지컬을 제작·기획·운영하는 대학로 공연 제작사입니다. 연혁·수상·회사 정보.', extra: () => [S.historyPage()] },
  { out: 'visit/index.html', name: '오시는 길', render: P.visit, pri: '0.8',
    title: '대학로 공연장 오시는 길 — 혜화역 출구별 파릇 공연장 | 파릇', description: '라온아트홀(한뼘사이 전용관)·제나아트홀·라온씨어터는 혜화역 2번 출구, 서연아트홀은 4번 출구, 뮤지컬펍 커튼콜은 1번 출구에서 걸어서 5분 이내입니다. 주소·가는 길·주차 안내.',
    extra: () => VENUES.map(v => ({ '@type': 'PerformingArtsTheater', name: v.name, address: { '@type': 'PostalAddress', streetAddress: v.addr.replace(/^서울 종로구 /, ''), addressLocality: '종로구', addressRegion: '서울특별시', addressCountry: 'KR' }, geo: { '@type': 'GeoCoordinates', latitude: v.lat, longitude: v.lng } })), faq: 'visit' },
  { out: 'news/index.html', name: '소식', render: P.news, pri: '0.5',
    title: '파릇 보도·오디션 소식 | 파릇', description: '한뼘사이·수상한 룸메이트(비누향기)·사내연애 보고서 캐스팅과 수상, 언론 보도, 작품별 배우 오디션 공지를 모았습니다.' },
  { out: 'contact/index.html', name: '문의', render: P.contact, pri: '0.6', type: 'ContactPage',
    title: '단체 관람·초청 공연·제휴 문의 | 파릇', description: `20인 이상 단체 관람, 기업·학교 초청 공연, 공연 기획·마케팅 제휴는 ${SITE.email}, 대표전화 ${SITE.phone}. 배우 오디션은 ${SITE.audition}.`, faq: 'contact' },
  { out: 'faq/index.html', name: '자주 묻는 질문', render: P.faqPage, pri: '0.8',
    title: '대학로 연극 관람 자주 묻는 질문 — 예매·입장·좌석·주차 | 파릇', description: '대학로 연극이 처음일 때 고르는 법, 혜화역에서 공연장까지, 주차, 좌석 배정, 당일 취소, 아이와 관람, 단체 관람까지 파릇 공연 기준으로 답합니다.', faq: 'all' },
];
for (const it of info) {
  const url = pageUrl(it.out);
  const faqs = it.faq === 'all' ? [...FAQ, ...SHOWS.flatMap(s => s.faq)] : it.faq ? FAQ.filter(f => f.pages.includes(it.faq)) : [];
  emit({ out: it.out, section: it.out.split('/')[0] + '/', pri: it.pri, title: it.title, description: it.description,
    schema: S.graph(S.organization(), S.website(), S.webpage({ url, title: it.title, description: it.description, type: it.type }), bc([['홈', ''], [it.name, it.out.replace('index.html', '')]]), S.faqPage(faqs, url), ...(it.extra ? it.extra() : [])),
    body: u => it.render(u) });
}
{
  const out = 'privacy/index.html', url = pageUrl(out);
  emit({ out, pri: '0.2', title: '개인정보 처리 안내 | 파릇', description: '주식회사 파릇 홈페이지의 개인정보 처리 안내입니다.', schema: S.graph(S.website(), S.webpage({ url, title: '개인정보 처리 안내', description: '파릇 개인정보 처리 안내' })), body: u => P.privacy(u) });
}

// ── 블로그 ──
{
  const out = 'blog/index.html', url = pageUrl(out);
  const t = '대학로 연극 가이드 — 공연 고르는 법, 데이트, 아이와 관람 | 파릇';
  const d = '대학로·혜화 연극을 처음 고르는 법, 데이트·모임 동선, 아이와 보는 첫 공연, 관람 매너와 예매 팁까지 파릇 공연기획팀이 정리합니다.';
  emit({ out, section: 'blog/', pri: '0.8', mod: lastPost, title: t, description: d,
    schema: S.graph(S.organization(), S.website(), { ...S.webpage({ url, title: t, description: d, type: 'CollectionPage', modified: lastPost }), mainEntity: { '@type': 'ItemList', itemListElement: posts.slice(0, 30).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE.url + `blog/${p.slug}/` })) } }, bc([['홈', ''], ['대학로 연극 가이드', 'blog/']])),
    body: u => P.blogIndex(u, posts) });
  fs.writeFileSync(path.join(OUT, 'blog/posts.json'), JSON.stringify(posts.map(p => ({ slug: p.slug, title: p.title, description: p.description, category: p.category, date: p.date, minutes: p.minutes, img: { src: '../' + p.thumb } }))));
}
for (const p of posts) {
  const out = `blog/${p.slug}/index.html`, url = pageUrl(out);
  const image = SITE.url + p.thumb;
  emit({ out, section: 'blog/', pri: '0.6', mod: p.updated || p.date, ogType: 'article', published: p.date, ogImage: p.thumb.endsWith('.jpg') ? p.thumb : undefined,
    title: `${p.title} | 파릇`, description: p.description, keywords: p.tags,
    schema: S.graph(S.organization(), S.website(), S.blogPosting(p, url, image), bc([['홈', ''], ['대학로 연극 가이드', 'blog/'], [p.title, `blog/${p.slug}/`]]), p.faq.length ? S.faqPage(p.faq, url) : null),
    body: u => P.blogPost(u, p, posts) });
}
// RSS
{
  const items = posts.slice(0, 30).map(p => `<item><title>${esc(p.title)}</title><link>${SITE.url}blog/${p.slug}/</link><guid isPermaLink="true">${SITE.url}blog/${p.slug}/</guid><pubDate>${new Date(p.date + 'T' + (p.time || '09:00') + ':00+09:00').toUTCString()}</pubDate><category>${esc(p.category)}</category><description>${esc(p.description)}</description></item>`).join('\n');
  write('blog/feed.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>파릇 대학로 연극 가이드</title><link>${SITE.url}blog/</link><atom:link href="${SITE.url}blog/feed.xml" rel="self" type="application/rss+xml"/><description>대학로·혜화 연극 관람 가이드</description><language>ko</language>\n${items}\n</channel></rss>\n`);
}

// ── 404 (어느 경로에서나 열리므로 절대 주소) ──
{
  const abs = to => /^(https?:|tel:|mailto:|#)/.test(to) ? to : SITE.url + to.replace(/^\//, '');
  write('404.html', page({ title: '페이지를 찾을 수 없습니다 | 파릇', description: '요청한 페이지가 없습니다.', url: SITE.url + '404.html', schema: S.graph(S.website()), v: V, noindex: true }, abs, P.notFound(abs)));
}

// ── sitemap · robots · llms ──
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p => `<url><loc>${pageUrl(p.out)}</loc><lastmod>${p.mod}</lastmod><priority>${p.pri}</priority></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', PREVIEW
  ? 'User-agent: *\nDisallow: /\n'
  : ['# 검색엔진과 AI 검색·답변 엔진의 수집을 모두 허용합니다', 'User-agent: *', 'Allow: /', '',
    ...['Googlebot', 'Bingbot', 'Yeti', 'Daumoa', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot', 'Applebot-Extended', 'CCBot'].flatMap(b => [`User-agent: ${b}`, 'Allow: /', '']),
    `Sitemap: ${SITE.url}sitemap.xml`, ''].join('\n'));

const showLines = SHOWS.map(s => { const v = venueOf(s); return `### ${s.full}${s.original ? ` (원작 「${s.original}」)` : ''}\n- 장르: ${s.kind} · ${s.genre}\n- 한 줄: ${s.hook}\n- 공연장: ${v.name}${v.alias ? `(${v.alias})` : ''}, ${v.addr} — ${v.walk}\n- 개막: ${s.sinceLabel}\n- 공연 시간 ${s.runtime}분, 관람 연령 ${s.age}\n- 회차: ${s.schedule.map(([d, t]) => `${d} ${t}`).join(' / ')}\n- 가격(네이버 예약, ${ASOF_LABEL}): ${s.prices.map(p => `${p.name} ${won(p.price)}`).join(', ')} (정가 ${won(Math.max(...s.prices.map(p => p.normal)))})\n- 예매: ${s.booking.url}${s.rating ? `\n- 네이버 예약 관람평 평균 ${s.rating.avg} (${s.rating.count.toLocaleString('ko-KR')}건, ${s.rating.asof} 기준)` : ''}${s.credits ? `\n- ${s.credits}` : ''}\n- 상세: ${SITE.url}shows/${s.slug}/`; }).join('\n\n');
const llms = `# ${SITE.name} (${SITE.nameEn}) — 대학로 연극·혜화 연극

> 주식회사 파릇은 서울 종로구 대학로(혜화)에서 연극과 어린이 뮤지컬을 제작·기획·운영하는 공연 제작사다. 2016년 어린이뮤지컬 기획으로 시작했고, 2017년 3월부터 로맨틱 코미디 연극 「한뼘사이」를 오픈런으로 공연하고 있다. 슬로건: ${SITE.tagline}

## 핵심 사실 (${ASOF_LABEL} 기준)
- 현재 공연 ${SHOWS.length}편: ${SHOWS.map(s => s.title).join(', ')}
- 네이버 예약 관람평 합계 ${totalReviews().toLocaleString('ko-KR')}건, 관람평 수로 가중한 평균 ${avgRating().toFixed(2)}점
- 수상: ${AWARDS.map(a => `${a.t}(${a.d})`).join('; ')}
- 한뼘사이 지역 공연 도시: ${TOUR_CITIES.join(', ')}
- 공연장: 모두 지하철 4호선 혜화역에서 도보 5분 이내, 주차 시설 없음
- 회사: 상호 ${SITE.name}, 대표 ${SITE.ceo}, 사업자등록번호 ${SITE.bizNo}, ${SITE.address.full}, 대표전화 ${SITE.phone}, 문의 ${SITE.email}, 오디션 ${SITE.audition}

## 공연
${showLines}

## 공연장
${VENUES.map(v => `- ${v.name}${v.alias ? `(${v.alias})` : ''}: ${v.addr}. 혜화역 ${v.exit}번 출구 — ${v.walk}`).join('\n')}

## 이런 검색어에 답하는 페이지
${KEYWORDS.map(([k, h]) => `- ${k}: ${SITE.url}${h}`).join('\n')}

## 주요 페이지
- [홈](${SITE.url}) · [공연 전체](${SITE.url}shows/) · [오시는 길](${SITE.url}visit/) · [파릇 소개·연혁](${SITE.url}about/) · [소식](${SITE.url}news/) · [문의](${SITE.url}contact/) · [자주 묻는 질문](${SITE.url}faq/)

## 대학로 연극 가이드(블로그)
${posts.slice(0, 50).map(p => `- [${p.title}](${SITE.url}blog/${p.slug}/): ${p.description}`).join('\n')}

## 더 자세한 내용
- [llms-full.txt](${SITE.url}llms-full.txt): FAQ 전체, 관람 규정, 연혁, 보도 목록
`;
write('llms.txt', llms);
write('llms-full.txt', `${llms}
## 자주 묻는 질문
${[...FAQ, ...SHOWS.flatMap(s => s.faq)].map(f => `### ${f.q}\n${f.a}`).join('\n\n')}

## 관람 규정
${Object.entries(D.RULES).map(([k, l]) => `### ${({ play: '연극', kids: '어린이 뮤지컬', drag: '드랙인혜화' })[k]}\n${l.map(x => `- ${x}`).join('\n')}`).join('\n\n')}

## 연혁
${HISTORY.flatMap(h => h.items).map(([d, t]) => `- ${d} ${t}`).join('\n')}

## 언론 보도
${PRESS.map(p => `- ${p.d} ${p.o}: ${p.t} (${p.u})`).join('\n')}
`);
if (!PREVIEW && opt('--cname')) write('CNAME', opt('--cname') + '\n');

// ── 검증: 내부 링크·자원, JSON-LD ──
let broken = 0, ld = 0;
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(OUT).filter(f => f.endsWith('.html') && !f.endsWith('404.html'))) {
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/(?:href|src|data-lightbox|poster)="([^"]+)"/g)) {
    let h = m[1];
    if (/^(https?:|\/\/|tel:|mailto:|sms:|#|data:)/.test(h)) continue;
    h = h.split('#')[0].split('?')[0];
    if (!h) continue;
    let t = path.resolve(path.dirname(f), h);
    if (h.endsWith('/') || h === '.' || h === './' || /\.\.$/.test(h)) t = path.join(t, 'index.html');
    if (!fs.existsSync(t)) { broken++; if (broken < 25) console.warn(`깨진 참조: ${path.relative(OUT, f)} → ${m[1]}`); }
  }
  for (const m of html.matchAll(/data-src(?:4k|-m)?="([^"]+)"/g)) if (!fs.existsSync(path.join(OUT, m[1]))) { broken++; console.warn(`영상 없음: ${m[1]}`); }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { JSON.parse(m[1]); ld++; }
}
console.log(`빌드 완료 → ${path.relative(ROOT, OUT) || '.'}${PREVIEW ? ' (미리보기 noindex)' : ''} · 페이지 ${pages.length + 1} · 글 ${posts.length} · JSON-LD ${ld} · 깨진 참조 ${broken}`);
if (broken) process.exitCode = 1;

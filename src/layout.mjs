// 공통 레이아웃: <head>(메타·OG·JSON-LD), 헤더·메뉴 드로어·예매 드로어, 모달, 토스트, 푸터
import { SITE, SHOWS, venueOf, priceFrom } from './data.mjs';
import { esc, jsonld, won } from './lib.mjs';

// 아이콘(스프라이트)
const ICONS = {
  check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  ext: '<path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 01-1 1H6a1 1 0 01-1-1V7a1 1 0 011-1h4"/>',
  sound: '<path d="M4 10v4h4l5 4V6L8 10H4z"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/>',
  mute: '<path d="M4 10v4h4l5 4V6L8 10H4z"/><path d="M17 9l5 5M22 9l-5 5"/>',
  replay: '<path d="M4 12a8 8 0 108-8H8"/><path d="M8 1v6h6" transform="translate(-2 0)"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  ticket: '<path d="M4 8a2 2 0 002-2h12a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H6a2 2 0 00-2-2v-2a2 2 0 000-4z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8-4.3-4.1 5.9-.9z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
};
const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${Object.entries(ICONS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('')}</defs></svg>`;
export const ico = (n, cls = '') => `<svg class="ico${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

const NAV = [
  { label: '공연', href: 'shows/', sub: [['shows/', '전체 공연', '연극 · 어린이 뮤지컬 · 쇼'], ...SHOWS.map(s => [`shows/${s.slug}/`, s.title, `${s.kind} · ${s.genre}`])] },
  { label: '오시는 길', href: 'visit/' },
  { label: '파릇 소개', href: 'about/' },
  { label: '소식', href: 'news/' },
  { label: '연극 가이드', href: 'blog/' },
  { label: '문의', href: 'contact/' },
];

function header(u, section) {
  const cur = h => (section && h === section ? ' aria-current="page"' : '');
  return `<header id="hd"><div class="wrap">
  <a class="logo" href="${u('')}" aria-label="${SITE.name} 홈"><img class="lg-c" src="${u('assets/img/brand/logo-h.png')}" alt="${SITE.brand} PAROOT" width="320" height="57"><img class="lg-w" src="${u('assets/img/brand/logo-h-white.png')}" alt="" width="320" height="57"></a>
  <nav aria-label="주 메뉴"><ul class="gnb">${NAV.map(n => n.sub
    ? `<li class="has-sub"><button class="nav-sub-btn" type="button" aria-expanded="false" aria-controls="sub-${n.href.replace(/\W/g, '')}"${section === n.href ? ' aria-current="page"' : ''}>${n.label}${ico('chev')}</button><div class="sub" id="sub-${n.href.replace(/\W/g, '')}">${n.sub.map(([h, t, d]) => `<a href="${u(h)}">${esc(t)}<small>${esc(d)}</small></a>`).join('')}</div></li>`
    : `<li><a href="${u(n.href)}"${cur(n.href)}>${n.label}</a></li>`).join('')}</ul></nav>
  <div class="hd-cta"><a class="btn btn-line btn-s" href="${u('contact/')}">단체·제휴 문의</a><button class="btn btn-pink btn-s" type="button" data-open="drawerBook" aria-controls="drawerBook" aria-expanded="false">${ico('ticket')}예매하기</button></div>
  <button class="menu-btn" type="button" data-open="drawerMenu" aria-controls="drawerMenu" aria-expanded="false" aria-label="메뉴 열기">${ico('menu')}</button>
</div></header>`;
}

function drawers(u) {
  const menu = `<div class="drawer" id="drawerMenu" hidden role="dialog" aria-modal="true" aria-labelledby="dmTitle">
  <div class="drawer-scrim" data-close></div>
  <div class="drawer-panel">
    <div class="drawer-hd"><h2 id="dmTitle">메뉴</h2><button class="x-btn" type="button" data-close aria-label="닫기">${ico('close')}</button></div>
    <div class="drawer-body"><ul class="mnav">${NAV.map((n, i) => n.sub
      ? `<li class="dm-group"><button class="acc-btn" type="button" aria-expanded="false" aria-controls="dm-${i}">${n.label}<span class="pm" aria-hidden="true"></span></button><div class="acc-panel" id="dm-${i}"><div>${n.sub.map(([h, t]) => `<a href="${u(h)}">${esc(t)}</a>`).join('')}</div></div></li>`
      : `<li><a href="${u(n.href)}">${n.label}${ico('arrow')}</a></li>`).join('')}</ul></div>
    <div class="drawer-foot"><button class="btn btn-pink btn-block" type="button" data-open="drawerBook">${ico('ticket')}예매할 공연 고르기</button><a class="btn btn-line btn-block" href="tel:${SITE.phone.replace(/-/g, '')}">${ico('phone')}대표전화 ${SITE.phone}</a></div>
  </div></div>`;
  const book = `<div class="drawer" id="drawerBook" hidden role="dialog" aria-modal="true" aria-labelledby="dbTitle">
  <div class="drawer-scrim" data-close></div>
  <div class="drawer-panel">
    <div class="drawer-hd"><h2 id="dbTitle">예매할 공연 고르기</h2><button class="x-btn" type="button" data-close aria-label="닫기">${ico('close')}</button></div>
    <div class="drawer-body">
      <p class="muted" style="font-size:14.5px">예매는 공연별 네이버 예약에서 진행됩니다. 새 창으로 열립니다.</p>
      <ul class="book-list">${SHOWS.map(s => { const v = venueOf(s); return `<li><a class="bk" href="${s.booking.url}" target="_blank" rel="noopener" data-book="${esc(s.title)}"><span class="bk-img ph"><img src="${u(`assets/img/shows/${s.slug}/thumb.webp`)}" alt="" width="160" height="200" loading="lazy"></span><span class="bk-t"><b>${esc(s.title)}</b><small>${esc(s.kind)} · ${esc(v.name)} · ${won(priceFrom(s))}부터</small></span>${ico('ext')}</a></li>`; }).join('')}</ul>
    </div>
    <div class="drawer-foot"><a class="btn btn-line btn-block" href="${u('visit/')}">${ico('map')}공연장 오시는 길</a></div>
  </div></div>`;
  return menu + book;
}

function modals() {
  const m = (id, titleId, bodyId, extra = '') => `<div class="modal" id="${id}" hidden role="dialog" aria-modal="true" aria-labelledby="${titleId}">
  <div class="modal-scrim" data-close></div>
  <div class="modal-panel${extra}"><div class="sheet-grip" aria-hidden="true"></div>
    <div class="modal-hd"><h2 id="${titleId}"></h2><button class="x-btn" type="button" data-close aria-label="닫기">${ico('close')}</button></div>
    <div class="modal-body" id="${bodyId}"></div>
  </div></div>`;
  return m('modalShow', 'qvTitle', 'qvBody', ' modal-wide') + m('modalReview', 'rvTitle', 'rvBody');
}

function footer(u) {
  return `<footer class="ft"><div class="wrap">
  <div class="ft-top">
    <div class="ft-brand"><img src="${u('assets/img/brand/logo-h-white.png')}" alt="${SITE.brand} PAROOT" width="320" height="57" loading="lazy"><p>${esc(SITE.en)}<br>${esc(SITE.tagline)} ${esc(SITE.intro)}</p></div>
    <div class="ft-links">
      <div><b>공연</b><ul>${SHOWS.map(s => `<li><a href="${u(`shows/${s.slug}/`)}">${esc(s.title)}</a></li>`).join('')}</ul></div>
      <div><b>파릇</b><ul><li><a href="${u('about/')}">회사 소개·연혁</a></li><li><a href="${u('news/')}">보도·오디션 소식</a></li><li><a href="${u('visit/')}">공연장 오시는 길</a></li><li><a href="${u('faq/')}">자주 묻는 질문</a></li><li><a href="${u('blog/')}">대학로 연극 가이드</a></li></ul></div>
      <div><b>문의</b><ul><li><a href="${u('contact/')}">공연·제휴·단체 관람</a></li><li><a href="mailto:${SITE.email}">${SITE.email}</a></li><li><a href="mailto:${SITE.audition}">${SITE.audition}</a></li><li><a href="tel:${SITE.phone.replace(/-/g, '')}">${SITE.phone}</a></li><li><a href="${u('privacy/')}">개인정보처리방침</a></li></ul></div>
    </div>
  </div>
  <p class="ft-biz"><span>상호 ${SITE.name}</span><span>대표 ${SITE.ceo}</span><span>사업자등록번호 ${SITE.bizNo}</span><span>주소 ${SITE.address.full}</span><span>대표전화 ${SITE.phone}</span><span>이메일 ${SITE.email}</span><br>© ${new Date().getFullYear()} PAROOT. All rights reserved.</p>
</div></footer>`;
}

// 빠른 보기 모달·관람 도우미에서 쓰는 공연 요약(JSON)
export function showData(u) {
  return SHOWS.map(s => {
    const v = venueOf(s);
    return {
      id: s.id, title: s.title, genre: `${s.kind} · ${s.genre}`, hook: s.hook, url: `shows/${s.slug}/`, booking: s.booking.url,
      poster: `assets/img/shows/${s.slug}/poster.webp`, thumb: `assets/img/shows/${s.slug}/thumb.webp`,
      audience: s.audience, whyFor: s.whyFor,
      facts: [['공연장', `${v.name}${v.alias ? ` (${v.alias})` : ''}`], ['가는 길', v.walk], ['공연 시간', `${s.runtime}분`], ['관람 연령', s.age], ['회차', s.schedule.map(([d, t]) => `${d} ${t}`).join(' / ')], ['가격', `${won(priceFrom(s))}부터 (정가 ${won(Math.max(...s.prices.map(p => p.normal)))})`]],
      rating: s.rating ? { avg: s.rating.avg, count: s.rating.count, asof: s.rating.asof.replace(/-/g, '.') } : null,
    };
  });
}

export function page({ title, description, url, schema, section, ogImage = 'assets/img/og-default.jpg', ogType = 'website', published, v, noindex, bodyClass = '', extraScripts = '', head = '', keywords = [] }, u, body) {
  const og = /^https?:/.test(ogImage) ? ogImage : SITE.url + ogImage;
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${keywords.length ? `<meta name="keywords" content="${esc(keywords.join(', '))}">\n` : ''}<link rel="canonical" href="${url}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
<meta name="naver-site-verification" content="${SITE.naverVerification}">
<meta name="google-site-verification" content="${SITE.googleVerification}">
<meta name="theme-color" content="#0E0D12">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
${published ? `<meta property="article:published_time" content="${published}T09:00:00+09:00">\n` : ''}<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${u('favicon.ico')}" sizes="any">
<link rel="icon" href="${u('assets/img/brand/favicon-96.png')}" type="image/png" sizes="96x96">
<link rel="apple-touch-icon" href="${u('assets/img/brand/apple-touch-icon.png')}">
<link rel="alternate" type="application/rss+xml" title="파릇 대학로 연극 가이드" href="${SITE.url}blog/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800;900&display=swap">
<link rel="stylesheet" href="${u('assets/css/style.css')}?v=${v}">
${head}${jsonld(schema)}
</head>
<body class="${bodyClass}" data-root="${u('')}">
${sprite}
<a class="skip" href="#main">본문 바로가기</a>
${header(u, section)}
<main id="main">
${body}
</main>
${footer(u)}
${drawers(u)}
${modals()}
<div id="toasts" aria-live="polite"></div>
<button class="totop" type="button" aria-label="맨 위로">${ico('arrow', 'up')}</button>
<script type="application/json" id="showData">${JSON.stringify(showData(u)).replace(/</g, '\\u003c')}</script>
<script src="${u('assets/js/app.js')}?v=${v}" defer></script>
${extraScripts}
</body>
</html>`;
}

// 여러 페이지가 함께 쓰는 조각
import { SITE, SHOWS, VENUES, venueOf, priceFrom, RULES, showBySlug, noticeStatus, noticePeriod } from './data.mjs';
import { esc, won, img, phImg, kdate } from './lib.mjs';
import { ico } from './layout.mjs';

export const stars = n => `<span class="stars" aria-hidden="true">★</span>`;
export const ratingLine = s => s.rating
  ? `<span class="sc-rating">${stars()}<b>${s.rating.avg.toFixed(2)}</b><span class="muted">관람평 ${s.rating.count.toLocaleString('ko-KR')}건</span></span>`
  : `<span class="sc-rating"><span class="tag tag-dk">2026년 10월 개막</span></span>`;

const CAT = { play: '연극', kids: '어린이 뮤지컬', show: '쇼' };

// 공연 카드(라인업·목록)
export function showCard(u, s, { h = 'h3', lazy = true } = {}) {
  const v = venueOf(s);
  return `<article class="show-card" data-cat="${s.cat}">
  ${phImg(u, `assets/img/shows/${s.slug}/poster.webp`, `${s.title} 포스터`, { wrapCls: 'sc-poster', lazy })}
  <div class="sc-body">
    <span class="sc-genre">${CAT[s.cat]} · ${esc(s.genre)}</span>
    <${h} class="sc-title"><a class="sc-link" href="${u(`shows/${s.slug}/`)}">${esc(s.title)}</a></${h}>
    <p class="sc-meta">${esc(v.name)} · ${s.runtime}분 · ${esc(s.age.replace(/\(.*\)/, ''))}<br>${won(priceFrom(s))}부터</p>
    ${ratingLine(s)}
    <div class="sc-actions"><button class="btn btn-ghost-dk btn-s" type="button" data-qv="${s.id}">빠른 보기</button><a class="btn btn-pink btn-s" href="${s.booking.url}" target="_blank" rel="noopener" data-book="${esc(s.title)}">예매${ico('ext')}</a></div>
  </div>
</article>`;
}

// 평점 분포 막대
export function ratingBars(s) {
  if (!s.rating) return '';
  const d = s.rating.dist, tot = Object.values(d).reduce((a, b) => a + b, 0);
  return `<div class="bars" aria-label="${esc(s.title)} 평점 분포">${[5, 4, 3, 2, 1].map(k => { const p = d[k] / tot * 100; return `<div class="bar"><span>${k === 5 ? '5점' : k === 1 ? '1점대' : k + '점대'}</span><i style="--w:${p.toFixed(1)}%"></i><span>${p >= 1 ? Math.round(p) : p.toFixed(1)}%</span></div>`; }).join('')}</div>`;
}

// u 를 넘기면 카드 머리에 공연 포스터 썸네일과 점수를 함께 보여 준다(홈 롤링 후기)
export function reviewCard(s, r, u = null) {
  const meta = `${r.who} · ${kdate(r.date)} 관람 · ★${r.score}`;
  const head = u
    ? `<span class="rv-top"><img class="rv-thumb" src="${u(`assets/img/shows/${s.slug}/thumb.webp`)}" alt="" width="32" height="40" loading="lazy" decoding="async"><span class="tag tag-pink">${esc(s.title)}</span><span class="rv-score">★ ${r.score}</span></span>`
    : `<span class="tag tag-pink">${esc(s.title)}</span>`;
  return `<button class="rv-card" type="button" data-show="${esc(s.title)}" data-full="${esc(r.body)}" data-meta="${esc(meta + ' · 네이버 예약 관람평')}">${head}<q>${esc(r.body.replace(/\s*\n+\s*/g, ' '))}</q><span class="who"><span>${esc(r.who)} · ${kdate(r.date)}</span><span class="stars">${'★'.repeat(Math.round(r.score))}</span></span></button>`;
}

export function faqAcc(list, prefix, { open = 0 } = {}) {
  return `<div class="acc">${list.map((f, i) => `<div class="acc-item${i < open ? ' open' : ''}"><h3 style="margin:0"><button class="acc-btn" type="button" aria-expanded="${i < open}" aria-controls="${prefix}-${i}">${esc(f.q).replace(/&lt;(.+?)&gt;/g, '「$1」')}<span class="pm" aria-hidden="true"></span></button></h3><div class="acc-panel" id="${prefix}-${i}"><div><div class="acc-inner"><p>${esc(f.a).replace(/&lt;(.+?)&gt;/g, '「$1」')}</p></div></div></div></div>`).join('')}</div>`;
}

export const mapUrl = v => `https://map.naver.com/p/search/${encodeURIComponent(v.addr.replace(/ \d+층$| 지하 1층$/, ''))}`;

export function venueCard(u, v, { h = 'h3' } = {}) {
  const shows = SHOWS.filter(s => s.venue === v.id);
  return `<article class="venue" id="v-${v.id}">
  <span class="tag">혜화역 ${v.exit}번 출구</span>
  <${h}>${esc(v.name)}${v.alias ? ` <small class="muted" style="font-size:.7em;font-weight:600">${esc(v.alias)}</small>` : ''}</${h}>
  <div class="shows">${shows.map(s => `<a class="tag tag-pink" href="${u(`shows/${s.slug}/`)}">${esc(s.title)}</a>`).join('')}</div>
  <dl><dt>주소</dt><dd>${esc(v.addr)}</dd><dt>가는 길</dt><dd>${esc(v.walk)}</dd><dt>주차</dt><dd>주차 시설 없음</dd></dl>
  <div class="row"><a class="btn btn-dark btn-s" href="${mapUrl(v)}" target="_blank" rel="noopener">${ico('map')}네이버 지도</a><button class="btn btn-line btn-s" type="button" data-copy="${esc(v.addr)}" data-copy-msg="${esc(v.name)} 주소를 복사했습니다">${ico('copy')}주소 복사</button></div>
</article>`;
}

export function rulesList(s) {
  return `<ul class="guide-list">${RULES[s.rules].map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
}

export function crumbs(u, items) {
  return `<ol class="crumbs">${items.map(([t, h], i) => i < items.length - 1 ? `<li><a href="${u(h)}">${esc(t)}</a></li>` : `<li aria-current="page">${esc(t)}</li>`).join('')}</ol>`;
}

export function postCard(u, p, { lazy = true } = {}) {
  return `<a class="post-card reveal" href="${u(`blog/${p.slug}/`)}">${phImg(u, p.thumb, '', { wrapCls: 'pc-cover', lazy })}<span class="pc-cat">${esc(p.category)}</span><span class="pc-title">${esc(p.title)}</span><p class="pc-desc">${esc(p.description)}</p><span class="pc-meta">${kdate(p.date)} · ${p.minutes}분 읽기</span></a>`;
}

// 사진 크게 보기(라이트박스) — [data-lightbox] 버튼이 있는 페이지에 한 번 넣는다
export const lightbox = `<div class="modal" id="modalImg" hidden role="dialog" aria-modal="true" aria-labelledby="lbTitle"><div class="modal-scrim" data-close></div><div class="modal-panel modal-wide"><div class="sheet-grip" aria-hidden="true"></div><div class="modal-hd"><h2 id="lbTitle">무대 사진</h2><button class="x-btn" type="button" data-close aria-label="닫기">${ico('close')}</button></div><div class="modal-body lb-body"><div class="ph"><img id="lbImg" src="data:," alt=""></div><div class="lb-nav"><button class="btn btn-line btn-s" type="button" data-lb="-1">이전</button><span id="lbCount" class="muted"></span><button class="btn btn-line btn-s" type="button" data-lb="1">다음</button></div></div></div></div>`;

// 공지사항·이벤트 한 건: 누르면 펼쳐져 본문과 원본 이미지를 보여 준다(주소 #id 로 바로 열림)
const NCAT = { event: '이벤트', notice: '공지', audition: '오디션' };
export function noticeItem(u, n) {
  const st = noticeStatus(n), show = n.show ? showBySlug(n.show) : null, per = noticePeriod(n);
  const thumb = n.imgs ? `<span class="nt-thumb ph">${img(u, `assets/img/notice/${n.id}-t.webp`, '')}</span>` : `<span class="nt-thumb nt-thumb-ico" aria-hidden="true">${ico('bell')}</span>`;
  const pics = Array.from({ length: n.imgs }, (_, k) => img(u, `assets/img/notice/${n.id}${k ? `-${k + 1}` : ''}.webp`, `${n.title.replace(/[「」]/g, '')} 안내 이미지${n.imgs > 1 ? ` ${k + 1}` : ''}`)).join('');
  const acts = [
    show && n.cat === 'event' && st.key !== 'closed' ? `<a class="btn btn-pink btn-s" href="${show.booking.url}" target="_blank" rel="noopener" data-book="${esc(show.title)}">${ico('ticket')}네이버 예약에서 예매</a>` : '',
    show ? `<a class="btn btn-line btn-s" href="${u(`shows/${show.slug}/`)}">${esc(show.title)} 공연 정보</a>` : '',
    n.cat === 'audition' ? `<a class="btn btn-line btn-s" href="mailto:${SITE.audition}">${ico('mail')}${SITE.audition}</a>` : '',
    `<button class="btn btn-line btn-s" type="button" data-copy-link="#${n.id}">${ico('copy')}링크 복사</button>`,
  ].join('');
  return `<article class="nt" id="${n.id}" data-cat="${n.cat}" data-st="${st.key}">
  <h3 class="nt-h"><button class="nt-head" type="button" aria-expanded="false" aria-controls="${n.id}-body">${thumb}<span class="nt-main"><span class="nt-tags"><span class="nt-cat nt-cat-${n.cat}">${NCAT[n.cat]}</span><span class="nt-st st-${st.key}">${esc(st.label)}</span>${show ? `<span class="nt-show">${esc(show.title)}</span>` : ''}</span><span class="nt-title">${esc(n.title)}</span><span class="nt-meta">${per && per !== '상시' ? `기간 ${per} · ` : ''}게시 ${kdate(n.date)}</span><span class="nt-sum">${esc(n.summary)}</span></span><span class="pm" aria-hidden="true"></span></button></h3>
  <div class="nt-body" id="${n.id}-body" hidden>
    ${n.body.length ? `<ul class="nt-points">${n.body.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}${n.note ? `<p class="nt-note">${esc(n.note)}</p>` : ''}
    <div class="nt-acts">${acts}</div>
    ${pics ? `<div class="nt-imgs">${pics}</div>` : ''}
  </div>
</article>`;
}

export { VENUES };

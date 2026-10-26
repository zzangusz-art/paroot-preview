// 하위 페이지 본문
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, SHOWS, FAQ, VENUES, PRESS, NOTICES, BLOG_CATEGORIES, venueOf, priceFrom, ASOF_LABEL, totalReviews } from './data.mjs';
import { esc, won, img, phImg, kdate, nl2br } from './lib.mjs';
import { ico } from './layout.mjs';
import { showCard, ratingBars, reviewCard, faqAcc, venueCard, rulesList, crumbs, postCard, mapUrl, ratingLine, lightbox } from './parts.mjs';
import { historyBlock, awardsPress, ctaBand, pressCard } from './home.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMGS = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/images.json'), 'utf8'));
const CAT = { play: '연극', kids: '어린이 뮤지컬', show: '쇼' };
const q = s => esc(s).replace(/&lt;(.+?)&gt;/g, '「$1」');

function pageHd(u, { crumb, eyebrow, title, lead }) {
  return `<section class="page-hd"><div class="wrap">${crumbs(u, crumb)}${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}</div></section>`;
}


// ── 공연 전체 ──
export function showsIndex(u) {
  // 휴대폰에서는 표가 공연별 카드로 바뀐다(data-label 이 칸 이름)
  const rows = SHOWS.map(s => { const v = venueOf(s); return `<tr><th scope="row"><a href="${u(`shows/${s.slug}/`)}">${esc(s.title)}</a></th><td data-label="장르"><span>${CAT[s.cat]} · ${esc(s.genre)}</span></td><td data-label="공연장"><span>${esc(v.name)}<br><small class="muted">혜화역 ${v.exit}번 출구</small></span></td><td data-label="시간"><span>${s.runtime}분</span></td><td data-label="관람 연령"><span>${esc(s.age.replace(/\(.*\)/, ''))}</span></td><td data-label="회차"><span>${s.schedule.map(([d, t]) => `${d} ${t}`).join('<br>')}</span></td><td data-label="가격"><span>${won(priceFrom(s))}~</span></td><td data-label="관람평"><span>${s.rating ? `★${s.rating.avg.toFixed(2)} (${s.rating.count.toLocaleString('ko-KR')})` : '—'}</span></td></tr>`; }).join('');
  return `${pageHd(u, { crumb: [['홈', ''], ['공연', 'shows/']], eyebrow: 'Shows', title: '대학로 연극·뮤지컬<br>파릇 공연 전체', lead: `연극 ${SHOWS.filter(s => s.cat === 'play').length}편, 어린이 뮤지컬 ${SHOWS.filter(s => s.cat === 'kids').length}편, 심야 쇼 ${SHOWS.filter(s => s.cat === 'show').length}편. 모두 혜화역에서 걸어서 5분 안의 대학로 공연장에서 열립니다(${ASOF_LABEL} 기준).` })}
<section class="sec-tight"><div class="wrap">
  <p class="answer">대학로·혜화에서 지금 볼 수 있는 파릇 공연은 로맨틱 코미디 「한뼘사이」, 오피스 로맨틱 코미디 「사내연애 보고서」, 섹시 코미디 「플러팅」, 금·토 심야 드랙퀸 쇼 「드랙인혜화」, 어린이 참여형 뮤지컬 「늑대숲 또옹돼지 원정대」와 「피노키오야 노올자」, 힐링 코미디 「수상한 룸메이트」(원작 비누향기)입니다.</p>
  <div class="blog-filter tabs-like" role="group" aria-label="공연 분류" id="showFilter">
    <button class="chip" type="button" data-sf="all" aria-pressed="true">전체 ${SHOWS.length}</button>
    ${['play', 'kids', 'show'].map(c => `<button class="chip" type="button" data-sf="${c}" aria-pressed="false" id="${c === 'kids' ? 'kids' : c}">${CAT[c]} ${SHOWS.filter(s => s.cat === c).length}</button>`).join('')}
  </div>
  <div class="show-grid">${SHOWS.map(s => showCard(u, s, { h: 'h2' })).join('')}</div>
</div></section>
<section class="sec-tight sec-soft"><div class="wrap">
  <h2 class="h2" style="font-size:clamp(24px,3vw,34px);margin-bottom:22px">한 번에 비교하기</h2>
  <div class="tbl-scroll tbl-cards"><table class="cmp cmp-wide"><thead><tr><th>공연</th><th>장르</th><th>공연장</th><th>시간</th><th>관람 연령</th><th>회차</th><th>가격</th><th>관람평</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p class="muted" style="font-size:13.5px;margin-top:12px">가격은 네이버 예약에서 증빙 없이 살 수 있는 가장 낮은 일반 가격입니다. 중고생·대학생·군인 등 할인은 공연 상세에서 확인하세요. 회차는 날짜에 따라 바뀔 수 있습니다.</p>
</div></section>
${ctaBand(u)}`;
}

// ── 공연 상세 ──
export function showPage(u, s, posts) {
  const v = venueOf(s);
  const im = IMGS[s.slug];
  const others = SHOWS.filter(x => x.id !== s.id);
  const related = posts.filter(p => p.show === s.slug).slice(0, 3);
  const maxNormal = Math.max(...s.prices.map(p => p.normal));
  const table = [['공연장', `${esc(v.name)}${v.alias ? ` (${esc(v.alias)})` : ''}<br><small>${esc(v.addr)}</small>`], ['가는 길', esc(v.walk)], ['공연 기간', esc(s.sinceLabel)], ['공연 시간', `${s.runtime}분`], ['관람 연령', esc(s.age)], ['회차', s.schedule.map(([d, t]) => `${d} ${t}`).join('<br>')], ['가격', `정가 ${won(maxNormal)} · 할인 ${won(priceFrom(s))}부터`], ['제작', esc(s.credits || SITE.name)]];
  const firstAnswer = `${s.full}${s.original ? `(원작 「${s.original}」)` : ''}은 ${s.lead.replace(/\.$/, '')}. 공연장은 ${v.name}(${v.addr}), 공연 시간은 ${s.runtime}분, 관람 연령은 ${s.age.replace(/\(.*\)/, '')}입니다.`;
  return `<section class="show-hero">
  <div class="bg" style="background-image:url('${u(`assets/img/shows/${s.slug}/cover.webp`)}')" aria-hidden="true"></div>
  <div class="wrap">
    ${crumbs(u, [['홈', ''], ['공연', 'shows/'], [s.title, `shows/${s.slug}/`]])}
    <div class="sh-grid">
      ${phImg(u, `assets/img/shows/${s.slug}/poster.webp`, `${s.title} 포스터`, { wrapCls: 'sh-poster', priority: true })}
      <div class="sh-info">
        <span class="tag tag-dk">${CAT[s.cat]} · ${esc(s.genre)}</span>
        <h1>${esc(s.title)}${s.original ? `<small style="display:block;font-size:.34em;font-weight:600;color:#cfc8d9;margin-top:8px">원작 「${esc(s.original)}」</small>` : ''}</h1>
        <p class="lead">${esc(s.hook)}</p>
        ${s.rating ? `<p class="sc-rating" style="font-size:15.5px"><span class="stars">★</span><b>${s.rating.avg.toFixed(2)}</b><span style="color:#cfc8d9">네이버 예약 관람평 ${s.rating.count.toLocaleString('ko-KR')}건 · ${kdate(s.rating.asof)} 기준</span></p>` : ''}
        <dl class="sh-table">${table.map(([k, val]) => `<dt>${k}</dt><dd>${val}</dd>`).join('')}</dl>
        <div class="sh-cta"><a class="btn btn-pink" href="${s.booking.url}" target="_blank" rel="noopener" data-book="${esc(s.title)}">${ico('ticket')}네이버 예약으로 예매</a><a class="btn btn-ghost-dk" href="#price">가격·회차 보기</a><button class="btn btn-ghost-dk" type="button" data-share>${ico('share')}공유</button></div>
      </div>
    </div>
  </div>
</section>
<nav class="subnav" aria-label="공연 정보 메뉴"><div class="wrap"><a href="#intro">작품 소개</a>${im.gallery.length ? '<a href="#stage">무대 사진</a>' : ''}<a href="#detail">상세 정보</a>${s.rating ? '<a href="#reviews">관람 후기</a>' : ''}<a href="#price">가격·회차</a><a href="#guide">관람 안내</a><a href="#way">오시는 길</a><a href="#faq">FAQ</a></div></nav>
<section class="sec-tight" id="intro"><div class="wrap">
  <p class="answer">${q(firstAnswer)}</p>
  <div class="two-col">
    <div><p class="eyebrow">Story</p><h2 class="h2" style="font-size:clamp(26px,3.4vw,40px)">${esc(s.title)} 줄거리</h2></div>
    <p class="synopsis">${esc(s.synopsis)}</p>
  </div>
  <div class="points">${s.points.map(([t, d]) => `<div class="point reveal"><b>${esc(t)}</b><span>${esc(d)}</span></div>`).join('')}</div>
</div></section>
${im.gallery.length ? `<section class="sec-tight sec-soft" id="stage"><div class="wrap">
  <div class="sec-head" style="margin-bottom:24px"><div><p class="eyebrow">Stage</p><h2 class="h2" style="font-size:clamp(24px,3vw,34px)">무대 사진</h2></div><span class="muted">사진을 누르면 크게 볼 수 있습니다</span></div>
  <div class="gallery">${im.gallery.map((g, i) => `<button class="gal" type="button" data-lightbox="${u(`assets/img/shows/${s.slug}/gallery/${String(i + 1).padStart(2, '0')}.webp`)}" data-alt="${esc(s.title)} 무대 사진 ${i + 1}">${phImg(u, `assets/img/shows/${s.slug}/gallery/${String(i + 1).padStart(2, '0')}.webp`, `${s.title} 무대 사진 ${i + 1}`, { sizes: '(max-width: 760px) calc(50vw - 25px), 300px' })}</button>`).join('')}</div>
</div></section>` : ''}
<section class="sec-tight" id="detail"><div class="wrap">
  <div class="sec-head" style="margin-bottom:24px"><div><p class="eyebrow">Details</p><h2 class="h2" style="font-size:clamp(24px,3vw,34px)">상세 정보</h2><p class="lead" style="font-size:15.5px">네이버 예약 상세 안내와 같은 내용입니다. 기간 한정 이벤트 안내는 뺐습니다.</p></div></div>
  <div class="detail-fold" id="fold-${s.id}"><div class="detail-imgs">${im.detail.map(([n]) => phImg(u, `assets/img/shows/${s.slug}/detail/${n}.webp`, `${s.title} 상세 안내 ${n}`)).join('')}</div></div>
  <div class="more-wrap"><button class="btn btn-dark" type="button" data-fold="fold-${s.id}" aria-expanded="false" aria-controls="fold-${s.id}"><span>상세 정보 더 보기</span>${ico('chev')}</button></div>
</div></section>
${s.rating ? `<section class="sec-tight sec-soft" id="reviews"><div class="wrap">
  <div class="sec-head" style="margin-bottom:28px"><div><p class="eyebrow">Reviews</p><h2 class="h2" style="font-size:clamp(24px,3vw,34px)">${esc(s.title)} 관람 후기</h2></div><a class="btn btn-line btn-s" href="${s.booking.url}" target="_blank" rel="noopener">네이버 예약에서 전체 후기${ico('ext')}</a></div>
  <div class="two-col" style="align-items:start">
    <div class="rv-stat"><span class="t">네이버 예약 관람평</span><div class="n"><b>${s.rating.avg.toFixed(2)}</b><span>${s.rating.count.toLocaleString('ko-KR')}건 · ${kdate(s.rating.asof)} 기준${s.rating.note ? ` · ${esc(s.rating.note)}` : ''}</span></div>${ratingBars(s)}
    ${s.voted.length ? `<div class="kw" style="margin:18px 0 0">${s.voted.map(([k, n]) => `<span>“${esc(k)}” <b>${n}</b></span>`).join('')}</div>` : ''}</div>
    <div class="rv-list">${s.reviews.map(r => reviewCard(s, r)).join('')}</div>
  </div>
  <p class="muted" style="font-size:13.5px;margin-top:16px">후기는 네이버 예약에 공개된 관람평을 맞춤법 수정 없이 옮겼고, 작성자 이름은 일부 가렸습니다. 낮은 점수의 후기도 함께 싣습니다.</p>
</div></section>` : ''}
<section class="sec-tight" id="price"><div class="wrap two-col">
  <div><p class="eyebrow">Tickets</p><h2 class="h2" style="font-size:clamp(24px,3vw,34px)">가격과 회차</h2><p class="lead" style="font-size:15.5px">${ASOF_LABEL} 네이버 예약 기준입니다. 할인 권종은 현장에서 증빙을 확인합니다.</p>
    <div class="price-list">${s.prices.map(p => `<div class="price-row"><span>${esc(p.name)}${p.note ? `<br><small class="muted">${esc(p.note)}</small>` : ''}</span><span>${p.normal > p.price ? `<s>${won(p.normal)}</s>` : ''}<b>${won(p.price)}</b></span></div>`).join('')}</div>
  </div>
  <div><h3 style="font-size:20px;margin:6px 0 14px">공연 회차</h3><div class="tbl-scroll"><table class="cmp"><tbody>${s.schedule.map(([d, t]) => `<tr><th scope="row">${d}</th><td>${t}</td></tr>`).join('')}</tbody></table></div><p class="muted" style="font-size:14px;margin-top:12px">${esc(s.scheduleNote)}</p>
    <div class="sh-cta" style="margin-top:18px"><a class="btn btn-pink" href="${s.booking.url}" target="_blank" rel="noopener" data-book="${esc(s.title)}">${ico('ticket')}날짜·회차 골라 예매</a>${s.booking.phone ? `<a class="btn btn-line" href="tel:${s.booking.phone.replace(/-/g, '')}">${ico('phone')}${s.booking.phone}</a>` : ''}</div>
    ${s.booking.operator ? `<p class="muted" style="font-size:13.5px;margin-top:10px">네이버 예약 운영 사업자: ${esc(s.booking.operator)}</p>` : ''}
    ${s.instagram ? `<p style="margin-top:10px"><a class="btn btn-line btn-s" href="${s.instagram}" target="_blank" rel="noopener">인스타그램 @drag_in_hyehwa${ico('ext')}</a></p>` : ''}
  </div>
</div></section>
<section class="sec-tight sec-soft" id="guide"><div class="wrap two-col">
  <div><p class="eyebrow">Guide</p><h2 class="h2" style="font-size:clamp(24px,3vw,34px)">관람 전에 꼭 확인하세요</h2><p class="lead" style="font-size:15.5px">네이버 예약 확정 안내에 적힌 규정입니다.</p></div>
  ${rulesList(s)}
</div></section>
<section class="sec-tight" id="way"><div class="wrap two-col">
  <div><p class="eyebrow">Location</p><h2 class="h2" style="font-size:clamp(24px,3vw,34px)">${esc(v.name)} 오시는 길</h2><p class="lead" style="font-size:15.5px">지하철 4호선 혜화역 ${v.exit}번 출구에서 걸어서 5분 이내입니다.</p><a class="btn btn-line" href="${u('visit/')}">다른 공연장 보기${ico('arrow')}</a></div>
  ${venueCard(u, v)}
</div></section>
<section class="sec-tight sec-soft" id="faq"><div class="wrap two-col">
  <div><p class="eyebrow">FAQ</p><h2 class="h2" style="font-size:clamp(24px,3vw,34px)">${esc(s.title)}<br>자주 묻는 질문</h2></div>
  ${faqAcc(s.faq, `sfaq-${s.id}`, { open: 1 })}
</div></section>
${related.length ? `<section class="sec-tight"><div class="wrap"><h2 class="h2" style="font-size:clamp(24px,3vw,34px);margin-bottom:24px">${esc(s.title)} 관련 가이드</h2><div class="posts">${related.map(p => postCard(u, p)).join('')}</div></div></section>` : ''}
<section class="lineup" style="padding:clamp(64px,8vw,100px) 0"><div class="wrap"><h2 class="h2" style="font-size:clamp(24px,3vw,34px);margin-bottom:28px">함께 보면 좋은 파릇 공연</h2></div><div class="lu-pin static"><div class="lu-rail">${others.map(x => showCard(u, x)).join('')}</div></div></section>
<div class="mbar"><a class="btn btn-line" href="#price">가격·회차</a><a class="btn btn-pink" href="${s.booking.url}" target="_blank" rel="noopener" data-book="${esc(s.title)}">${ico('ticket')}예매하기</a></div>
${lightbox}`;
}

// ── 회사 소개 ──
export function about(u) {
  return `${pageHd(u, { crumb: [['홈', ''], ['파릇 소개', 'about/']], eyebrow: 'About', title: '삶의 이유는<br>즐거움이다.', lead: '주식회사 파릇(PAROOT)은 서울 대학로에서 연극과 어린이 뮤지컬을 제작·기획·운영하는 공연 제작사입니다.' })}
<section class="sec-tight"><div class="wrap two-col">
  <div><p class="eyebrow">Performance Group Paroot</p><h2 class="h2" style="font-size:clamp(26px,3.4vw,40px)">대학로 공연의 중심에서<br>관객의 저녁을 만듭니다</h2></div>
  <div class="prose" style="font-size:17px">
    <p class="answer" style="margin-bottom:22px">주식회사 파릇은 2016년 어린이뮤지컬 「성냥팔이 소녀」의 기획·운영을 시작으로 연극 「한뼘사이」, 「사내연애 보고서」, 「플러팅」, 「비누향기」(현 「수상한 룸메이트」)와 어린이뮤지컬 「늑대숲 또옹돼지 원정대」, 「피노키오야 노올자」를 제작·기획·운영해 왔습니다. 2026년 10월에는 대학로의 밤을 위한 드랙퀸 쇼 「드랙인혜화」를 열었습니다.</p>
    <p>파릇이 만드는 공연의 기준은 하나입니다. 공연이 처음인 사람도 부담 없이 즐길 수 있을 것. 연령, 성별과 상관없이 가족과 연인 모두가 편하게 웃고 나올 수 있는 무대를 목표로, 관객의 반응이 녹아 있는 트렌디한 공연을 만듭니다.</p>
    <p>장르와 연령별로 관객이 원하는 것을 꾸준히 찾고, 그 결과를 다음 무대에 반영하는 공연 제작·기획사로 자라는 것이 파릇의 목표입니다.</p>
  </div>
</div></section>
<section class="sec-tight sec-soft"><div class="wrap">
  <div class="facts" style="margin-top:0">
    <div class="fact"><b>2016</b><span>설립 첫 공연 기획</span></div>
    <div class="fact"><b>${SHOWS.length}<small>편</small></b><span>현재 대학로 공연 작품</span></div>
    <div class="fact"><b>${totalReviews().toLocaleString('ko-KR')}<small>건</small></b><span>네이버 예약 관람평 합계</span></div>
    <div class="fact"><b>3<small>년 연속</small></b><span>「한뼘사이」 올해의 우수브랜드 대상 공연·연극 부문 1위</span></div>
  </div>
</div></section>
<section class="sec">${'<div class="wrap">' + historyBlock() + '</div>'}</section>
<section class="sec sec-dark"><div class="wrap">
  <div class="sec-head"><div><p class="eyebrow">Awards &amp; Press</p><h2 class="h2">수상과 보도</h2></div><a class="btn btn-ghost-dk" href="${u('news/')}">보도 전체${ico('arrow')}</a></div>
  ${awardsPress(u, 6)}
</div></section>
<section class="sec-tight"><div class="wrap">
  <div class="sec-head" style="margin-bottom:24px"><div><p class="eyebrow">Archive</p><h2 class="h2" style="font-size:clamp(24px,3vw,34px)">무대 기록</h2></div><span class="muted">사진을 누르면 크게 볼 수 있습니다</span></div>
  <div class="gallery">${[1, 2, 3, 4, 5, 6].map(i => `<button class="gal" type="button" data-lightbox="${u(`assets/img/stage/archive-0${i}.webp`)}" data-alt="파릇 공연 무대 기록 ${i}">${phImg(u, `assets/img/stage/archive-0${i}.webp`, `파릇 공연 무대 기록 ${i}`)}</button>`).join('')}</div>
</div></section>
<section class="sec-tight sec-soft"><div class="wrap two-col">
  <div><p class="eyebrow">Company</p><h2 class="h2" style="font-size:clamp(24px,3vw,34px)">회사 정보</h2></div>
  <div class="tbl-scroll"><table class="cmp"><tbody>
    <tr><th scope="row">상호</th><td>${SITE.name} (PAROOT)</td></tr><tr><th scope="row">대표</th><td>${SITE.ceo}</td></tr><tr><th scope="row">사업자등록번호</th><td>${SITE.bizNo}</td></tr>
    <tr><th scope="row">주소</th><td>${SITE.address.full}</td></tr><tr><th scope="row">대표전화</th><td><a href="tel:${SITE.phone.replace(/-/g, '')}">${SITE.phone}</a></td></tr>
    <tr><th scope="row">공연·제휴 문의</th><td><a href="mailto:${SITE.email}">${SITE.email}</a></td></tr><tr><th scope="row">오디션</th><td><a href="mailto:${SITE.audition}">${SITE.audition}</a></td></tr>
  </tbody></table></div>
</div></section>
${ctaBand(u)}
${lightbox}`;
}

// ── 오시는 길 ──
export function visit(u) {
  const exits = [...new Set(VENUES.map(v => v.exit))].sort();
  return `${pageHd(u, { crumb: [['홈', ''], ['오시는 길', 'visit/']], eyebrow: 'Venues', title: '혜화역 출구별<br>파릇 공연장 오시는 길', lead: '파릇 공연은 대학로 다섯 곳의 공연장에서 열립니다. 예매한 공연의 공연장과 가까운 출구를 확인해 주세요.' })}
<section class="sec-tight"><div class="wrap">
  <p class="answer">한뼘사이 전용관(라온아트홀)·제나아트홀·라온씨어터는 혜화역 2번 출구 KFC 골목, 서연아트홀은 4번 출구 이디야커피 골목, 드랙인혜화가 열리는 뮤지컬펍 커튼콜은 1번 출구 스타벅스 골목에 있습니다. 모두 걸어서 5분 이내이며 주차 시설은 없습니다.</p>
  <div class="tabs" role="tablist" aria-label="혜화역 출구">${exits.map((e, i) => `<button role="tab" id="tab-e${e}" aria-controls="pan-e${e}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${e}번 출구 · ${VENUES.filter(v => v.exit === e).length}곳</button>`).join('')}</div>
  ${exits.map((e, i) => `<div role="tabpanel" id="pan-e${e}" aria-labelledby="tab-e${e}"${i ? ' hidden' : ''}><div class="venues">${VENUES.filter(v => v.exit === e).map(v => venueCard(u, v, { h: 'h2' })).join('')}</div></div>`).join('')}
</div></section>
<section class="sec-tight sec-soft"><div class="wrap two-col">
  <div><p class="eyebrow">Tips</p><h2 class="h2" style="font-size:clamp(24px,3vw,34px)">도착 전에 알아 두면 좋은 것</h2></div>
  <ul class="guide-list">
    <li>연극 매표소는 공연 1시간 전, 어린이 뮤지컬은 50분 전에 열립니다. 좌석은 티켓을 받은 순서대로 배정됩니다.</li>
    <li>공연이 시작되면 입장할 수 없습니다. 혜화역에서 공연장까지 5분, 매표·화장실까지 생각해 15~20분 일찍 도착하는 편이 좋습니다.</li>
    <li>공연장에 주차 시설이 없습니다. 지하철 4호선 혜화역을 이용하거나 인근 유료주차장을 이용해 주세요.</li>
    <li>라온아트홀(한뼘사이 전용관)과 제나아트홀·라온씨어터는 같은 골목에서 마주 보고 있습니다. 건물 이름과 층을 확인하세요.</li>
  </ul>
</div></section>
<section class="sec-tight"><div class="wrap">${faqAcc(FAQ.filter(f => f.pages.includes('visit')), 'vfaq', { open: 1 })}</div></section>`;
}

// ── 소식 ──
export function news(u) {
  return `${pageHd(u, { crumb: [['홈', ''], ['소식', 'news/']], eyebrow: 'News', title: '보도와 오디션 소식', lead: '언론에 소개된 파릇 공연 이야기와 작품별 오디션 공지입니다.' })}
<section class="sec-tight"><div class="wrap">
  <div class="tabs" role="tablist" aria-label="소식 분류"><button role="tab" id="tab-press" aria-controls="pan-press" aria-selected="true">언론 보도 ${PRESS.length}</button><button role="tab" id="tab-aud" aria-controls="pan-aud" aria-selected="false" tabindex="-1">오디션 공지 ${NOTICES.length}</button></div>
  <div role="tabpanel" id="pan-press" aria-labelledby="tab-press"><div class="press-grid press-lt">${PRESS.map(p => pressCard(u, p)).join('')}</div><p class="muted" style="font-size:13.5px;margin-top:14px">날짜는 기존 파릇 홈페이지 뉴스 게시판에 올린 날짜입니다.</p></div>
  <div role="tabpanel" id="pan-aud" aria-labelledby="tab-aud" hidden><ul class="press press-lt">${NOTICES.map(n => `<li><div class="pr"><span class="src">오디션</span><span class="tt">${esc(n.t)}</span><span class="dt">${kdate(n.d)}</span><span></span></div></li>`).join('')}</ul>
    <div class="cc" style="margin-top:24px"><h3>오디션 지원</h3><p>파릇은 언제나 재능 있는 배우를 환영합니다. 프로필과 포트폴리오, 사진 등 본인을 알릴 수 있는 자료를 보내 주시면 담당 부서에서 확인 후 연락드립니다.</p><span class="mail">${SITE.audition}</span><div class="row" style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-dark btn-s" href="mailto:${SITE.audition}?subject=${encodeURIComponent('[오디션 지원] 이름 / 지원 작품')}">${ico('mail')}메일 쓰기</a><button class="btn btn-line btn-s" type="button" data-copy="${SITE.audition}" data-copy-msg="오디션 메일 주소를 복사했습니다">${ico('copy')}주소 복사</button></div></div>
  </div>
</div></section>`;
}

// ── 문의 ──
export function contact(u) {
  const showOpts = SHOWS.map(s => `<option>${esc(s.title)}</option>`).join('');
  return `${pageHd(u, { crumb: [['홈', ''], ['문의', 'contact/']], eyebrow: 'Contact', title: '공연·제휴·단체 관람 문의', lead: '주식회사 파릇은 공연과 관련한 다양한 제휴 제안에 열려 있습니다. 양식에 상관없이 연락 주시면 확인 후 담당 부서에서 연락드립니다.' })}
<section class="sec-tight"><div class="wrap">
  <div class="contact-cards">
    <div class="cc reveal"><span class="tag tag-pink">공연·제휴</span><h2 style="font-size:20px">공연 기획·마케팅 제휴</h2><p>기업·학교 초청 공연, 공연 기획, 마케팅 제휴 제안</p><span class="mail">${SITE.email}</span><button class="btn btn-line btn-s" type="button" data-copy="${SITE.email}" data-copy-msg="문의 메일 주소를 복사했습니다">${ico('copy')}주소 복사</button></div>
    <div class="cc reveal" data-d="1"><span class="tag tag-pink">단체 관람</span><h2 style="font-size:20px">20인 이상 단체 관람</h2><p>날짜·회차, 인원, 작품을 알려 주시면 가능 여부를 안내합니다.</p><span class="mail">${SITE.phone}</span><a class="btn btn-line btn-s" href="tel:${SITE.phone.replace(/-/g, '')}">${ico('phone')}전화 걸기</a></div>
    <div class="cc reveal" data-d="2"><span class="tag tag-pink">오디션</span><h2 style="font-size:20px">배우 오디션 지원</h2><p>프로필·포트폴리오·사진을 보내 주세요. 작품별 공고는 소식 게시판에 올립니다.</p><span class="mail">${SITE.audition}</span><a class="btn btn-line btn-s" href="${u('news/')}">오디션 공지 보기${ico('arrow')}</a></div>
  </div>
</div></section>
<section class="sec-tight sec-soft" id="compose"><div class="wrap two-col">
  <div><p class="eyebrow">Write</p><h2 class="h2" style="font-size:clamp(24px,3vw,34px)">문의 내용 정리하기</h2><p class="lead" style="font-size:15.5px">항목을 채우면 메일 본문이 완성됩니다. 이 페이지는 입력한 내용을 저장하거나 서버로 보내지 않습니다. 메일 앱으로 열거나 복사해서 보내 주세요.</p></div>
  <form class="fd-box" id="composeForm" novalidate>
    <div class="form-grid">
      <label class="fld"><span>문의 유형</span><select name="type"><option>단체 관람</option><option>초청 공연</option><option>공연 기획·마케팅 제휴</option><option>기타</option></select></label>
      <label class="fld"><span>희망 공연</span><select name="show"><option>미정</option>${showOpts}</select></label>
      <label class="fld"><span>희망 날짜</span><input name="date" type="date"></label>
      <label class="fld"><span>예상 인원</span><input name="people" type="number" min="1" inputmode="numeric" placeholder="예: 30"></label>
      <label class="fld full"><span>기관·회사명 <em>*</em></span><input name="org" type="text" autocomplete="organization" required></label>
      <label class="fld"><span>담당자 이름 <em>*</em></span><input name="name" type="text" autocomplete="name" required></label>
      <label class="fld"><span>연락처 <em>*</em></span><input name="tel" type="tel" autocomplete="tel" inputmode="tel" required placeholder="010-0000-0000"></label>
      <label class="fld full"><span>내용</span><textarea name="msg" rows="4" placeholder="원하는 시간대, 좌석 배치, 행사 성격 등을 적어 주세요."></textarea></label>
    </div>
    <div class="sh-cta" style="margin-top:16px"><button class="btn btn-dark" type="submit">${ico('mail')}메일 앱으로 열기</button><button class="btn btn-line" type="button" data-compose-copy>${ico('copy')}내용 복사</button></div>
    <pre class="compose-out" id="composeOut" hidden></pre>
  </form>
</div></section>
<section class="sec-tight"><div class="wrap">${faqAcc(FAQ.filter(f => f.pages.includes('contact')), 'cfaq', { open: 1 })}</div></section>`;
}

// ── FAQ ──
export function faqPage(u) {
  return `${pageHd(u, { crumb: [['홈', ''], ['자주 묻는 질문', 'faq/']], eyebrow: 'FAQ', title: '대학로 연극 관람,<br>자주 묻는 질문', lead: '예매, 입장, 좌석, 주차, 아이와 관람, 단체 문의까지 파릇 공연 기준으로 답합니다.' })}
<section class="sec-tight"><div class="wrap">
  <h2 class="h2" style="font-size:clamp(22px,2.6vw,30px);margin-bottom:18px">관람 공통</h2>
  ${faqAcc(FAQ, 'afaq', { open: 1 })}
  ${SHOWS.map(s => `<h2 class="h2" style="font-size:clamp(22px,2.6vw,30px);margin:56px 0 18px"><a href="${u(`shows/${s.slug}/`)}">${esc(s.title)}</a></h2>${faqAcc(s.faq, `faq-${s.id}`)}`).join('')}
</div></section>`;
}

// ── 블로그 ──
export function blogIndex(u, posts) {
  return `${pageHd(u, { crumb: [['홈', ''], ['대학로 연극 가이드', 'blog/']], eyebrow: 'Daehak-ro Guide', title: '대학로 연극 가이드', lead: '공연 고르는 법, 데이트·모임 동선, 아이와 처음 보는 공연, 관람 매너까지. 파릇 공연기획팀이 현장에서 받는 질문으로 정리합니다.' })}
<section class="sec-tight"><div class="wrap">
  <div class="blog-filter" role="group" aria-label="글 분류"><button class="chip" type="button" data-cat="all" aria-pressed="true">전체</button>${BLOG_CATEGORIES.map(c => `<button class="chip" type="button" data-cat="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('')}</div>
  <div class="posts" id="postList" data-initial="9">${posts.slice(0, 9).map((p, i) => postCard(u, p, { lazy: i > 2 })).join('')}</div>
  <div class="more-wrap"><button class="btn btn-dark" type="button" id="postMore"${posts.length > 9 ? '' : ' hidden'}>더 보기</button></div>
</div></section>`;
}

export function blogPost(u, p, posts) {
  const show = p.show ? SHOWS.find(s => s.slug === p.show) : null;
  const rel = posts.filter(x => x.slug !== p.slug && (x.category === p.category || (show && x.show === p.show))).slice(0, 3);
  return `<div class="readbar" aria-hidden="true"></div>
<section class="page-hd"><div class="wrap">${crumbs(u, [['홈', ''], ['대학로 연극 가이드', 'blog/'], [p.category, 'blog/']])}<p class="eyebrow">${esc(p.category)}</p><h1 style="font-size:clamp(28px,4.2vw,50px)">${esc(p.title)}</h1><p class="lead">${esc(p.description)}</p><div class="post-meta"><span>${kdate(p.date)}</span><span>${p.minutes}분 읽기</span><span>${esc(p.author || '파릇 공연기획팀')}</span></div></div></section>
<section class="sec-tight"><div class="wrap article">
  <article>
    <div class="post-cover">${img(u, p.thumb, p.title, { priority: true })}</div>
    <div class="prose">${p.html}
    ${p.faq.length ? `<h2 id="h-faq">자주 묻는 질문</h2>${faqAcc(p.faq, 'pfaq')}` : ''}
    </div>
    ${show ? `<div class="post-cta"><img src="${u(`assets/img/shows/${show.slug}/thumb.webp`)}" alt="" width="100" height="125" loading="lazy"><div><b>${esc(show.title)}</b><p>${esc(show.hook)}</p><div class="sh-cta"><a class="btn btn-light btn-s" href="${u(`shows/${show.slug}/`)}">공연 정보</a><a class="btn btn-pink btn-s" href="${show.booking.url}" target="_blank" rel="noopener" data-book="${esc(show.title)}">예매${ico('ext')}</a></div></div></div>` : ''}
    <div class="sh-cta" style="margin-top:28px"><button class="btn btn-line btn-s" type="button" data-share>${ico('share')}글 공유</button><a class="btn btn-line btn-s" href="${u('blog/')}">목록으로</a></div>
  </article>
  <aside class="toc" aria-label="목차"><b>CONTENTS</b><ol>${p.toc.map(t => `<li><a href="#${t.id}">${esc(t.t)}</a></li>`).join('')}${p.faq.length ? '<li><a href="#h-faq">자주 묻는 질문</a></li>' : ''}</ol></aside>
</div></section>
${rel.length ? `<section class="sec-tight sec-soft"><div class="wrap"><h2 class="h2" style="font-size:clamp(22px,2.6vw,30px);margin-bottom:24px">이어서 읽기</h2><div class="posts">${rel.map(x => postCard(u, x)).join('')}</div></div></section>` : ''}`;
}

export function privacy(u) {
  return `${pageHd(u, { crumb: [['홈', ''], ['개인정보처리방침', 'privacy/']], title: '개인정보 처리 안내' })}
<section class="sec-tight"><div class="wrap prose">
  <p>${SITE.name}(이하 "회사")는 이 홈페이지에서 회원 가입, 로그인, 온라인 결제를 운영하지 않으며, 방문자가 입력한 정보를 서버에 저장하지 않습니다.</p>
  <h2>1. 공연 예매</h2><p>공연 예매는 네이버 예약에서 진행됩니다. 예매 과정에서 수집되는 개인정보는 네이버 예약 화면의 안내와 네이버 개인정보처리방침을 따릅니다.</p>
  <h2>2. 이메일·전화 문의</h2><p>문의 메일(${SITE.email}), 오디션 지원 메일(${SITE.audition}), 대표전화(${SITE.phone})로 보내 주신 이름·연락처·내용은 답변과 관련 업무에만 쓰며, 목적을 달성한 뒤 지체 없이 파기합니다. 오디션 지원 자료는 해당 오디션 진행 기간 동안만 보관합니다.</p>
  <h2>3. 문의 내용 정리 도구</h2><p>문의 페이지의 정리 도구는 브라우저 안에서만 메일 본문을 만들며, 입력한 내용을 회사나 제3자에게 보내지 않습니다.</p>
  <h2>4. 외부 서비스</h2><p>이 홈페이지는 글꼴 표시를 위해 Google Fonts를 불러오며, 지도 보기·예매 버튼은 네이버 지도·네이버 예약 페이지로 연결됩니다. 이 과정에서 각 서비스가 접속 기록을 처리할 수 있습니다.</p>
  <h2>5. 문의처</h2><p>개인정보 관련 문의: ${SITE.email} · ${SITE.phone}</p>
  <p class="muted">시행일: 2026년 10월 23일</p>
</div></section>`;
}

export function notFound(u) {
  return `<section class="nf"><div><b>404</b><h1 style="font-size:28px;margin:12px 0">찾는 페이지가 없습니다</h1><p class="muted">주소가 바뀌었거나 삭제된 페이지입니다.</p><div class="sh-cta" style="justify-content:center"><a class="btn btn-dark" href="${u('')}">홈으로</a><a class="btn btn-line" href="${u('shows/')}">공연 보기</a></div></div></section>`;
}

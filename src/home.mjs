// 홈: 히어로 필름 → (스크롤) 카드로 줄며 기존 배너 문구 → 소개(단어 밝힘) → 라인업(가로 이동) → 한뼘사이 스포트라이트 → 후기 → 관람 도우미 → 연혁 → 수상·보도 → 오시는 길 → FAQ → 가이드 → 문의
import { SITE, SHOWS, FAQ, HISTORY, AWARDS, PRESS, VENUES, WHO, TOUR_CITIES, totalReviews, avgRating, showBySlug } from './data.mjs';
import { esc, words, img, phImg, kdate } from './lib.mjs';
import { ico } from './layout.mjs';
import { showCard, ratingBars, reviewCard, faqAcc, venueCard, postCard } from './parts.mjs';

const H = () => showBySlug('hanbbeumsai');

function hero(u) {
  return `<section class="hero" aria-label="파릇 소개 영상">
  <div class="hero-stage">
    <div class="hero-film">
      <video id="film" muted playsinline preload="none" poster="${u('assets/video/hero-poster.webp')}" data-src="assets/video/hero-1080.mp4" data-src4k="assets/video/hero-2160.mp4" data-src-m="assets/video/hero-m.mp4" aria-label="파릇 쇼릴 15초: 대학로 공연장, 객석, 배우들, 한뼘사이, 공연 라인업, 파릇 로고"></video>
      <div class="film-bar" aria-hidden="true"></div>
    </div>
    <div class="film-ctl">
      <button class="film-btn" id="filmSound" type="button" aria-pressed="false">${ico('mute')}<span>소리 켜기</span></button>
      <button class="film-btn" id="filmReplay" type="button" hidden>${ico('replay')}다시 보기</button>
    </div>
    <div class="scroll-cue" aria-hidden="true">SCROLL<i></i></div>
    <div class="hero-copy"><div class="wrap">
      <p class="en">${esc(SITE.en)}</p>
      <h1>${esc(SITE.tagline)}<span class="k">대학로·혜화에서 연극과 어린이 뮤지컬을 만드는 파릇</span></h1>
      <p class="lead">${esc(SITE.intro)}<br>2016년부터 대학로에서, 공연이 처음인 사람도 편하게 웃고 나올 수 있는 무대를 만듭니다.</p>
      <div class="hero-cta"><a class="btn btn-light" href="#lineup">지금 공연 보기${ico('arrow')}</a><button class="btn btn-ghost-dk" type="button" data-open="drawerBook">${ico('ticket')}예매하기</button></div>
      <ul class="hero-shows" aria-label="지금 공연 중인 작품">${SHOWS.map((s, i) => `<li style="--i:${i}"><a href="${u(`shows/${s.slug}/`)}" data-qv="${s.id}"><span class="hs-img ph"><img src="${u(`assets/img/shows/${s.slug}/thumb.webp`)}" alt="${esc(s.title)} 포스터" width="320" height="400" decoding="async"></span><b>${esc(s.title)}</b><small>${esc(s.kind)}</small></a></li>`).join('')}</ul>
    </div></div>
  </div>
</section>`;
}

function marquee() {
  const ws = ['대학로 연극', '혜화 연극', ...SHOWS.map(s => s.title), '대학로 데이트', '아이와 대학로', '혜화역 공연'];
  const row = ws.map(w => `<span>${esc(w)}</span>`).join('');
  return `<div class="marquee" aria-hidden="true"><div class="marquee-track">${row}${row}</div></div>`;
}

function intro(u) {
  const n = totalReviews();
  return `<section class="sec" id="about">
  <div class="wrap">
    <p class="eyebrow reveal">About Paroot</p>
    <p class="manifesto">${words('주식회사 파릇은 2016년 어린이뮤지컬 기획으로 시작해 **대학로에서** 연극과 뮤지컬을 만들어 왔습니다. 연인과 친구, **아이와 부모님까지** 공연이 처음인 사람도 부담 없이 웃고 나올 수 있는 무대. **2017년 3월에 올린 「한뼘사이」는** 지금도 매일 혜화역 2번 출구 골목에서 막을 올립니다.')}</p>
    <div class="facts reveal">
      <div class="fact"><b><span data-count="2016" data-plain>2016</span></b><span>첫 공연 기획<br>어린이뮤지컬 「성냥팔이소녀」</span></div>
      <div class="fact"><b><span data-count="${SHOWS.length}">${SHOWS.length}</span><small>편</small></b><span>지금 대학로에서 공연 중<br>연극 3 · 어린이 뮤지컬 2 · 쇼 1</span></div>
      <div class="fact"><b><span data-count="${n}">${n.toLocaleString('ko-KR')}</span><small>건</small></b><span>네이버 예약 관람평<br>5개 작품 합계</span></div>
      <div class="fact"><b>★<span data-count="${avgRating().toFixed(2)}" data-dec="2">${avgRating().toFixed(2)}</span></b><span>관람평 수로 가중한 평균<br>2026년 10월 기준</span></div>
    </div>
  </div>
</section>`;
}

function lineup(u) {
  return `<section class="lineup" id="lineup" aria-labelledby="luTitle">
  <div class="lu-pin">
    <div class="lu-stage">
      <div class="wrap lu-head">
        <div><p class="eyebrow">Now Playing</p><h2 class="h2" id="luTitle">지금 대학로에서 만나는<br>파릇의 무대</h2></div>
        <div class="lu-filter" role="group" aria-label="공연 분류">
          <button class="chip" type="button" data-cat="all" aria-pressed="true">전체</button>
          <button class="chip" type="button" data-cat="play" aria-pressed="false">연극</button>
          <button class="chip" type="button" data-cat="kids" aria-pressed="false">어린이 뮤지컬</button>
          <button class="chip" type="button" data-cat="show" aria-pressed="false">심야 쇼</button>
        </div>
      </div>
      <div class="lu-rail">
        ${SHOWS.map(s => showCard(u, s)).join('\n')}
        <div class="lu-end"><b style="font-size:20px">어떤 공연이 맞을지<br>고민된다면</b><p>함께 볼 사람을 고르면 맞는 공연을 골라 드립니다.</p><a class="btn btn-light btn-s" href="#finder">관람 도우미 열기${ico('arrow')}</a><a class="btn btn-ghost-dk btn-s" href="${u('shows/')}">공연 전체 비교</a></div>
      </div>
      <div class="lu-progress" aria-hidden="true"><i></i></div>
    </div>
  </div>
</section>`;
}

function spotlight(u) {
  const s = H();
  const shots = [['stage/exterior.webp', '혜화역 2번 출구 골목의 한뼘사이 전용관 외관'], ['stage/couple.webp', '한뼘사이 두 주인공이 손을 맞잡은 장면'], ['stage/laugh.webp', '한뼘사이 배우가 크게 웃는 장면'], ['stage/crowd-a.webp', '한뼘사이 객석의 관객들'], ['shows/hanbbeumsai/gallery/02.webp', '한뼘사이 커튼콜'], ['stage/couple-2.webp', '한뼘사이 로맨스 장면']];
  const steps = [
    ['2017 → 오픈런', `<span class="sp-big">2017.03</span>`, '「한뼘사이」는 2017년 3월 첫 공연 이후 오픈런으로 이어지고 있습니다. 2021년 3월부터는 혜화역 2번 출구 KFC 골목의 전용관(라온아트홀)에서 평일 3회, 주말 4~5회 공연합니다.'],
    ['한 뼘 남짓한 오피스텔', '두 커플, 두 가지 연애', '속마음을 감춘 무뚝뚝한 여자와 썸을 넘지 못하는 남자, 그리고 아픔을 대하는 방식이 정반대인 두 사람. 한 무대에서 두 연애가 번갈아 흘러갑니다.'],
    ['멀티맨', '웃음은 타이밍에서', '한 배우가 여러 인물을 오가는 멀티맨은 관람평에 자주 이름이 오르는 배역입니다. “애드립도 리얼해서 첨엔 진짜 대본인줄” 같은 후기가 이어집니다.'],
    ['관람평', `<span class="sp-big">★${s.rating.avg}</span>`, `네이버 예약에 남은 관람평 ${s.rating.count.toLocaleString('ko-KR')}건의 평균입니다(${kdate(s.rating.asof)} 기준). 5점이 ${Math.round(s.rating.dist[5] / Object.values(s.rating.dist).reduce((a, b) => a + b) * 100)}%를 차지합니다.`],
    ['대학로 밖으로', `${TOUR_CITIES.length}개 도시, 그리고 중국`, `울산·포항·대구·제주에서 광양까지 지역 무대에 올랐고, 삼성전자·POSCO·건양대학교 초청 공연도 했습니다. 2023년 12월부터는 중국에서 라이선스 공연이 열립니다.<span class="tour">${TOUR_CITIES.map(c => `<span>${c}</span>`).join('')}</span>`],
    ['수상', '올해의 우수브랜드 대상<br>3년 연속 1위', `2022·2023·2024년 문화컨텐츠 공연·연극 부문(JY네트워크 주최, 중앙일보 후원).<br><br><a class="btn btn-pink" href="${u('shows/hanbbeumsai/')}">한뼘사이 자세히 보기${ico('arrow')}</a>`],
  ];
  return `<section class="sec spot" id="spotlight" aria-labelledby="spTitle">
  <div class="wrap">
    <div class="sec-head"><div><p class="eyebrow">Spotlight</p><h2 class="h2" id="spTitle">대학로 대표 로맨틱 코미디,<br><em>한뼘사이</em></h2></div></div>
    <div class="sp-grid">
      <div class="sp-media">
        <span class="sp-badge tag tag-pink">2017년 3월 개막 · 오픈런</span>
        ${shots.map(([f, a], i) => img(u, `assets/img/${f}`, a, { cls: i === 0 ? 'on' : '', lazy: i > 0 })).join('')}
        <span class="sp-count">01 / ${String(steps.length).padStart(2, '0')}</span>
      </div>
      <ol class="sp-steps">${steps.map(([n, t, p], i) => `<li class="sp-step"><span class="num">${String(i + 1).padStart(2, '0')} — ${n}</span><h3>${t}</h3><p>${p}</p></li>`).join('')}</ol>
    </div>
  </div>
</section>`;
}

function reviews(u) {
  const rated = SHOWS.filter(s => s.rating);
  const voted = new Map();
  SHOWS.forEach(s => s.voted.forEach(([k, n]) => voted.set(k, (voted.get(k) || 0) + n)));
  const kw = [...voted].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const all = SHOWS.flatMap(s => s.reviews.map(r => [s, r]));
  // 두 줄에 공연이 섞이도록 번갈아 배치
  const mix = []; const pools = SHOWS.map(s => s.reviews.map(r => [s, r]));
  for (let i = 0; mix.length < all.length; i++) pools.forEach(p => { if (p[i]) mix.push(p[i]); });
  const r1 = mix.filter((_, i) => i % 2 === 0), r2 = mix.filter((_, i) => i % 2 === 1);
  const row = (list, cls, dur) => `<div class="rv-row ${cls}" style="--dur:${dur}s">${[...list, ...list].map(([s, r], i) => (i >= list.length ? reviewCard(s, r).replace('<button', '<button tabindex="-1" aria-hidden="true"') : reviewCard(s, r))).join('')}</div>`;
  return `<section class="sec sec-soft" id="reviews" aria-labelledby="rvTitleSec">
  <div class="wrap">
    <div class="sec-head"><div><p class="eyebrow">Reviews</p><h2 class="h2" id="rvTitleSec">관객이 먼저 쓴<br>${totalReviews().toLocaleString('ko-KR')}건의 관람평</h2><p class="lead">네이버 예약에 공개된 관람평을 작품별로 모았습니다. 후기는 맞춤법을 고치지 않고 원문 그대로 옮겼습니다.</p></div></div>
    <div class="rv-summary">${rated.map(s => `<div class="rv-stat reveal"><span class="t">${esc(s.title)}</span><div class="n"><b>${s.rating.avg.toFixed(2)}</b><span>${s.rating.count.toLocaleString('ko-KR')}건 · ${kdate(s.rating.asof)}</span></div>${ratingBars(s)}</div>`).join('')}</div>
    ${kw.length ? `<div class="kw" aria-label="관객이 고른 키워드">${kw.map(([k, n]) => `<span>“${esc(k)}” <b>${n}</b></span>`).join('')}<span class="muted" style="border:0;background:none;font-weight:500">수상한 룸메이트·피노키오야 노올자 관람평 키워드 투표 합계</span></div>` : ''}
  </div>
  <div class="rv-rows">${row(r1, '', 110)}${row(r2, 'rev', 125)}</div>
  <div class="wrap rv-ctl"><span>카드를 누르면 후기 원문을 볼 수 있습니다. 마우스를 올리면 잠시 멈춥니다.</span><button class="btn btn-line btn-s" id="rvPause" type="button" aria-pressed="false">${ico('pause')}<span>멈춤</span></button></div>
</section>`;
}

function finder(u) {
  return `<section class="sec" id="finder" aria-labelledby="fdTitle">
  <div class="wrap finder">
    <div><p class="eyebrow">Find your show</p><h2 class="h2" id="fdTitle">누구와 보나요?</h2><p class="lead">함께 갈 사람을 고르면, 관람 연령과 공연 시간, 관람평을 기준으로 맞는 공연을 보여 드립니다.</p><p class="muted" style="font-size:14.5px">연극은 만 12세 이상, 어린이 뮤지컬은 24개월 이상, 드랙인혜화는 만 19세 이상입니다.</p></div>
    <div class="fd-box reveal">
      <p class="fd-q">함께 보는 사람</p>
      <div class="fd-opts" role="group" aria-label="함께 보는 사람">${WHO.map(([k, t]) => `<button class="chip" type="button" data-who="${k}" aria-pressed="false">${t}</button>`).join('')}</div>
      <div class="fd-result" aria-live="polite"><p class="muted" style="margin:0">위에서 하나를 골라 보세요.</p></div>
    </div>
  </div>
</section>`;
}

export function historyBlock() {
  return `<div class="history">
    <div class="hs-side"><p class="eyebrow">History</p><div class="hs-year" aria-hidden="true">${HISTORY[HISTORY.length - 1].year}</div><p class="lead" style="font-size:16px;margin-top:14px">2016년 첫 어린이뮤지컬 기획부터 지금까지, 파릇이 올린 무대의 기록입니다.</p></div>
    <div class="hs-line">${[...HISTORY].reverse().map(h => `<div class="hs-item" data-year="${h.year}"><h3>${h.year}</h3><ul>${[...h.items].reverse().map(([d, t]) => `<li><b>${d.slice(5)}월</b>${esc(t).replace(/&lt;(.+?)&gt;/g, '「$1」')}</li>`).join('')}</ul></div>`).join('')}</div>
  </div>`;
}

function history() {
  return `<section class="sec" id="history" aria-label="연혁"><div class="wrap">${historyBlock()}</div></section>`;
}

export function awardsPress(u, n = 8) {
  return `<div class="awards">${AWARDS.map(a => `<div class="award reveal"><span class="a-ico">${ico('award')}</span><span><b>${esc(a.t).replace(/&lt;(.+?)&gt;/g, '「$1」')}</b><span>${esc(a.d).replace(/&lt;(.+?)&gt;/g, '「$1」')} · ${esc(a.src)}</span></span></div>`).join('')}</div>
  <ul class="press">${PRESS.slice(0, n).map(p => `<li><a href="${p.u}" target="_blank" rel="noopener"><span class="src">${esc(p.o)}</span><span class="tt">${esc(p.t)}</span><span class="dt">${kdate(p.d)}</span>${ico('ext')}</a></li>`).join('')}</ul>`;
}

function press(u) {
  return `<section class="sec sec-dark" id="press" aria-labelledby="prTitle">
  <div class="wrap">
    <div class="sec-head"><div><p class="eyebrow">Press</p><h2 class="h2" id="prTitle">무대 밖에서 전해진 이야기</h2></div><a class="btn btn-ghost-dk" href="${u('news/')}">보도 전체 보기${ico('arrow')}</a></div>
    ${awardsPress(u)}
    <p class="muted" style="font-size:13.5px;margin-top:18px">날짜는 기존 파릇 홈페이지 뉴스 게시판에 올린 날짜입니다. 기사 링크는 각 언론사 페이지로 연결됩니다.</p>
  </div>
</section>`;
}

function venues(u) {
  return `<section class="sec sec-soft" id="visit" aria-labelledby="vsTitle">
  <div class="wrap">
    <div class="sec-head"><div><p class="eyebrow">Venues</p><h2 class="h2" id="vsTitle">모두 혜화역에서<br>걸어서 5분 안</h2><p class="lead">파릇 공연은 대학로 다섯 곳의 공연장에서 열립니다. 공연장마다 가까운 출구가 다르니 예매한 공연장을 먼저 확인해 주세요. 주차 시설은 모두 없습니다.</p></div><a class="btn btn-dark" href="${u('visit/')}">출구별 오시는 길${ico('arrow')}</a></div>
    <div class="venues">${VENUES.map(v => venueCard(u, v)).join('')}</div>
  </div>
</section>`;
}

function faq(u) {
  return `<section class="sec" id="faq" aria-labelledby="fqTitle">
  <div class="wrap two-col">
    <div><p class="eyebrow">FAQ</p><h2 class="h2" id="fqTitle">대학로 연극,<br>처음이라면</h2><p class="lead">예매부터 입장, 좌석, 주차까지 자주 받는 질문을 모았습니다.</p><a class="btn btn-line" href="${u('faq/')}">질문 전체 보기${ico('arrow')}</a></div>
    ${faqAcc(FAQ.filter(f => f.pages.includes('home')), 'hfaq', { open: 1 })}
  </div>
</section>`;
}

function blog(u, posts) {
  if (!posts.length) return '';
  return `<section class="sec sec-soft" id="guide" aria-labelledby="bgTitle">
  <div class="wrap">
    <div class="sec-head"><div><p class="eyebrow">Daehak-ro Guide</p><h2 class="h2" id="bgTitle">대학로 연극 가이드</h2><p class="lead">공연 고르는 법부터 데이트 동선, 아이와 처음 보는 공연까지. 파릇 공연기획팀이 매일 정리합니다.</p></div><a class="btn btn-dark" href="${u('blog/')}">가이드 전체 보기${ico('arrow')}</a></div>
    <div class="posts">${posts.slice(0, 3).map(p => postCard(u, p)).join('')}</div>
  </div>
</section>`;
}

export function ctaBand(u) {
  return `<section class="sec-tight"><div class="wrap"><div class="cta-band reveal">
  <div><p class="eyebrow">Contact</p><h2>단체 관람 · 초청 공연 · 제휴</h2><p>20인 이상 단체 관람, 기업·학교 초청 공연, 공연 기획·마케팅 제휴를 받습니다. 배우 오디션은 프로필을 메일로 보내 주세요.</p></div>
  <div class="cta-acts"><a class="btn btn-light" href="${u('contact/')}">${ico('mail')}문의 내용 정리하기</a><button class="btn btn-ghost-dk" type="button" data-copy="${SITE.email}" data-copy-msg="문의 메일 주소를 복사했습니다">${ico('copy')}${SITE.email}</button><a class="btn btn-ghost-dk" href="tel:${SITE.phone.replace(/-/g, '')}">${ico('phone')}${SITE.phone}</a></div>
</div></div></section>`;
}

export function homeBody(u, posts) {
  return [hero(u), marquee(), intro(u), lineup(u), spotlight(u), reviews(u), finder(u), history(), press(u), venues(u), faq(u), blog(u, posts), ctaBand(u)].join('\n');
}

// 파릇 어드민 화면: #traffic(유입·트래픽) · #blog(블로그) · #notices(공지·이벤트). 서버 API는 tools/admin/server.mjs
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Number(n || 0).toLocaleString('ko-KR');
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const md = d => `${+d.slice(5, 7)}/${+d.slice(8, 10)}`;
const SITE = location.origin + '/';

let META = null;

async function api(path, body) {
  const r = await fetch('/admin/api/' + path, body === undefined ? { credentials: 'same-origin' } : {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Admin': '1' }, body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== 'login') { renderLogin(); throw new Error('로그인이 필요합니다'); }
  if (!r.ok) throw Object.assign(new Error(j.error || `오류(${r.status})`), { data: j });
  return j;
}
let toastT;
function toast(msg, ms = 4200) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms);
}
const busy = (btn, on) => { if (btn) { btn.disabled = on; if (on) { btn.dataset.l = btn.textContent; btn.textContent = '저장 중…'; } else if (btn.dataset.l) btn.textContent = btn.dataset.l; } };

// ── 로그인 ──
function renderLogin(msg = '') {
  document.title = '로그인 | 파릇 어드민';
  app.innerHTML = `<main class="login"><div class="card login-card">
    <p class="brand">파릇 <b>어드민</b></p><h1>로그인</h1><p class="muted small">유입·트래픽, 블로그, 공지·이벤트를 관리합니다.</p>
    <form id="loginForm"><label class="sr" for="pw">비밀번호</label>
    <input id="pw" name="password" type="password" autocomplete="current-password" placeholder="비밀번호" required class="search">
    <button class="btn btn-primary" type="submit">로그인</button>${msg ? `<p class="err">${esc(msg)}</p>` : ''}</form></div></main>`;
  $('#pw').focus();
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const b = e.submitter; b.disabled = true;
    try { await api('login', { password: $('#pw').value }); await start(); }
    catch (err) { renderLogin(err.message); }
  });
}

// ── 뼈대 ──
const TABS = [['traffic', '유입·트래픽'], ['blog', '블로그'], ['notices', '공지·이벤트']];
function shell(tab, inner) {
  const warn = [];
  if (!META.writer) warn.push('<div class="banner banner-warn"><b>저장이 꺼져 있습니다.</b> 글·공지를 고치려면 Railway 환경 변수 <code>GITHUB_TOKEN</code>(저장소 Contents 읽기·쓰기)을 넣어 주세요. 지금은 보기만 됩니다.</div>');
  if (!META.persistent && tab === 'traffic') warn.push('<div class="banner banner-info"><b>방문 통계가 배포할 때마다 처음부터 다시 쌓입니다.</b> Railway에서 볼륨을 붙이고 <code>DATA_DIR</code>을 그 경로로 두면 계속 남습니다.</div>');
  app.innerHTML = `<header class="top"><div class="top-in"><p class="brand">파릇 <b>어드민</b></p>
    <nav class="tabs" aria-label="메뉴">${TABS.map(([k, l]) => `<a href="#${k}"${k === tab ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
    <div class="top-acts"><a class="btn btn-s" href="/" target="_blank" rel="noopener">사이트 보기</a><button class="btn btn-s" type="button" id="logout">로그아웃</button></div></div></header>
    <main class="wrap">${warn.join('')}${inner}</main>`;
  $('#logout').addEventListener('click', async () => { await api('logout', {}).catch(() => {}); renderLogin(); });
}

// ── 라우팅 ──
async function route() {
  const [tab, act, id] = (location.hash.slice(1) || 'traffic').split('/');
  scrollTo(0, 0);
  try {
    if (tab === 'blog') return await (act ? blogEdit(act === 'new' ? null : decodeURIComponent(id)) : blogList());
    if (tab === 'notices') return await (act ? noticeEdit(act === 'new' ? null : decodeURIComponent(id)) : noticeList());
    return await traffic();
  } catch (e) { if (e.message !== '로그인이 필요합니다') { shell(tab, `<div class="card empty">${esc(e.message)}</div>`); } }
}
window.addEventListener('hashchange', route);
async function start() {
  const me = await api('me');
  if (!me.auth) return renderLogin();
  META = await api('meta');
  route();
}

// ═════════ 유입·트래픽 ═════════
let DAYS = 30;
async function traffic() {
  document.title = '유입·트래픽 | 파릇 어드민';
  if (!$('.top')) shell('traffic', '<p class="muted">불러오는 중…</p>');
  const S = await api(`stats?days=${DAYS}`);
  const T = S.titles || {};
  const ai = S.ch['AI 답변'] || 0, search = ['네이버 검색', '구글 검색', '다음·카카오', '빙 검색'].reduce((a, k) => a + (S.ch[k] || 0), 0);
  const books = Object.values(S.book).reduce((a, b) => a + b, 0);
  const dev = S.dev['모바일'] || 0, devAll = (S.dev['모바일'] || 0) + (S.dev['데스크톱'] || 0);
  const top = (o, n = 10) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
  const list = (rows, total, label = k => esc(k)) => rows.length ? `<ul class="hl-list">${rows.map(([k, v]) => `<li><span class="name">${label(k)}</span><span class="num">${num(v)}<small>${pct(v, total)}%</small></span><span class="track"><span class="fill" style="width:${Math.max(2, pct(v, rows[0][1]))}%"></span></span></li>`).join('')}</ul>` : '<p class="empty">아직 기록이 없습니다</p>';
  const pageLabel = p => `${esc(T[p] || p)}${T[p] ? `<small>${esc(p)}</small>` : ''}`;
  const botRows = Object.entries(S.seen).map(([name, s]) => ({ name, g: s.g, n: S.bots[name] || 0, t: s.t, p: s.p })).sort((a, b) => b.n - a.n || b.t.localeCompare(a.t));
  const ago = t => { const m = Math.round((Date.now() - new Date(t)) / 60000); return m < 60 ? `${Math.max(1, m)}분 전` : m < 1440 ? `${Math.round(m / 60)}시간 전` : `${Math.round(m / 1440)}일 전`; };
  const per = S.days.length;
  const LINKS = [
    ['Google 애널리틱스 4', 'https://analytics.google.com/analytics/web/#/p560887563/reports/intelligenthome'],
    ['Google Search Console', 'https://search.google.com/search-console?resource_id=https%3A%2F%2Fparootent.kr%2F'],
    ['네이버 서치어드바이저', 'https://searchadvisor.naver.com/console/board'],
    ['네이버 애널리틱스', 'https://analytics.naver.com/'],
    ['Google 태그 관리자', 'https://tagmanager.google.com/#/container/accounts/6400320382/containers/283816491/workspaces/2'],
  ];
  shell('traffic', `
  <div class="page-hd"><div><h1 class="page">유입·트래픽</h1><p class="muted small">쿠키 없이 사이트가 직접 센 합계입니다. 집계 시작 ${esc(S.since)} · 한국 시간 기준</p></div>
    <div class="seg" role="group" aria-label="기간">${[7, 30, 90].map(n => `<button type="button" data-days="${n}" aria-pressed="${n === DAYS}">${n}일</button>`).join('')}</div></div>
  <section class="kpis" aria-label="요약">
    <div class="kpi"><div class="k">페이지 조회</div><div class="v">${num(S.pv)}</div><div class="s">하루 평균 ${S.pv / per < 10 ? (S.pv / per).toFixed(1) : num(Math.round(S.pv / per))}</div></div>
    <div class="kpi"><div class="k">방문자</div><div class="v">${num(S.uv)}</div><div class="s">날짜별 방문자 합계</div></div>
    <div class="kpi"><div class="k">외부에서 들어옴</div><div class="v">${num(S.entries)}</div><div class="s">검색 ${pct(search, S.entries)}% · 직접 ${pct(S.ch['직접 방문'] || 0, S.entries)}%</div></div>
    <div class="kpi"><div class="k">AI 답변에서 들어옴</div><div class="v">${num(ai)}</div><div class="s">ChatGPT·Perplexity 등 ${pct(ai, S.entries)}%</div></div>
    <div class="kpi"><div class="k">예매 버튼 클릭</div><div class="v">${num(books)}</div><div class="s">조회 대비 ${pct(books, S.pv)}% · 전화 ${num(S.call)} · 메일 ${num(S.mail)}</div></div>
  </section>
  <section class="card" style="margin-top:16px"><h2>날짜별 페이지 조회<small>막대에 마우스를 올리면 자세히</small></h2>
    <div class="chart" id="chart"></div>
    <details class="tbl-toggle"><summary class="small">표로 보기</summary><div class="tbl-wrap"><table class="tbl"><thead><tr><th>날짜</th><th class="num">조회</th><th class="num">방문자</th><th class="num">외부 유입</th><th class="num">예매 클릭</th></tr></thead>
      <tbody>${[...S.days].reverse().map(x => `<tr><td>${x.d}</td><td class="num">${num(x.pv)}</td><td class="num">${num(x.uv)}</td><td class="num">${num(x.entries)}</td><td class="num">${num(x.book)}</td></tr>`).join('')}</tbody></table></div></details>
  </section>
  <div class="grid2">
    <section class="card"><h2>유입 경로<small>외부에서 들어온 ${num(S.entries)}회</small></h2>${list(top(S.ch, 12), S.entries)}</section>
    <section class="card"><h2>들어온 사이트<small>상위 10</small></h2>${list(top(S.ref), S.entries)}</section>
  </div>
  <div class="grid2">
    <section class="card"><h2>많이 본 페이지<small>상위 10</small></h2>${list(top(S.pages), S.pv, pageLabel)}</section>
    <section class="card"><h2>처음 들어온 페이지<small>검색·SNS·AI에서 도착한 곳</small></h2>${list(top(S.land), S.entries, pageLabel)}</section>
  </div>
  <div class="grid2">
    <section class="card"><h2>예매 버튼 클릭<small>공연별 · 네이버 예약으로 이동</small></h2>${list(top(S.book), books)}</section>
    <section class="card"><h2>기기</h2>${devAll ? list([['모바일', dev], ['데스크톱', devAll - dev]].sort((a, b) => b[1] - a[1]), devAll) : '<p class="empty">아직 기록이 없습니다</p>'}
      <p class="muted small" style="margin:12px 0 0">방문자 기준. 문의 버튼: 전화 ${num(S.call)}회 · 메일 ${num(S.mail)}회</p></section>
  </div>
  <section class="card" style="margin-top:16px"><h2>검색엔진·AI 크롤러 방문<small>검색 노출(SEO)·AI 답변 노출(AEO·GEO)의 바탕</small></h2>
    ${botRows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>로봇</th><th>종류</th><th class="num">${DAYS}일 방문</th><th>마지막 방문</th><th>마지막으로 가져간 주소</th></tr></thead><tbody>
      ${botRows.map(b => `<tr><td class="t-title">${esc(b.name)}</td><td><span class="badge ${b.g === 'ai' ? 'b-always' : 'b-scheduled'}">${b.g === 'ai' ? 'AI' : '검색'}</span></td><td class="num">${num(b.n)}</td><td class="nowrap">${ago(b.t)}</td><td class="t-sub">${esc(b.p)}</td></tr>`).join('')}
    </tbody></table></div>` : '<p class="empty">아직 크롤러 방문 기록이 없습니다</p>'}
  </section>
  <div class="grid2">
    <section class="card"><h2>색인 알림(IndexNow)<small>새 글·바뀐 페이지를 네이버·빙에 바로 알림</small></h2>
      ${S.indexnow.length ? `<ul class="hl-list">${S.indexnow.map(x => `<li><span class="name">${new Date(x.t).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · ${x.n}개 주소<small>${esc(x.urls[0] || '')}</small></span><span class="num"><small>${esc(x.res.join(' · '))}</small></span></li>`).join('')}</ul>` : '<p class="empty">이번 기록 기간에 보낸 알림이 없습니다</p>'}</section>
    <section class="card"><h2>외부 분석 도구<small>자세한 분석은 각 도구에서</small></h2><div class="links">${LINKS.map(([l, u]) => `<a class="btn btn-s" href="${u}" target="_blank" rel="noopener">${l}</a>`).join('')}</div>
      <p class="muted small" style="margin:12px 0 0">사이트 자체 집계는 광고 차단기와 상관없이 세지만, 체류 시간·지역 같은 자세한 정보는 GA4에서 봅니다.</p></section>
  </div>`);
  $$('[data-days]').forEach(b => b.addEventListener('click', () => { DAYS = Number(b.dataset.days); traffic(); }));
  drawChart($('#chart'), S.days);
}

let chartOff = null;
function drawChart(box, days) {
  chartOff?.();
  const draw = () => { if (box.isConnected) drawBars(box, days); };
  let t; const onResize = () => { clearTimeout(t); t = setTimeout(draw, 120); };
  addEventListener('resize', onResize); chartOff = () => removeEventListener('resize', onResize);
  draw();
}
function drawBars(box, days) {
  const W = Math.max(300, box.clientWidth), H = 220, L = 40, B = 24, T = 8, max = Math.max(4, ...days.map(d => d.pv));
  const step = Math.pow(10, Math.floor(Math.log10(max))) * (max / Math.pow(10, Math.floor(Math.log10(max))) > 5 ? 2 : 1);
  const top = Math.ceil(max / step) * step, y = v => H - B - (v / top) * (H - B - T);
  const bw = (W - L) / days.length, gap = Math.min(2, bw * .2), r = Math.min(4, (bw - gap) / 2);
  const ticks = []; for (let v = 0; v <= top; v += step) ticks.push(v);
  const every = Math.ceil(days.length / Math.max(3, Math.floor((W - L) / 70)));
  const bar = (x, w, yy) => { const h = H - B - yy; if (h <= 0) return ''; const rr = Math.min(r, h); return `<path class="bar" d="M${x},${H - B}V${yy + rr}Q${x},${yy} ${x + rr},${yy}H${x + w - rr}Q${x + w},${yy} ${x + w},${yy + rr}V${H - B}Z"/>`; };
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="날짜별 페이지 조회 막대그래프. 자세한 숫자는 아래 표로 보기">
    ${ticks.map(v => `<line class="gl" x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${num(v)}</text>`).join('')}
    ${days.map((d, i) => { const x = L + i * bw + gap / 2; return `${bar(x, bw - gap, y(d.pv))}<rect class="hit" data-i="${i}" x="${L + i * bw}" y="${T}" width="${bw}" height="${H - B - T}"/><rect class="hl" x="${L + i * bw}" y="${T}" width="${bw}" height="${H - B - T}"/>${i % every === 0 || i === days.length - 1 ? `<text class="ax" x="${L + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${md(d.d)}</text>` : ''}`; }).join('')}
  </svg>`;
  const tip = $('#tip');
  $$('.hit', box).forEach(h => {
    h.addEventListener('mousemove', e => {
      const d = days[h.dataset.i];
      tip.innerHTML = `<b>${d.d}</b>조회 ${num(d.pv)} · 방문자 ${num(d.uv)}<br>외부 유입 ${num(d.entries)} · 예매 클릭 ${num(d.book)}`;
      tip.hidden = false;
      const x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8);
      tip.style.left = x + 'px'; tip.style.top = (e.clientY - tip.offsetHeight - 12) + 'px';
    });
    h.addEventListener('mouseleave', () => { tip.hidden = true; });
  });
}

// ═════════ 블로그 ═════════
let BF = { st: 'all', q: '' };
async function blogList() {
  document.title = '블로그 | 파릇 어드민';
  const { posts, now } = await api('posts');
  const live = posts.filter(p => p.status === 'live'), sch = posts.filter(p => p.status === 'scheduled').sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const next = sch[0];
  shell('blog', `
  <div class="page-hd"><div><h1 class="page">블로그 「대학로 연극 가이드」</h1>
    <p class="stats-row"><span>공개 <b>${live.length}</b>편</span><span>예약 <b>${sch.length}</b>편</span>${next ? `<span>다음 공개 <b>${md(next.date)} ${esc(next.time)}</b> 「${esc(next.title)}」</span>` : ''}</p></div>
    <a class="btn btn-primary" href="#blog/new">새 글 쓰기</a></div>
  <section class="card">
    <div class="toolbar"><div class="chips" role="group" aria-label="상태">${[['all', '전체'], ['live', '공개'], ['scheduled', '예약']].map(([k, l]) => `<button type="button" data-st="${k}" aria-pressed="${BF.st === k}">${l}</button>`).join('')}</div>
      <span class="grow"></span><input class="search" type="search" id="q" placeholder="제목 검색" value="${esc(BF.q)}" aria-label="제목 검색"></div>
    <div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>상태</th><th>제목</th><th>분류</th><th>공개 일시</th><th class="num">조회(30일)</th><th>작성</th><th></th></tr></thead><tbody id="rows"></tbody></table></div>
    <p class="muted small">예약 글은 공개 일시가 되면 자동으로 사이트에 나타납니다(매시 정각 다시 빌드). 지금 ${esc(now)}</p>
  </section>`);
  const rows = () => {
    const q = BF.q.trim();
    const list = posts.filter(p => (BF.st === 'all' || p.status === BF.st) && (!q || p.title.includes(q)))
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
    $('#rows').innerHTML = list.length ? list.map(p => `<tr>
      <td><span class="badge b-${p.status}">${p.status === 'live' ? '공개' : '예약'}</span></td>
      <td class="c-main t-title">${p.status === 'live' ? `<a href="/blog/${p.slug}/" target="_blank" rel="noopener">${esc(p.title)}</a>` : esc(p.title)}<div class="t-sub">${esc(p.slug)}</div></td>
      <td class="c-hide">${esc(p.category)}</td>
      <td class="nowrap" data-l="공개">${esc(p.date)} ${esc(p.time)}</td>
      <td class="num" data-l="조회">${num(p.views)}</td>
      <td class="c-hide">${p.editor === 'admin' ? '어드민' : 'AI·제작'}</td>
      <td><a class="btn btn-s" href="#blog/edit/${encodeURIComponent(p.slug)}">편집</a></td></tr>`).join('') : '<tr><td colspan="7" class="empty">조건에 맞는 글이 없습니다</td></tr>';
  };
  rows();
  $$('[data-st]').forEach(b => b.addEventListener('click', () => { BF.st = b.dataset.st; $$('[data-st]').forEach(x => x.setAttribute('aria-pressed', x === b)); rows(); }));
  $('#q').addEventListener('input', e => { BF.q = e.target.value; rows(); });
}

const MD_HELP = `## 소제목            → 글 목차에 들어가는 큰 제목
### 작은 제목
**굵게**
[공연 보기](shows/hanbbeumsai/)   → 사이트 안 링크(앞에 / 없이)
[네이버 예약](https://booking.naver.com/…)   → 바깥 링크
- 목록 항목
| 구분 | 내용 |        → 표(첫 줄 제목, 둘째 줄 |---|---|)
|---|---|
| 가격 | 15,000원 |

## 자주 묻는 질문      → 이 아래 ### Q. 질문 + 답은 검색·AI용 FAQ로 표시
### Q. 주차할 수 있나요?
공연장에 주차 시설이 없습니다.`;

async function blogEdit(slug) {
  document.title = (slug ? '글 편집' : '새 글') + ' | 파릇 어드민';
  const p = slug ? await api(`post?slug=${encodeURIComponent(slug)}`) : { date: META.today, time: '09:00', category: META.categories[0], body: '' };
  const isNew = !slug;
  const opt = (v, cur, label = v) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;
  shell('blog', `
  <div class="page-hd"><div><h1 class="page">${isNew ? '새 글 쓰기' : '글 편집'}</h1><p class="muted small">${isNew ? '공개 일시를 미래로 두면 예약 글이 됩니다.' : `<a href="/blog/${esc(slug)}/" target="_blank" rel="noopener">${esc(SITE)}blog/${esc(slug)}/</a>`}</p></div>
    <a class="btn" href="#blog">목록으로</a></div>
  <form class="form card" id="pf" novalidate>
    <div id="errs"></div>
    <div class="field"><label for="title">제목 <span class="count" data-for="title" data-min="8" data-max="80"></span></label><input type="text" id="title" value="${esc(p.title)}" required>
      <div class="hint">검색하는 사람의 질문이 드러나게(예: 대학로 데이트 연극, 무엇을 볼까?)</div></div>
    <div class="field"><label for="description">요약 <span class="count" data-for="description" data-min="20" data-max="160"></span></label><textarea id="description" rows="2" required>${esc(p.description)}</textarea>
      <div class="hint">검색 결과·AI 답변에 쓰이는 한두 문장. 글의 답을 바로 적습니다.</div></div>
    <div class="row" style="--cols:3">
      <div class="field"><label for="slug">주소(slug)</label><input type="text" id="slug" value="${esc(p.slug)}" ${isNew ? 'required placeholder="예: daehakro-date-play"' : 'disabled'}>
        <div class="hint">${isNew ? '영문 소문자·숫자·하이픈. 저장 뒤에는 바꿀 수 없습니다.' : '공개된 주소는 바꾸지 않습니다(링크가 깨짐).'}</div></div>
      <div class="field"><label for="date">공개 날짜</label><input type="date" id="date" value="${esc(p.date)}" required></div>
      <div class="field"><label for="time">공개 시각</label><input type="time" id="time" value="${esc(p.time || '09:00')}" step="3600"><div class="hint">정각 기준으로 공개됩니다</div></div>
    </div>
    <div class="row" style="--cols:3">
      <div class="field"><label for="category">분류</label><select id="category">${META.categories.map(c => opt(c, p.category)).join('')}</select></div>
      <div class="field"><label for="show">연결 공연</label><select id="show">${opt('', p.show || '', '없음')}${META.shows.map(s => opt(s.slug, p.show || '', s.title)).join('')}</select><div class="hint">글 아래에 이 공연 예매 카드가 붙습니다</div></div>
      <div class="field"><label for="keyword">대표 키워드(선택)</label><input type="text" id="keyword" value="${esc(p.keyword)}"><div class="hint">다른 글과 겹치지 않게</div></div>
    </div>
    <div class="field"><label for="tags">태그</label><input type="text" id="tags" value="${esc(p.tags)}" placeholder="쉼표로 구분: 대학로 연극, 데이트"></div>
    <div class="field"><label for="body">본문 <span class="count" id="bodyCount"></span></label><textarea id="body" class="md" required>${esc(p.body)}</textarea>
      <details class="help"><summary>본문 쓰는 법</summary><pre>${esc(MD_HELP)}</pre></details></div>
    <div class="form-acts"><button class="btn btn-primary" type="submit" id="save">저장</button><a class="btn" href="#blog">취소</a><span class="grow"></span>
      ${isNew ? '' : '<button class="btn btn-danger" type="button" id="del">글 삭제</button>'}</div>
  </form>`);
  const counts = () => {
    $$('.count[data-for]').forEach(c => { const n = $('#' + c.dataset.for).value.trim().length; c.textContent = `${n}자`; c.classList.toggle('over', n < +c.dataset.min || n > +c.dataset.max); });
    $('#bodyCount').textContent = `공백 제외 ${num($('#body').value.replace(/\s+/g, '').length)}자`;
  };
  counts(); $('#pf').addEventListener('input', counts);
  $('#pf').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#save'); busy(btn, true); $('#errs').innerHTML = '';
    const v = id => $('#' + id).value;
    try {
      const r = await api('post', { original: slug || '', slug: isNew ? v('slug') : slug, title: v('title'), description: v('description'), date: v('date'), time: v('time'), category: v('category'), show: v('show'), keyword: v('keyword'), tags: v('tags'), body: v('body') });
      toast(r.mode === 'github' ? '저장했습니다. 사이트에는 곧 반영되고, 저장소에도 커밋했습니다.' : '저장했습니다(이 컴퓨터의 파일).');
      location.hash = 'blog';
    } catch (err) { showErrors(err); } finally { busy(btn, false); }
  });
  $('#del')?.addEventListener('click', async () => {
    if (!confirm('이 글을 삭제할까요? 사이트에서 사라지고 되돌리려면 저장소 기록에서 복구해야 합니다.')) return;
    try { await api('post/delete', { slug }); toast('삭제했습니다.'); location.hash = 'blog'; } catch (err) { showErrors(err); }
  });
}
function showErrors(err) {
  const list = err.data?.errors;
  $('#errs').innerHTML = `<ul class="errors" role="alert">${(list?.length ? list : [err.message]).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  $('#errs').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ═════════ 공지·이벤트 ═════════
const NCAT = { event: '이벤트', notice: '공지', audition: '오디션' };
function noticeStatus(n, today) { // src/data.mjs noticeStatus 와 같은 규칙
  const mdk = d => `${+d.slice(5, 7)}월 ${+d.slice(8, 10)}일`;
  if (n.cat === 'audition') return { key: 'closed', label: '지난 공고' };
  if (n.cat === 'notice') return { key: 'notice', label: '공지' };
  if (n.end && today > n.end) return { key: 'closed', label: '종료' };
  if (n.start && today < n.start) return { key: 'soon', label: `${mdk(n.start)} 시작` };
  if (!n.start && !n.end) return { key: 'always', label: '상시' };
  return { key: 'on', label: '진행 중' };
}
const period = n => n.cat !== 'event' ? '' : n.start && n.end ? `${n.start} ~ ${n.end}` : n.end ? `${n.end}까지` : '상시';
let NF = 'all';
async function noticeList() {
  document.title = '공지·이벤트 | 파릇 어드민';
  const { notices, today } = await api('notices');
  const RANK = { on: 0, soon: 1, always: 2, notice: 3, closed: 4 };
  const all = notices.map(n => ({ ...n, st: noticeStatus(n, today) })).sort((a, b) => RANK[a.st.key] - RANK[b.st.key] || b.date.localeCompare(a.date));
  const cnt = k => all.filter(n => n.st.key === k).length;
  const show = slug => META.shows.find(s => s.slug === slug)?.title || '';
  shell('notices', `
  <div class="page-hd"><div><h1 class="page">공지·이벤트</h1><p class="stats-row"><span>진행 중 <b>${cnt('on')}</b></span><span>시작 예정 <b>${cnt('soon')}</b></span><span>상시 <b>${cnt('always')}</b></span><span>공지 <b>${cnt('notice')}</b></span><span>종료·지난 공고 <b>${cnt('closed')}</b></span></p></div>
    <a class="btn btn-primary" href="#notices/new">새 공지·이벤트</a></div>
  <section class="card">
    <div class="toolbar"><div class="chips" role="group" aria-label="상태">${[['all', '전체'], ['on', '진행 중'], ['soon', '시작 예정'], ['always', '상시'], ['notice', '공지'], ['closed', '종료·지난 공고']].map(([k, l]) => `<button type="button" data-nf="${k}" aria-pressed="${NF === k}">${l}</button>`).join('')}</div></div>
    <div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>이미지</th><th>상태</th><th>제목</th><th>기간</th><th>게시일</th><th></th></tr></thead><tbody id="rows"></tbody></table></div>
    <p class="muted small">상태는 날짜에 따라 자동으로 바뀝니다(종료일 다음 날 「종료」). 목록 순서: 진행 중 → 예정 → 상시 → 공지 → 종료.</p>
  </section>`);
  const rows = () => {
    const list = all.filter(n => NF === 'all' || n.st.key === NF);
    $('#rows').innerHTML = list.length ? list.map(n => `<tr>
      <td class="c-hide">${n.imgs ? `<img class="thumb" src="/assets/img/notice/${esc(n.id)}-t.webp${n.v ? `?v=${esc(n.v)}` : ''}" alt="" loading="lazy">` : '<span class="thumb"></span>'}</td>
      <td><span class="badge b-${n.st.key}">${esc(n.st.label)}</span> <span class="badge">${NCAT[n.cat]}</span></td>
      <td class="c-main t-title"><a href="/notice/#${esc(n.id)}" target="_blank" rel="noopener">${esc(n.title)}</a><div class="t-sub">${esc(show(n.show))}${n.imgs ? ` · 이미지 ${n.imgs}장` : ''}</div></td>
      <td class="nowrap" data-l="기간">${esc(period(n)) || '—'}</td>
      <td class="nowrap" data-l="게시">${esc(n.date)}</td>
      <td><a class="btn btn-s" href="#notices/edit/${encodeURIComponent(n.id)}">편집</a></td></tr>`).join('') : '<tr><td colspan="6" class="empty">조건에 맞는 글이 없습니다</td></tr>';
  };
  rows();
  $$('[data-nf]').forEach(b => b.addEventListener('click', () => { NF = b.dataset.nf; $$('[data-nf]').forEach(x => x.setAttribute('aria-pressed', x === b)); rows(); }));
}

async function noticeEdit(id) {
  document.title = (id ? '공지 편집' : '새 공지·이벤트') + ' | 파릇 어드민';
  const { notices, today } = await api('notices');
  const n = id ? notices.find(x => x.id === id) : { cat: 'event', date: today, body: [], imgs: 0 };
  if (!n) throw new Error('공지를 찾지 못했습니다(이미 삭제됐을 수 있음)');
  const opt = (v, cur, label = v) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;
  const cur = Array.from({ length: n.imgs || 0 }, (_, k) => `/assets/img/notice/${n.id}${k ? `-${k + 1}` : ''}.webp${n.v ? `?v=${n.v}` : ''}`);
  shell('notices', `
  <div class="page-hd"><div><h1 class="page">${id ? '공지·이벤트 편집' : '새 공지·이벤트'}</h1>${id ? `<p class="muted small"><a href="/notice/#${esc(n.id)}" target="_blank" rel="noopener">${esc(SITE)}notice/#${esc(n.id)}</a></p>` : ''}</div><a class="btn" href="#notices">목록으로</a></div>
  <form class="form card" id="nf" novalidate>
    <div id="errs"></div>
    <div class="row" style="--cols:3">
      <div class="field"><label for="cat">분류</label><select id="cat">${Object.entries(NCAT).map(([k, l]) => opt(k, n.cat, l)).join('')}</select></div>
      <div class="field"><label for="show">관련 공연</label><select id="show">${opt('', n.show || '', '없음')}${META.shows.map(s => opt(s.slug, n.show || '', s.title)).join('')}</select><div class="hint">이벤트면 예매 버튼이 함께 나옵니다</div></div>
      <div class="field"><label for="date">게시일</label><input type="date" id="date" value="${esc(n.date)}"></div>
    </div>
    <div class="row ev-only" style="--cols:2">
      <div class="field"><label for="start">시작일(선택)</label><input type="date" id="start" value="${esc(n.start)}"></div>
      <div class="field"><label for="end">종료일(선택)</label><input type="date" id="end" value="${esc(n.end)}"><div class="hint">둘 다 비우면 「상시」, 종료일만 있으면 「○월 ○일까지」</div></div>
    </div>
    <div class="field"><label for="title">제목 <span class="count" data-for="title" data-min="4" data-max="80"></span></label><input type="text" id="title" value="${esc(n.title)}" placeholder="예: 「한뼘사이」 수험생 특별 할인"></div>
    <div class="field"><label for="summary">요약 <span class="count" data-for="summary" data-min="10" data-max="300"></span></label><textarea id="summary" rows="3">${esc(n.summary)}</textarea><div class="hint">목록에 보이는 한두 문장(대상·기간·가격을 먼저)</div></div>
    <div class="field"><label for="body">자세한 안내</label><textarea id="body" rows="5" placeholder="한 줄에 한 항목씩">${esc((n.body || []).join('\n'))}</textarea><div class="hint">펼쳤을 때 점 목록으로 보입니다</div></div>
    <div class="field"><label for="note">참고 문구(선택)</label><input type="text" id="note" value="${esc(n.note)}"></div>
    <div class="field"><span class="lbl">이미지</span>
      ${cur.length ? `<div class="imgs">${cur.map(u => `<img src="${u}" alt="">`).join('')}</div>` : '<p class="muted small" style="margin:0">지금 이미지가 없습니다.</p>'}
      <div class="radios" style="margin-top:10px">
        <label><input type="radio" name="im" value="keep" checked> ${cur.length ? '그대로 두기' : '이미지 없이'}</label>
        <label><input type="radio" name="im" value="new"> 새 이미지로 ${cur.length ? '바꾸기' : '올리기'}</label>
        ${cur.length ? '<label><input type="radio" name="im" value="clear"> 이미지 모두 빼기</label>' : ''}
      </div>
      <div id="upWrap" hidden style="margin-top:10px"><input type="file" id="files" accept="image/*" multiple><div class="hint">JPG·PNG·WEBP, 6장까지. 첫 장이 목록 썸네일이 됩니다. 폭 900px로 줄여 WEBP로 바꿔 올립니다(크롬·엣지 권장).</div><div class="imgs" id="prev"></div></div>
    </div>
    <div class="form-acts"><button class="btn btn-primary" type="submit" id="save">저장</button><a class="btn" href="#notices">취소</a><span class="grow"></span>${id ? '<button class="btn btn-danger" type="button" id="del">삭제</button>' : ''}</div>
  </form>`);
  const sync = () => { $$('.ev-only').forEach(x => { x.hidden = $('#cat').value !== 'event'; }); };
  const counts = () => $$('.count[data-for]').forEach(c => { const k = $('#' + c.dataset.for).value.trim().length; c.textContent = `${k}자`; c.classList.toggle('over', k < +c.dataset.min || k > +c.dataset.max); });
  sync(); counts();
  $('#cat').addEventListener('change', sync); $('#nf').addEventListener('input', counts);
  $$('input[name=im]').forEach(r => r.addEventListener('change', () => { $('#upWrap').hidden = $('input[name=im]:checked').value !== 'new'; }));
  let prepared = null;
  $('#files').addEventListener('change', async e => {
    const files = [...e.target.files].slice(0, 6);
    $('#prev').innerHTML = '<span class="muted small">이미지 준비 중…</span>';
    try {
      prepared = [];
      for (const [k, f] of files.entries()) prepared.push({ main: await toWebp(f, 900), thumb: k === 0 ? await toWebp(f, 480, 360) : undefined });
      $('#prev').innerHTML = prepared.map(x => `<img src="data:image/webp;base64,${x.main}" alt="">`).join('');
    } catch (err) { prepared = null; $('#prev').innerHTML = `<span class="err">${esc(err.message)}</span>`; }
  });
  $('#nf').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#save'); $('#errs').innerHTML = '';
    const mode = $('input[name=im]:checked').value;
    if (mode === 'new' && !prepared?.length) { showErrors(new Error('올릴 이미지를 고르세요')); return; }
    busy(btn, true);
    const v = k => $('#' + k).value;
    try {
      await api('notice', { notice: { id: id || '', cat: v('cat'), show: v('show'), date: v('date'), start: v('start'), end: v('end'), title: v('title'), summary: v('summary'), body: v('body'), note: v('note') },
        images: mode === 'new' ? prepared : mode === 'clear' ? [] : null });
      toast('저장했습니다. 사이트에는 곧 반영됩니다.');
      location.hash = 'notices';
    } catch (err) { showErrors(err); } finally { busy(btn, false); }
  });
  $('#del')?.addEventListener('click', async () => {
    if (!confirm('이 공지·이벤트를 삭제할까요?')) return;
    try { await api('notice/delete', { id }); toast('삭제했습니다.'); location.hash = 'notices'; } catch (err) { showErrors(err); }
  });
}

// 이미지 → WEBP(base64). w×h를 주면 그 크기로 가운데를 잘라 채운다(목록 썸네일 480×360)
async function toWebp(file, w, h) {
  const bmp = await createImageBitmap(file);
  let sw = bmp.width, sh = bmp.height, sx = 0, sy = 0, dw, dh;
  if (h) { const r = Math.max(w / sw, h / sh); dw = w; dh = h; sx = (sw - w / r) / 2; sy = (sh - h / r) / 2; sw = w / r; sh = h / r; }
  else { dw = Math.min(w, bmp.width); dh = Math.round(bmp.height * dw / bmp.width); }
  const c = document.createElement('canvas'); c.width = dw; c.height = dh;
  c.getContext('2d').drawImage(bmp, sx, sy, sw, sh, 0, 0, dw, dh);
  const blob = await new Promise(ok => c.toBlob(ok, 'image/webp', h ? .8 : .78));
  if (!blob || blob.type !== 'image/webp') throw new Error('이 브라우저는 WEBP로 바꾸지 못합니다. 크롬이나 엣지에서 올려 주세요.');
  if (blob.size > 1.5e6) throw new Error(`${file.name}: 바꾼 뒤에도 1.5MB가 넘습니다. 더 작은 이미지를 써 주세요.`);
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

start().catch(e => { app.innerHTML = `<p class="boot">어드민을 불러오지 못했습니다: ${esc(e.message)}</p>`; });

/* 파릇 — 인터랙션: 히어로 필름·스크롤 시퀀스(카드 축소, 단어 밝힘, 가로 라인업, 스포트라이트, 연혁)·모달·드로어·바텀시트·토스트·아코디언·탭·스켈레톤 */
(() => {
  'use strict';
  const d = document, html = d.documentElement;
  html.classList.add('js');
  const $ = (s, r = d) => r.querySelector(s);
  const $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const SHOWS = (() => { try { return JSON.parse($('#showData')?.textContent || '[]'); } catch (e) { return []; } })();
  const byId = id => SHOWS.find(s => s.id === id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ROOT = (d.body.dataset.root || './');

  // 스크롤 핸들러를 한 프레임에 한 번만
  const onScrollFns = [];
  let ticking = false;
  const runScroll = () => { ticking = false; onScrollFns.forEach(f => f()); };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(runScroll); } }, { passive: true });
  addEventListener('resize', () => requestAnimationFrame(runScroll), { passive: true });

  // ── 토스트 ──
  const toastBox = $('#toasts');
  function toast(msg, type = 'ok', ms = 2800) {
    if (!toastBox) return;
    const t = d.createElement('div');
    t.className = 'toast toast-' + type; t.setAttribute('role', 'status');
    t.innerHTML = `<svg class="ico" aria-hidden="true"><use href="#i-${type === 'ok' ? 'check' : 'info'}"/></svg><span></span>`;
    t.querySelector('span').textContent = msg;
    toastBox.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, ms);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = d.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0';
      d.body.appendChild(ta); ta.select();
      let ok = false; try { ok = d.execCommand('copy'); } catch (_) { /* 무시 */ }
      ta.remove(); return ok;
    }
  }
  d.addEventListener('click', async e => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    const ok = await copy(b.dataset.copy);
    toast(ok ? (b.dataset.copyMsg || '복사했습니다') : '복사하지 못했습니다. 길게 눌러 직접 복사해 주세요', ok ? 'ok' : 'info');
  });
  // 예매(네이버 예약) 링크: 새 창 안내
  d.addEventListener('click', e => {
    const a = e.target.closest('a[data-book]');
    if (a) toast(`${a.dataset.book} 예매 페이지(네이버 예약)를 새 창으로 엽니다`, 'info', 2400);
  });

  // ── 레이어(모달·드로어·바텀시트): 포커스 가두기, Esc, 바깥 클릭 ──
  const stack = [];
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  function openLayer(id, opener) {
    const el = d.getElementById(id);
    if (!el || stack.includes(el)) return;
    el._opener = opener || d.activeElement;
    el.hidden = false; stack.push(el);
    d.body.classList.add('locked');
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('open')));
    const first = $$(FOCUSABLE, el).find(x => x.offsetParent !== null && !x.closest('[hidden]') && !x.matches('.modal-scrim,.drawer-scrim'));
    setTimeout(() => first && first.focus({ preventScroll: true }), 60);
    $$(`[aria-controls="${id}"]`).forEach(b => b.setAttribute('aria-expanded', 'true'));
  }
  function closeLayer(el) {
    if (!el) return;
    el.classList.remove('open');
    stack.splice(stack.indexOf(el), 1);
    $$(`[aria-controls="${el.id}"]`).forEach(b => b.setAttribute('aria-expanded', 'false'));
    setTimeout(() => { el.hidden = true; if (!stack.length) d.body.classList.remove('locked'); }, reduce ? 0 : 380);
    if (el._opener && el._opener.focus) el._opener.focus({ preventScroll: true });
  }
  window.paroot = { toast, openLayer, closeLayer };
  d.addEventListener('click', e => {
    const op = e.target.closest('[data-open]');
    if (op) { e.preventDefault(); const top = stack[stack.length - 1]; if (top && op.closest('.drawer,.modal') === top) closeLayer(top); openLayer(op.dataset.open, op); return; }
    const cl = e.target.closest('[data-close]');
    if (cl) { closeLayer(cl.closest('.modal,.drawer')); return; }
    const lk = e.target.closest('.drawer a[href]');
    if (lk && !lk.target) closeLayer(lk.closest('.drawer'));
  });
  d.addEventListener('keydown', e => {
    const top = stack[stack.length - 1];
    if (!top) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLayer(top); return; }
    if (e.key !== 'Tab') return;
    const f = $$(FOCUSABLE, top).filter(x => x.offsetParent !== null && !x.closest('[hidden]'));
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && d.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && d.activeElement === z) { e.preventDefault(); a.focus(); }
  });
  // 바텀시트: 손잡이를 아래로 끌어 닫기(모바일)
  $$('.modal').forEach(m => {
    const panel = $('.modal-panel', m); const grip = $('.sheet-grip', m);
    if (!panel || !grip) return;
    let y0 = null;
    grip.addEventListener('pointerdown', e => { y0 = e.clientY; grip.setPointerCapture(e.pointerId); panel.style.transition = 'none'; });
    grip.addEventListener('pointermove', e => { if (y0 === null) return; const dy = Math.max(0, e.clientY - y0); panel.style.transform = `translateY(${dy}px)`; });
    const end = e => { if (y0 === null) return; const dy = e.clientY - y0; y0 = null; panel.style.transition = ''; panel.style.transform = ''; if (dy > 90) closeLayer(m); };
    grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
  });

  // ── 공연 빠른 보기(모달) ──
  function showModal(id, opener) {
    const s = byId(id); if (!s) return;
    const body = $('#qvBody'); $('#qvTitle').textContent = s.title;
    body.innerHTML = `<div class="qv">
      <div class="qv-poster ph"><img src="${ROOT}${s.poster}" alt="${esc(s.title)} 포스터" width="800" height="1000"></div>
      <div class="qv-info">
        <span class="tag tag-pink">${esc(s.genre)}</span>
        <p class="qv-hook">${esc(s.hook)}</p>
        <dl class="qv-dl">${s.facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
        ${s.rating ? `<p class="qv-rate"><span class="stars" aria-hidden="true">★</span> <b>${s.rating.avg.toFixed(2)}</b> <span class="muted">네이버 예약 관람평 ${s.rating.count.toLocaleString('ko-KR')}건 · ${esc(s.rating.asof)} 기준</span></p>` : ''}
        <div class="qv-acts"><a class="btn btn-pink" href="${s.booking}" target="_blank" rel="noopener" data-book="${esc(s.title)}">예매하기</a><a class="btn btn-line" href="${ROOT}${s.url}">공연 자세히 보기</a></div>
      </div></div>`;
    watchImgs(body);
    openLayer('modalShow', opener);
  }
  d.addEventListener('click', e => { const b = e.target.closest('[data-qv]'); if (b) { e.preventDefault(); showModal(b.dataset.qv, b); } });

  // ── 후기 원문(모달) ──
  d.addEventListener('click', e => {
    const c = e.target.closest('.rv-card[data-full]');
    if (!c) return;
    $('#rvTitle').textContent = c.dataset.show + ' 관람 후기';
    $('#rvBody').innerHTML = `<p class="rv-full">${esc(c.dataset.full)}</p><p class="muted">${esc(c.dataset.meta)}</p><p class="muted">후기는 네이버 예약에 공개된 관람평을 맞춤법 수정 없이 원문 그대로 옮겼습니다. 작성자 이름은 일부 가렸습니다.</p>`;
    openLayer('modalReview', c);
  });
  const rows = $('.rv-rows'), rvBtn = $('#rvPause');
  if (rows && rvBtn) rvBtn.addEventListener('click', () => {
    const p = rows.classList.toggle('paused');
    rvBtn.setAttribute('aria-pressed', String(p));
    rvBtn.querySelector('span').textContent = p ? '다시 흐르게' : '멈춤';
  });

  // ── 아코디언 ──
  $$('.acc-panel').forEach(p => {
    const btn = d.querySelector(`[aria-controls="${p.id}"]`);
    const item = p.closest('.acc-item, .dm-group');
    if (item) item.classList.toggle('open', btn && btn.getAttribute('aria-expanded') === 'true');
    p.hidden = false;
  });
  d.addEventListener('click', e => {
    const b = e.target.closest('.acc-btn');
    if (!b) return;
    const item = b.closest('.acc-item, .dm-group');
    const open = !item.classList.contains('open');
    item.classList.toggle('open', open);
    b.setAttribute('aria-expanded', String(open));
  });

  // ── 탭(화살표 이동) ──
  function selectTab(tab) {
    const list = tab.closest('[role="tablist"]');
    $$('[role="tab"]', list).forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      const p = d.getElementById(t.getAttribute('aria-controls'));
      if (p) { p.hidden = !on; if (on) { p.classList.remove('in'); requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('in'))); } }
    });
  }
  d.addEventListener('click', e => { const t = e.target.closest('[role="tab"]'); if (t) selectTab(t); });
  d.addEventListener('keydown', e => {
    const t = e.target.closest('[role="tab"]');
    if (!t || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const tabs = $$('[role="tab"]', t.closest('[role="tablist"]'));
    let i = tabs.indexOf(t);
    i = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    e.preventDefault(); tabs[i].focus(); selectTab(tabs[i]);
  });

  // ── 헤더 · 드롭다운 · 맨 위로 ──
  const hd = $('#hd'), totop = $('.totop'), hero = $('.hero');
  onScrollFns.push(() => {
    const y = scrollY;
    const limit = hero ? hero.offsetHeight - innerHeight * .9 : 8;
    hd && hd.classList.toggle('scrolled', y > limit);
    totop && totop.classList.toggle('show', y > 1200);
  });
  totop && totop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
  $$('.has-sub').forEach(li => {
    const b = $('.nav-sub-btn', li);
    const set = v => { li.classList.toggle('open', v); b.setAttribute('aria-expanded', String(v)); };
    b.addEventListener('click', () => set(!li.classList.contains('open')));
    li.addEventListener('mouseenter', () => matchMedia('(hover:hover)').matches && set(true));
    li.addEventListener('mouseleave', () => matchMedia('(hover:hover)').matches && set(false));
    d.addEventListener('click', e => { if (!li.contains(e.target)) set(false); });
    li.addEventListener('keydown', e => { if (e.key === 'Escape') { set(false); b.focus(); } });
  });

  // ── 등장 효과 · 숫자 올리기 ──
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal, .bars').forEach(el => io.observe(el));
  const fmt = (n, dec) => dec ? n.toFixed(dec) : Math.round(n).toLocaleString('ko-KR');
  const cio = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    cio.unobserve(en.target);
    const el = en.target, to = +el.dataset.count, dec = +(el.dataset.dec || 0), plain = 'plain' in el.dataset;
    const show = n => { el.textContent = plain ? String(Math.round(n)) : fmt(n, dec); };
    if (reduce) { show(to); return; }
    const t0 = performance.now(), dur = 1300;
    const from = plain ? to - 30 : 0; // 연도는 0부터 세지 않고 가까운 값에서 올린다
    const step = t => { const k = clamp((t - t0) / dur); show(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); else show(to); };
    requestAnimationFrame(step);
  }), { threshold: .5 });
  $$('[data-count]').forEach(el => cio.observe(el));

  // ── 사진: 받는 동안 스켈레톤 ──
  function watchImgs(root = d) {
    $$('.ph img', root).forEach(img => {
      const done = () => img.closest('.ph').classList.add('is-loaded');
      if (img.complete && img.naturalWidth) done(); else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
    });
  }
  watchImgs();

  // ── 1) 히어로 필름 + 스크롤하면 카드로 줄며 기존 배너 문구 등장 ──
  if (hero) {
    const v = $('video', hero), snd = $('#filmSound'), rep = $('#filmReplay');
    const saveData = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''));
    if (v) {
      const portrait = matchMedia('(max-aspect-ratio: 4/5)').matches && innerWidth < 900;
      // 느린 연결(3G)은 720p 가벼운 영상. downlink 는 첫 방문 때 낮게 잡히는 일이 있어 쓰지 않는다
      const conn = navigator.connection, slow = !!conn && /3g/.test(conn.effectiveType || '');
      const big = !portrait && screen.width * devicePixelRatio >= 2400 && !saveData && !slow;
      const src = portrait ? (slow ? v.dataset.srcMLite : v.dataset.srcM) : big ? v.dataset.src4k : v.dataset.src;
      if (portrait) v.poster = ROOT + 'assets/video/hero-poster-m.webp';
      if (!reduce && !saveData) {
        // 휴대폰에서는 글꼴·첫 화면 이미지가 먼저 받아지도록 페이지 로드가 끝난 뒤 영상을 받기 시작(그동안 포스터)
        const start = () => { if (v.getAttribute('src')) return; v.src = ROOT + src; v.muted = true; v.play().catch(() => { rep && (rep.hidden = false); }); };
        if (!portrait || d.readyState === 'complete') start();
        else { addEventListener('load', start, { once: true }); setTimeout(start, 2500); }
      } else {
        v.removeAttribute('autoplay'); v.preload = 'none'; v.dataset.lazy = src; rep && (rep.hidden = false);
      }
      v.addEventListener('timeupdate', () => hero.style.setProperty('--fp', (v.currentTime / (v.duration || 15)).toFixed(4)));
      v.addEventListener('ended', () => { rep && (rep.hidden = false); hero.classList.add('film-ended'); });
      const ensureSrc = () => { if (!v.getAttribute('src') && v.dataset.lazy) v.src = ROOT + v.dataset.lazy; };
      snd && snd.addEventListener('click', () => {
        ensureSrc();
        const on = v.muted;
        v.muted = !on;
        snd.setAttribute('aria-pressed', String(on));
        snd.querySelector('span').textContent = on ? '소리 끄기' : '소리 켜기';
        $('use', snd).setAttribute('href', on ? '#i-sound' : '#i-mute');
        if (on && (v.ended || v.paused)) { v.currentTime = 0; v.play(); rep && (rep.hidden = true); }
        toast(on ? '소리를 켰습니다' : '소리를 껐습니다', 'ok', 1600);
      });
      rep && rep.addEventListener('click', () => { ensureSrc(); v.currentTime = 0; v.play(); rep.hidden = true; hero.classList.remove('film-ended'); });
      // 화면 밖이면 멈춤(배터리·데이터 절약)
      new IntersectionObserver(([en]) => { if (!en.isIntersecting && !v.paused) v.pause(); }, { threshold: 0 }).observe(hero);
    }
    if (!reduce) onScrollFns.push(() => {
      const max = hero.offsetHeight - innerHeight;
      const p = clamp(scrollY / Math.max(1, max));
      hero.style.setProperty('--p', p.toFixed(4));
      hero.style.setProperty('--shade', clamp((p - .12) * 2.4).toFixed(3));
    });
    else hero.style.setProperty('--p', '1');
  }

  // ── 2) 소개 문장: 스크롤에 맞춰 단어가 차례로 밝아짐 ──
  $$('.manifesto').forEach(m => {
    const words = $$('.w', m);
    if (reduce) { words.forEach(w => w.classList.add('on')); return; }
    onScrollFns.push(() => {
      const r = m.getBoundingClientRect();
      const p = clamp((innerHeight * .82 - r.top) / (r.height + innerHeight * .35));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    });
  });

  // ── 3) 라인업: 세로 스크롤을 가로 이동으로(데스크톱), 모바일은 손으로 넘기기 ──
  $$('.lu-pin:not(.static)').forEach(pin => {
    const rail = $('.lu-rail', pin), stage = $('.lu-stage', pin);
    const filter = $('.lu-filter');
    let maxX = 0;
    const can = () => !reduce && innerWidth >= 900 && innerHeight >= 620;
    function measure() {
      if (!can()) { pin.classList.remove('pinned'); pin.style.removeProperty('--lu-h'); rail.style.removeProperty('transform'); return; }
      pin.classList.add('pinned');
      maxX = Math.max(0, rail.scrollWidth - innerWidth);
      pin.style.setProperty('--lu-h', (innerHeight + maxX * 1.05) + 'px');
      update();
    }
    function update() {
      if (!pin.classList.contains('pinned')) {
        const p = rail.scrollWidth > rail.clientWidth ? rail.scrollLeft / (rail.scrollWidth - rail.clientWidth) : 0;
        pin.style.setProperty('--lu-p', p.toFixed(3)); return;
      }
      const r = pin.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, pin.offsetHeight - innerHeight));
      pin.style.setProperty('--lu-x', (p * maxX).toFixed(1));
      pin.style.setProperty('--lu-p', p.toFixed(3));
    }
    rail.addEventListener('scroll', update, { passive: true });
    onScrollFns.push(update);
    addEventListener('resize', measure);
    addEventListener('load', measure);
    measure();
    filter && filter.addEventListener('click', e => {
      const b = e.target.closest('[data-cat]'); if (!b) return;
      $$('[data-cat]', filter).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      const c = b.dataset.cat; let n = 0;
      $$('.show-card', rail).forEach(card => { const on = c === 'all' || card.dataset.cat === c; card.hidden = !on; n += on; });
      measure();
      if (pin.classList.contains('pinned')) { const top = pin.getBoundingClientRect().top + scrollY; if (scrollY > top) scrollTo({ top, behavior: 'auto' }); }
      else rail.scrollTo({ left: 0 });
      toast(`${b.textContent.trim()} · 공연 ${n}편`, 'ok', 1500);
    });
  });

  // ── 4) 한뼘사이 벤토: 타일 위에서 마우스를 따라오는 빛 ──
  const bento = $('#bento');
  if (bento && !reduce && matchMedia('(hover: hover)').matches) {
    bento.addEventListener('pointermove', e => {
      const t = e.target.closest('.bt'); if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      t.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  // ── 5) 연혁: 진행 선이 차오르고, 지나간 해에 불이 들어옴 ──
  $$('.history').forEach(h => {
    const line = $('.hs-line', h), items = $$('.hs-item', h), yr = $('.hs-year', h);
    onScrollFns.push(() => {
      const r = line.getBoundingClientRect();
      const p = clamp((innerHeight * .55 - r.top) / r.height);
      line.style.setProperty('--hp', p.toFixed(3));
      let cur = items[0];
      items.forEach(it => { const on = it.getBoundingClientRect().top < innerHeight * .55; it.classList.toggle('on', on); if (on) cur = it; });
      if (yr && cur && yr.textContent !== cur.dataset.year) yr.textContent = cur.dataset.year;
    });
  });

  // ── 6) 누구와 보나요? (관람 도우미) — 고르면 잠깐 스켈레톤 뒤 추천 ──
  const fd = $('#finder');
  if (fd) {
    const res = $('.fd-result', fd);
    const render = who => {
      res.innerHTML = '<div class="skel skel-line" style="width:60%"></div><div class="fd-pick"><div class="skel" style="width:92px;height:115px;border-radius:10px"></div><div><div class="skel skel-line" style="width:70%"></div><div class="skel skel-line" style="width:90%"></div></div></div>';
      setTimeout(() => {
        const picks = SHOWS.filter(s => s.audience.includes(who));
        const label = $(`[data-who="${who}"]`, fd).textContent.trim();
        res.innerHTML = `<p class="muted" style="margin:0 0 4px">${esc(label)}에게 맞는 공연 ${picks.length}편</p>` + picks.map(s => `<a class="fd-pick" href="${ROOT}${s.url}"><img src="${ROOT}${s.thumb}" alt="" width="184" height="230" loading="lazy"><span><b>${esc(s.title)}</b><span>${esc(s.genre)} · ${esc(s.whyFor[who] || s.hook)}</span></span></a>`).join('');
      }, reduce ? 0 : 420);
    };
    fd.addEventListener('click', e => {
      const b = e.target.closest('[data-who]'); if (!b) return;
      $$('[data-who]', fd).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      render(b.dataset.who);
    });
  }

  // ── 7) 공연 상세: 하위 메뉴 위치 표시, 상세 이미지 펼치기, 모바일 예매 바 ──
  const subnav = $('.subnav');
  if (subnav) {
    const row = $('.wrap', subnav), links = $$('a', subnav), secs = links.map(a => d.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    // 지금 탭을 탭 줄 안에서만 가운데로 민다. scrollIntoView는 페이지 세로 위치까지 움직여서(처음 열 때 아래로 내려감) 쓰지 않는다.
    const center = a => { const r = a.getBoundingClientRect(), w = row.getBoundingClientRect(); row.scrollTo({ left: row.scrollLeft + r.left + r.width / 2 - w.left - w.width / 2, behavior: reduce ? 'auto' : 'smooth' }); };
    onScrollFns.push(() => {
      let cur = secs[0];
      secs.forEach(s => { if (s.getBoundingClientRect().top < innerHeight * .35) cur = s; });
      links.forEach(a => { const on = a.getAttribute('href') === '#' + cur.id; a.classList.toggle('on', on); if (on && subnav.dataset.cur !== cur.id) { subnav.dataset.cur = cur.id; center(a); } });
    });
  }
  $$('[data-fold]').forEach(b => b.addEventListener('click', () => {
    const f = d.getElementById(b.dataset.fold); const open = !f.classList.contains('open');
    f.classList.toggle('open', open); b.setAttribute('aria-expanded', String(open));
    b.querySelector('span').textContent = open ? (b.dataset.less || '상세 정보 접기') : (b.dataset.more || '상세 정보 더 보기');
    if (!open) f.scrollIntoView({ block: 'start' });
    dispatchEvent(new Event('resize'));
  }));
  const mbar = $('.mbar');
  if (mbar) {
    d.body.classList.add('has-bar');
    const anchor = $('.show-hero, .page-hd');
    onScrollFns.push(() => mbar.classList.toggle('show', !anchor || anchor.getBoundingClientRect().bottom < 0));
  }

  // ── 8) 블로그: 분류, 더 보기(스켈레톤) ──
  const list = $('#postList');
  if (list) {
    let all = null, cat = 'all', shown = +list.dataset.initial || 9;
    const card = p => `<a class="post-card reveal in" href="${p.slug}/"><div class="pc-cover ph"><img src="${p.img.src}" alt="" width="1200" height="630" loading="lazy"></div><span class="pc-cat">${esc(p.category)}</span><span class="pc-title">${esc(p.title)}</span><p class="pc-desc">${esc(p.description)}</p><span class="pc-meta">${p.date.replace(/-/g, '.')} · ${p.minutes}분 읽기</span></a>`;
    const skel = n => Array.from({ length: n }, () => '<div class="post-card"><div class="pc-cover skel"></div><div class="skel skel-line" style="width:30%"></div><div class="skel skel-line" style="width:90%"></div><div class="skel skel-line" style="width:70%"></div></div>').join('');
    const more = $('#postMore');
    async function load() { if (!all) { const r = await fetch('posts.json'); all = await r.json(); } return all; }
    async function render(append) {
      if (!append) list.innerHTML = skel(Math.min(6, shown));
      else list.insertAdjacentHTML('beforeend', `<div class="skel-wrap" style="display:contents">${skel(3)}</div>`);
      const ps = (await load()).filter(p => cat === 'all' || p.category === cat);
      await new Promise(r => setTimeout(r, reduce ? 0 : 320));
      list.innerHTML = ps.slice(0, shown).map(card).join('') || '<p class="muted">아직 이 분류의 글이 없습니다.</p>';
      watchImgs(list);
      if (more) more.hidden = ps.length <= shown;
    }
    $$('.blog-filter [data-cat]').forEach(b => b.addEventListener('click', () => {
      $$('.blog-filter [data-cat]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      cat = b.dataset.cat; shown = 9; render(false);
    }));
    more && more.addEventListener('click', () => { shown += 6; render(true); });
  }

  // ── 9) 글: 읽기 진행률, 목차 위치 ──
  const prose = $('.prose');
  if (prose) {
    const bar = $('.readbar'), toc = $$('.toc a'), hs = toc.map(a => d.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    onScrollFns.push(() => {
      const r = prose.getBoundingClientRect();
      bar && bar.style.setProperty('--rp', clamp(-r.top / Math.max(1, r.height - innerHeight)).toFixed(4));
      let cur = null; hs.forEach(h => { if (h.getBoundingClientRect().top < innerHeight * .3) cur = h; });
      toc.forEach(a => a.classList.toggle('on', cur && a.getAttribute('href') === '#' + cur.id));
    });
  }
  d.addEventListener('click', async e => {
    const b = e.target.closest('[data-share]'); if (!b) return;
    const url = location.href.split('#')[0];
    if (navigator.share && matchMedia('(pointer:coarse)').matches) { try { await navigator.share({ title: d.title, url }); return; } catch (_) { /* 취소 */ } }
    toast((await copy(url)) ? '글 주소를 복사했습니다' : '주소를 복사하지 못했습니다', 'ok');
  });

  // ── 10) 공연 목록: 분류 필터 ──
  const sf = $('#showFilter');
  if (sf) {
    const apply = c => {
      $$('[data-sf]', sf).forEach(x => x.setAttribute('aria-pressed', String(x.dataset.sf === c)));
      let n = 0; $$('.show-grid .show-card').forEach(card => { const on = c === 'all' || card.dataset.cat === c; card.hidden = !on; n += on; });
      return n;
    };
    sf.addEventListener('click', e => { const b = e.target.closest('[data-sf]'); if (!b) return; toast(`${b.textContent.replace(/\d+/, '').trim()} · ${apply(b.dataset.sf)}편`, 'ok', 1400); });
    if (location.hash === '#kids') apply('kids');
  }

  // ── 10-1) 홈 공연사진 줄: 마우스·키보드로 고른 장이 펼쳐지고, 화면에 보이는 동안 4.2초마다 다음 장(진행 막대 끝나면) ──
  const reel = $('#reel');
  if (reel) {
    const items = $$('.reel-item', reel);
    const desk = () => matchMedia('(min-width: 761px)').matches;
    const on = i => items.forEach((li, k) => li.classList.toggle('on', k === i));
    const cur = () => items.findIndex(li => li.classList.contains('on'));
    items.forEach((li, k) => {
      li.addEventListener('mouseenter', () => { if (desk()) { on(k); reel.classList.add('paused'); } });
      li.addEventListener('focusin', () => { on(k); reel.classList.add('paused'); });
    });
    reel.addEventListener('mouseleave', () => reel.classList.remove('paused'));
    reel.addEventListener('focusout', e => { if (!reel.contains(e.relatedTarget)) reel.classList.remove('paused'); });
    if (!reduce) {
      reel.addEventListener('animationend', e => { if (e.animationName === 'reelbar' && desk()) on((cur() + 1) % items.length); });
      new IntersectionObserver(([en]) => reel.classList.toggle('auto', en.isIntersecting), { threshold: .35 }).observe(reel);
    }
  }

  // ── 11) 무대 사진 라이트박스(모달) ──
  const gals = $$('[data-lightbox]');
  if (gals.length) {
    let idx = 0;
    const show = i => {
      idx = (i + gals.length) % gals.length;
      const g = gals[idx], im = $('#lbImg'), ph = im.closest('.ph');
      ph.classList.remove('is-loaded');
      im.onload = () => ph.classList.add('is-loaded');
      im.src = g.dataset.lightbox; im.alt = g.dataset.alt || '';
      $('#lbCount').textContent = `${idx + 1} / ${gals.length}`;
    };
    gals.forEach((g, i) => g.addEventListener('click', () => { show(i); openLayer('modalImg', g); }));
    d.addEventListener('click', e => { const b = e.target.closest('[data-lb]'); if (b) show(idx + +b.dataset.lb); });
    d.addEventListener('keydown', e => { const m = $('#modalImg'); if (!m || m.hidden) return; if (e.key === 'ArrowRight') show(idx + 1); if (e.key === 'ArrowLeft') show(idx - 1); });
  }

  // ── 12) 문의 내용 정리(메일 앱으로 열기·복사) — 서버로 보내지 않음 ──
  const cf = $('#composeForm');
  if (cf) {
    const tel = cf.elements.tel;
    tel.addEventListener('input', () => {
      const v = tel.value.replace(/\D/g, '').slice(0, 11);
      tel.value = v.length < 4 ? v : v.length < 8 ? `${v.slice(0, 3)}-${v.slice(3)}` : `${v.slice(0, 3)}-${v.slice(3, v.length - 4)}-${v.slice(-4)}`;
    });
    const build = () => {
      const f = cf.elements; let bad = null;
      ['org', 'name', 'tel'].forEach(k => { const ok = f[k].value.trim().length > 1; f[k].setAttribute('aria-invalid', String(!ok)); if (!ok && !bad) bad = f[k]; });
      if (bad) { bad.focus(); toast('기관·회사명, 담당자 이름, 연락처를 적어 주세요', 'info'); return null; }
      const subject = `[${f.type.value}] ${f.org.value.trim()} — ${f.show.value}`;
      const body = [`문의 유형: ${f.type.value}`, `희망 공연: ${f.show.value}`, `희망 날짜: ${f.date.value || '미정'}`, `예상 인원: ${f.people.value ? f.people.value + '명' : '미정'}`, `기관·회사명: ${f.org.value.trim()}`, `담당자: ${f.name.value.trim()}`, `연락처: ${f.tel.value.trim()}`, '', f.msg.value.trim() || '(추가 내용 없음)'].join('\n');
      const out = $('#composeOut'); out.hidden = false; out.textContent = `받는 사람: contact@paroot.kr\n제목: ${subject}\n\n${body}`;
      return { subject, body };
    };
    cf.addEventListener('submit', e => {
      e.preventDefault();
      const m = build(); if (!m) return;
      location.href = `mailto:contact@paroot.kr?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`;
      toast('메일 앱을 엽니다. 열리지 않으면 「내용 복사」를 눌러 주세요', 'info', 3600);
    });
    $('[data-compose-copy]', cf).addEventListener('click', async () => {
      const m = build(); if (!m) return;
      toast((await copy(`받는 사람: contact@paroot.kr\n제목: ${m.subject}\n\n${m.body}`)) ? '문의 내용을 복사했습니다. 메일에 붙여 넣어 보내 주세요' : '복사하지 못했습니다', 'ok', 3200);
    });
  }

  runScroll();
})();

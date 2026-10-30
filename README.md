# 파릇(PAROOT) 공식 홈페이지 — 대학로 연극·혜화 연극 (정적 사이트 + 대학로 연극 가이드 AI 자동 발행)

## 바로 보기
- `preview.bat` 더블클릭 → 썸네일·빌드 후 http://localhost:5530 이 열립니다.
- 직접: `node build.mjs` → `python -m http.server 5530 --directory dist`

## 폴더 구조
| 경로 | 내용 |
|---|---|
| `src/data.mjs` | **공연·가격·회차·공연장·관람 규정·연혁·수상·보도·FAQ — 사실 정보는 여기 한 곳만 고칩니다** (네이버 예약 2026-10-23 기준) |
| `src/home.mjs` | 홈: 히어로 필름 → 스크롤하면 카드로 줄며 기존 배너 문구·공연 썸네일 → 공연 라인업(세로 스크롤 → 가로 이동) → 관람평(공연별 썸네일·평점) → 한뼘사이 스포트라이트(벤토 그리드) → 관람 도우미 → 공지사항 & 이벤트 → 연혁(진행 선) → 수상·보도(기사 썸네일) → 오시는 길 → FAQ → 가이드 → 공연사진(펼쳐지는 사진 줄) → 문의 |
| `src/pages.mjs` | 공연 목록·공연 상세 7개·파릇 소개·오시는 길·공지사항·이벤트·언론 보도·문의·FAQ·블로그·개인정보 |
| `src/layout.mjs` · `src/parts.mjs` | `<head>`(메타·OG·JSON-LD), 헤더, 메뉴 드로어, 예매 드로어, 빠른 보기·후기 모달, 푸터 / 공용 카드·평점 막대·아코디언 |
| `src/schema.mjs` | 구조화 데이터(Organization+PerformingGroup, TheaterEvent·Event+Schedule+AggregateOffer, FAQPage, BreadcrumbList, BlogPosting) |
| `assets/css/style.css` · `assets/js/app.js` | 디자인(Noto Sans KR) / 인터랙션: 모달·드로어·바텀시트·토스트·아코디언·탭·스켈레톤·스크롤 시퀀스 5종·라이트박스·문의 메일 정리 |
| `assets/video/` | 히어로 필름(4K `hero-2160.mp4` 15MB · 1080p `hero-1080.mp4` 5MB · 모바일 세로 `hero-m.mp4` 3.4MB · 3G용 `hero-m-lite.mp4` 2MB, 소리 포함). 휴대폰은 페이지 로드가 끝난 뒤 받기 시작 — 만드는 법은 `../motion/` |
| `assets/img/shows/<slug>/` | 포스터·키비주얼·네이버 예약 상세 이미지·무대 사진(WebP, 무대 사진은 휴대폰용 560px 사본 `-sm.webp` 함께) — `python -I tools/prepare_images.py` 로 다시 만듦. `img()`에 `sizes`를 주면 `-sm` 사본이 있을 때 srcset 자동 |
| `assets/img/notice/` | 공지사항·이벤트 이미지(이벤트 안내·오디션 공고 원본 + 목록 썸네일) — `python -I tools/prepare_notices.py` |
| `assets/img/press/` | 보도 썸네일(640×400) — 기존 paroot.kr 뉴스 게시판에 올린 기사 이미지로 `python -I tools/prepare_press.py` 가 만듦 |
| `content/blog/*.md` | 블로그 원고. `_topics.json` = AI가 쓸 주제 대기열(대표 키워드 중복 없음) |
| `content/drafts/` | 검증에 떨어진 AI 초안(발행 안 됨). 고쳐서 `content/blog/`로 옮기면 발행 |
| `tools/blog-ai/generate.mjs` | AI 글 작성·검증기 |
| `tools/thumbs/build_thumbs.py` | 블로그 썸네일(1200×630) |
| `.github/workflows/site.yml` | 푸시·하루 3회 예약 → (AI 글 1편 + 썸네일) → 빌드 → GitHub Pages |

## 수정 → 반영
1. 가격·회차·문구는 `src/data.mjs`, 화면은 `src/*.mjs`, 디자인은 `assets/css/style.css`
2. `build.bat` (또는 `node build.mjs`) — 모든 페이지·JSON-LD·sitemap·robots·llms.txt·RSS가 같이 갱신되고 깨진 링크·JSON-LD 오류를 검사합니다
3. `publish.bat` 또는 상위 폴더의 `../deploy.bat` — 썸네일·빌드·글 검증 → 커밋 → AI가 올린 글 받기 → 푸시. 푸시하면 GitHub Pages와 Railway가 각각 2~3분 뒤 반영합니다. 바뀐 게 없으면 아무것도 하지 않습니다.
   - Claude Code가 `6. 파릇` 폴더에서 작업을 마칠 때마다 `deploy.bat --hook`이 자동으로 돕니다(`../.claude/settings.json`의 Stop 훅). 기록은 `../deploy.log`. 빌드·검증에 실패하면 커밋·푸시하지 않고 Claude에게 원인을 돌려줘 고치게 합니다.

**공연 순서**는 `src/data.mjs`의 `SHOWS` 배열 순서가 곧 사이트 전체(메뉴·라인업·목록·푸터·비교표) 순서입니다. 히어로 필름 속 포스터 순서는 `../motion/video/comp.js`의 `SHOWS`를 같이 바꾸고 `../motion/render_all.sh`(또는 `render.bat`)로 다시 렌더합니다.

**공지사항·이벤트**는 `src/data.mjs`의 `NOTICES`에 한 건씩 추가합니다(cat: event/notice/audition, 이벤트는 start·end 날짜). 진행 중·시작 예정·상시·종료 표시는 빌드하는 날 기준으로 자동으로 바뀌고, 예약 빌드가 하루 3번 돌아 날짜가 지나면 저절로 "종료"가 됩니다. 이미지는 `tools/prepare_notices.py`의 `SRC`에 원본을 적고 실행합니다.

**가격·회차는 네이버 예약이 바뀌면 `src/data.mjs`도 같이 바꿔야 합니다.** 사이트 문구, JSON-LD, llms.txt, AI 글의 사실 목록이 모두 이 값을 씁니다.

## 블로그(대학로 연극 가이드) 하루 3편 자동 발행

**예약 글 60편(2026-10-28 ~ 11-16, 매일 09:00·13:00·18:00)** 이 `content/blog/`에 미리 들어 있습니다. 글마다 `date`·`time`이 있고, 하루 3번 예약 빌드(09:05·13:05·18:05 KST)가 그 시각이 지난 글을 차례로 공개합니다(그 전에는 목록·sitemap·RSS에 안 나옴). 대표 키워드는 60편이 모두 다르며 `_topics.json`에 `status: "scheduled"`로 묶여 있습니다. 글마다 주 공연(`show`)이 있고, 본문에 링크된 파릇 공연은 글 아래 「이 글에 나온 공연 예매」 카드(포스터·가격·네이버 예약 버튼)로 자동 연결됩니다.
- 예약 글이 남아 있는 동안 AI 글 작성은 쉽니다(하루 3편 유지). 예약 글이 다 공개된 다음 날부터 `ANTHROPIC_API_KEY`가 있으면 AI가 이어서 씁니다. 강제로 쓰려면 `--force`.
- 공개 시각을 바꾸려면 글 머리말의 `date`·`time`만 고치면 됩니다.
GitHub Actions가 **매일 09:05 · 13:05 · 18:05(KST)** 에 `_topics.json`의 다음 `todo` 주제로 글 1편씩 쓰고, 검증을 통과하면 썸네일을 만들어 `content/blog/`에 커밋한 뒤 바로 배포합니다.
- 모델 `claude-opus-5-5`(effort high), 서버 측 폴백 `fallbacks: "default"`(베타 `server-side-fallback-2026-07-01`). 근거는 `src/data.mjs`에서 만든 사실 목록뿐입니다(`node tools/blog-ai/generate.mjs --facts` 로 확인).
- 검증: 머리말·대표 키워드(제목·첫 문단), 본문 900~4,500자, 소제목 4개 이상, FAQ 2개 이상, 과장·보장·상투 표현 금지, 다른 제작사 공연명·커뮤니티명 금지, 외부 링크 금지, 허용된 내부 링크만, **사실 목록에 없는 숫자+단위 금지**, 기존 글과 대표 키워드·제목 겹침 금지.
- 한 번 고쳐 쓰게 하고도 떨어지면 `content/drafts/`에 두고 다음 주제로 넘어갑니다(회차당 최대 3개 주제 시도).
- 남은 주제가 6개 미만이면 기존 글과 겹치지 않는 새 주제 12개를 AI에게 받아 자동 보충합니다. 지금 대기열 54개 ≈ 18일분.
- 비용 감(참고): 사실 목록이 약 4만 자라 입력이 큰 편이지만 프롬프트 캐시로 2회째부터 대부분 캐시 읽기입니다. 실제 청구는 Anthropic 콘솔에서 확인하세요.

처음 한 번 설정
1. GitHub 저장소 → Settings → Pages → Source: **GitHub Actions**
2. Settings → Secrets and variables → Actions → New repository secret → `ANTHROPIC_API_KEY`
3. 지금 1편 써 보기: Actions 탭 → site → Run workflow (편수 1~5)

로컬에서 쓰기/검사
- `set ANTHROPIC_API_KEY=...` 후 `npm ci` → `node tools/blog-ai/generate.mjs` (특정 주제 `--topic <id>`, 여러 편 `--count 3`)
- 검사만: `node tools/blog-ai/generate.mjs --check`
- 사람이 쓴 글: `content/blog/<slug>.md` (머리말 `title` `description` `slug` `date` `category` `tags` `keyword`, 선택 `time` `show`) → `build.bat`. 미래 날짜는 그날 빌드부터 보입니다(예약 발행).

## 배포 (GitHub Pages 미리보기)
- 저장소: https://github.com/zzangusz-art/paroot-preview (공개 — 무료 계정 Pages는 공개 저장소만 가능하므로 프롬프트·검증 규칙도 공개됩니다)
- 미리보기 주소: https://zzangusz-art.github.io/paroot-preview/ — 모든 페이지 noindex, robots.txt `Disallow: /` (검색 노출 안 됨)
- 이 폴더가 곧 git 저장소입니다(소스만 올리고 `dist/`·`node_modules/`는 제외). AI가 GitHub에서 글을 커밋하므로 로컬에서 고치기 전에 `git pull`로 받아 두면 충돌이 없습니다. 올릴 때는 `publish.bat`(또는 `../deploy.bat`).

## 배포 (Railway)
- Railway 프로젝트 `beneficial-adventure` → 서비스 `paroot-preview`가 이 저장소 `main`에 연결돼 있어 푸시마다 자동 배포됩니다.
- 설정은 `railway.json`: 빌드 단계에서 `node build.mjs`·글 검증을 돌려 실패하면 배포하지 않고(이전 판 유지), 실행은 `npm start` = `node tools/serve.mjs`.
- `tools/serve.mjs`는 외부 패키지 없는 정적 서버입니다. 시작할 때와 **매시 정각**에 다시 빌드해 예약 글을 제시간(09:00·13:00·18:00)에 공개합니다(GitHub Pages는 예약 실행이 최대 1시간쯤 늦을 수 있음). brotli/gzip 압축, 영상 Range 요청, 301(끝 `/`), 404 페이지를 처리합니다.
- 기본은 미리보기(모든 페이지 noindex, 주소는 Railway 공개 도메인). 운영으로 쓰려면 Railway 서비스 Variables에 `SITE_MODE=production`, `SITE_URL=https://www.paroot.kr/`.
- Railway 화면 Settings → Networking에서 **Generate Domain**을 눌러야 공개 주소가 생깁니다.
- 로컬에서 같은 서버로 보기: `npm start` → http://localhost:5530

## 운영 주소·검색 색인·방문 분석 (parootent.kr)
- **대표 주소: https://parootent.kr/** (Cloudflare DNS → Railway). Railway는 `railway.json`의 `node tools/serve.mjs --production --url https://parootent.kr/`로 운영 모드(검색 노출 허용)로 돈다. www.parootent.kr·*.up.railway.app 요청은 대표 주소로 301. GitHub Pages 미리보기는 계속 noindex.
- **색인**
  - 구글: Search Console에 `https://parootent.kr/` 속성(HTML 태그 확인) → sitemap `sitemap.xml`·`blog/feed.xml` 제출. 구글은 IndexNow를 쓰지 않아 sitemap·내부 링크로 수집한다.
  - 네이버: 서치어드바이저에 사이트 등록(HTML 태그 확인) → 요청 → 사이트맵 제출(`sitemap.xml`), RSS 제출(`blog/feed.xml`), 주요 페이지 「웹 페이지 수집」 요청.
  - IndexNow(네이버·빙 등): 서버가 빌드할 때마다(시작 때·매시 정각) 새로 공개됐거나 lastmod가 바뀐 주소를 자동으로 알린다. 수동: `node tools/indexnow.mjs --all https://parootent.kr/sitemap.xml`(`--dry`는 목록만). 키: `SITE.indexNowKey`, 키 파일은 사이트 루트 `<키>.txt`.
  - 소유 확인 메타: `src/data.mjs`의 `naverVerification`·`googleVerification` 배열에 값을 추가한다(기존 paroot.kr 값과 함께 둬도 됨).
- **방문 분석**: `src/data.mjs` `SITE.analytics`에 ID를 넣거나 Railway Variables로 `GA4_ID`·`GTM_ID`·`NAVER_WA`·`CLARITY_ID`. 운영 빌드에서만 켜지고(미리보기 데이터 섞임 방지), 켜면 개인정보 처리 안내에 「방문 분석 도구와 쿠키」가 자동으로 붙는다.
  - GA4는 사이트에 직접(gtag) 설치되어 있으므로 **GTM 안에 GA4 구성 태그를 또 만들지 않는다**(중복 집계). GTM은 광고 픽셀(메타·카카오·구글 애즈 등) 추가용.
  - 이벤트(GA4 이벤트 + GTM dataLayer 같은 이름): `book_click`(show·placement·link_url) — GA4 「주요 이벤트」로 표시, `book_drawer_open`, `show_quick_view`(show), `contact_call`, `contact_email`, `share`, `copy_info`, `photo_view`, `finder_select`(audience), `list_filter`(list·category), `video_sound`, `video_replay`, `blog_more`, `read_progress`(percent·post).
  - GA4 맞춤 측정기준(이벤트 범위)으로 `show`, `placement`, `percent`, `post`, `audience`, `category`, `list`를 등록해 두었다(공연별·위치별 보고서).
- **연결된 계정(2026-10-27 설정)**: 구글 계정 하나에 모두 있음
  - Search Console: URL 접두어 속성 `https://parootent.kr/`(HTML 태그 인증), sitemap·RSS 제출 완료.
  - GA4: 계정 「파릇」 → 속성 「파릇 홈페이지 (parootent.kr)」(p560887563) → 웹 스트림 측정 ID `G-K978Y2GH8Q`.
  - GTM: 계정 「파릇」 → 컨테이너 `parootent.kr` `GTM-PSL5DD88`(빈 초기 버전 게시됨, 태그 없음).
  - 환경 변수(`GA4_ID` 등)는 형식이 맞을 때만 코드 기본값을 덮어쓴다(빈 값·오타면 기본값 유지).
  - 네이버: 예매 클릭 때 전환(신청/예약, `wcs.cnv("4")`)도 보낸다 — 네이버 검색광고 프리미엄 로그분석을 연결하면 광고 전환으로 잡힌다.

## 어드민 (https://parootent.kr/admin/)
유입·트래픽 / 블로그 / 공지·이벤트 세 가지만 다루는 관리 화면. 코드 `tools/admin/`(`server.mjs` 라우팅·저장, `stats.mjs` 방문 통계, `github.mjs` 커밋, `ui/` 화면), `tools/serve.mjs`가 불러 쓴다. 검색엔진에는 `noindex` + robots `Disallow: /admin/`.
- **Railway Variables(서비스 paroot-preview)**
  - `ADMIN_PASSWORD`: 어드민 비밀번호. 없으면 `/admin/`은 설정 안내만 보인다. 바꾸면 기존 로그인은 모두 풀린다. 로그인 12시간 유지, 15분에 8번 틀리면 잠시 막힘.
  - `GITHUB_TOKEN`: GitHub fine-grained 토큰(저장소 `zzangusz-art/paroot-preview`만, 권한 Contents: Read and write). 있으면 저장 = 저장소에 커밋 → Railway·GitHub Pages 자동 재배포. 없으면 어드민은 보기 전용.
  - `DATA_DIR`: 방문 통계 저장 경로. Railway에서 볼륨(Volume)을 서비스에 붙이고 마운트 경로(예: `/data`)를 넣는다. 없으면 배포할 때마다 통계가 처음부터 다시 쌓인다.
- **유입·트래픽**: 브라우저가 `/api/hit`로 보내는 비컨(운영 빌드의 `PAROOT_STATS`)을 날짜별 합계로만 저장(쿠키 없음, IP·브라우저 정보는 그날 방문자 수 세는 해시로만 쓰고 원문 저장 안 함 — 개인정보 처리 안내 5항에 적음). 유입 경로(네이버·구글·AI 답변·SNS·직접 등), 들어온 사이트, 많이 본·처음 들어온 페이지, 기기, 예매·전화·메일 클릭, 검색엔진·AI 크롤러 방문(서버가 User-Agent로 직접 기록), IndexNow 전송 기록. 400일 보관.
- **블로그**: 공개·예약 글 목록(30일 조회 수 포함), 새 글·수정·삭제. 공개 일시가 미래면 예약 글. 어드민에서 저장한 글은 머리말 `editor: admin`이 붙고 사람용 검사(형식·길이·링크)만 한다(AI 글용 사실·문체 검사는 건너뜀, `tools/blog-ai/generate.mjs` `validateHuman`). 이미 공개된 글을 고치면 `updated`가 오늘로 바뀌어 사이트맵 lastmod·IndexNow로 알려진다. 주소(slug)는 처음 저장 뒤 바꾸지 않는다. 새 글 썸네일은 다음 로컬 배포(`deploy.bat`) 때 만들어지고, 그전엔 공연 커버를 쓴다.
- **공지·이벤트**: 데이터는 `content/notices.json`(전에는 `src/data.mjs` 안), 이미지는 `assets/img/notice/<id>.webp`(폭 900)·`-2.webp`…·`<id>-t.webp`(480×360 썸네일). 이미지는 브라우저에서 WEBP로 바꿔 올린다(크롬·엣지). 이미지를 바꾸면 `v` 값이 바뀌어 주소 뒤 `?v=`로 캐시를 비켜 간다. 상태(진행 중·예정·상시·종료)는 날짜로 자동.
- 저장하면 서버 파일도 바로 고치고 다시 빌드해 몇 초 안에 사이트에 보이고, 커밋 배포가 1~2분 뒤 같은 내용으로 덮는다. 로컬 PC에서는 다음 `deploy.bat` 때 `git pull --rebase`로 어드민 커밋을 받아 온다.
- 로컬에서 어드민 써 보기: `ADMIN_PASSWORD=… ADMIN_LOCAL_WRITE=1 node tools/serve.mjs --production --url http://localhost:5530/`(파일만 고침, 커밋은 deploy.bat).

## (참고) 기존 도메인 www.paroot.kr 전환 시
- 기본 주소는 `src/data.mjs`의 `SITE.url`(`https://www.paroot.kr/`). 미리보기는 `node build.mjs --preview <주소>` 로 모든 페이지 noindex·robots `Disallow: /`.
- 운영 빌드: 저장소 Variables에 `SITE_MODE=production`(+필요하면 `SITE_URL`). GitHub Pages Custom domain 에 `www.paroot.kr`, DNS(현재 imweb)를 GitHub Pages로 연결.
- 기존 imweb 주소(`/play1`~`/play5`, `/paroot`, `/news`, `/notice`, `/contact`)는 새 주소로 301 리다이렉트가 필요합니다: play1→shows/hanbbeumsai/, play2→shows/suspicious-roommate/, play3→shows/wolf-forest-piglets/, play4→shows/office-romance-report/, play5→shows/pinocchio/, paroot→about/, news→news/, notice→notice/, contact·contact0→contact/, casting→about/.
- 네이버 서치어드바이저·구글 서치 콘솔 인증값(`SITE.naverVerification`, `googleVerification`)은 기존 사이트 값을 그대로 넣어 두었습니다. 도메인 이전 후 sitemap.xml 제출.

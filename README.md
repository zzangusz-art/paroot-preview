# 파릇(PAROOT) 공식 홈페이지 — 대학로 연극·혜화 연극 (정적 사이트 + 대학로 연극 가이드 AI 자동 발행)

## 바로 보기
- `preview.bat` 더블클릭 → 썸네일·빌드 후 http://localhost:5530 이 열립니다.
- 직접: `node build.mjs` → `python -m http.server 5530 --directory dist`

## 폴더 구조
| 경로 | 내용 |
|---|---|
| `src/data.mjs` | **공연·가격·회차·공연장·관람 규정·연혁·수상·보도·FAQ — 사실 정보는 여기 한 곳만 고칩니다** (네이버 예약 2026-10-23 기준) |
| `src/home.mjs` | 홈: 히어로 필름 → 스크롤하면 카드로 줄며 기존 배너 문구 → 소개(단어 밝힘) → 공연 라인업(세로 스크롤 → 가로 이동) → 한뼘사이 스포트라이트(고정 사진 + 6단계) → 관람평 → 관람 도우미 → 연혁(진행 선) → 수상·보도 → 오시는 길 → FAQ → 가이드 → 문의 |
| `src/pages.mjs` | 공연 목록·공연 상세 6개·파릇 소개·오시는 길·소식·문의·FAQ·블로그·개인정보 |
| `src/layout.mjs` · `src/parts.mjs` | `<head>`(메타·OG·JSON-LD), 헤더, 메뉴 드로어, 예매 드로어, 빠른 보기·후기 모달, 푸터 / 공용 카드·평점 막대·아코디언 |
| `src/schema.mjs` | 구조화 데이터(Organization+PerformingGroup, TheaterEvent·Event+Schedule+AggregateOffer, FAQPage, BreadcrumbList, BlogPosting) |
| `assets/css/style.css` · `assets/js/app.js` | 디자인(Noto Sans KR) / 인터랙션: 모달·드로어·바텀시트·토스트·아코디언·탭·스켈레톤·스크롤 시퀀스 5종·라이트박스·문의 메일 정리 |
| `assets/video/` | 히어로 필름(4K `hero-2160.mp4` 15MB · 1080p `hero-1080.mp4` 5MB · 모바일 세로 `hero-m.mp4` 4.5MB, 소리 포함) — 만드는 법은 `../motion/` |
| `assets/img/shows/<slug>/` | 포스터·키비주얼·네이버 예약 상세 이미지·무대 사진(WebP) — `python -I tools/prepare_images.py` 로 다시 만듦 |
| `content/blog/*.md` | 블로그 원고. `_topics.json` = AI가 쓸 주제 대기열(대표 키워드 중복 없음) |
| `content/drafts/` | 검증에 떨어진 AI 초안(발행 안 됨). 고쳐서 `content/blog/`로 옮기면 발행 |
| `tools/blog-ai/generate.mjs` | AI 글 작성·검증기 |
| `tools/thumbs/build_thumbs.py` | 블로그 썸네일(1200×630) |
| `.github/workflows/site.yml` | 푸시·하루 3회 예약 → (AI 글 1편 + 썸네일) → 빌드 → GitHub Pages |

## 수정 → 반영
1. 가격·회차·문구는 `src/data.mjs`, 화면은 `src/*.mjs`, 디자인은 `assets/css/style.css`
2. `build.bat` (또는 `node build.mjs`) — 모든 페이지·JSON-LD·sitemap·robots·llms.txt·RSS가 같이 갱신되고 깨진 링크·JSON-LD 오류를 검사합니다
3. `publish.bat` — 썸네일·빌드·글 검증 → 커밋 → AI가 올린 글 받기 → 푸시 (저장소 연결 후)

**가격·회차는 네이버 예약이 바뀌면 `src/data.mjs`도 같이 바꿔야 합니다.** 사이트 문구, JSON-LD, llms.txt, AI 글의 사실 목록이 모두 이 값을 씁니다.

## 블로그(대학로 연극 가이드) 하루 3편 자동 발행
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
- 이 폴더가 곧 git 저장소입니다(소스만 올리고 `dist/`·`node_modules/`는 제외). AI가 GitHub에서 글을 커밋하므로 로컬에서 고치기 전에 `git pull`로 받아 두면 충돌이 없습니다. 올릴 때는 `publish.bat`.

## 운영 도메인 전환(www.paroot.kr)
- 기본 주소는 `src/data.mjs`의 `SITE.url`(`https://www.paroot.kr/`). 미리보기는 `node build.mjs --preview <주소>` 로 모든 페이지 noindex·robots `Disallow: /`.
- 운영 빌드: 저장소 Variables에 `SITE_MODE=production`(+필요하면 `SITE_URL`). GitHub Pages Custom domain 에 `www.paroot.kr`, DNS(현재 imweb)를 GitHub Pages로 연결.
- 기존 imweb 주소(`/play1`~`/play5`, `/paroot`, `/news`, `/notice`, `/contact`)는 새 주소로 301 리다이렉트가 필요합니다: play1→shows/hanbbeumsai/, play2→shows/suspicious-roommate/, play3→shows/wolf-forest-piglets/, play4→shows/office-romance-report/, play5→shows/pinocchio/, paroot→about/, news·notice→news/, contact·contact0→contact/, casting→about/.
- 네이버 서치어드바이저·구글 서치 콘솔 인증값(`SITE.naverVerification`, `googleVerification`)은 기존 사이트 값을 그대로 넣어 두었습니다. 도메인 이전 후 sitemap.xml 제출.

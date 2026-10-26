"""사이트 이미지 만들기(한 번 실행, 원본이 바뀌면 다시 실행).
원본: ../research/images/<공연>/ (네이버 예약 대표·상세 이미지, 2026-10-23 수집)
      ../research/images/legacy/ (기존 paroot.kr 무대 사진·포스터)
      ../motion/cache/clips/ (홍보 영상에서 뽑은 4K 프레임)
출력: assets/img/shows/<slug>/poster.webp(4:5) · thumb.webp(320×400) · cover.webp(가로) · detail/NN.webp · gallery/NN.webp
      assets/img/stage/*.webp(영상 스틸) · assets/img/brand/(로고 축소본·아이콘)
사용: python -I tools/prepare_images.py   (paroot-site 폴더에서, 공연 일부만: ... prepare_images.py flirting)
"""
import json
import shutil
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT.parent / 'research' / 'images'
CLIPS = ROOT.parent / 'motion' / 'cache' / 'clips'
OUT = ROOT / 'assets' / 'img'

# 공연별 원본 배정. detail 은 네이버 예약 상세 순서 그대로, 기간 한정 이벤트(수험생 할인·9월 리뷰 당첨 발표·군인 할인 11/30까지)는 제외
SHOWS = {
    'hanbbeumsai': {'dir': 'hanbbyumsai', 'poster': ('legacy/082.jpg', .42), 'cover': 'hanbbyumsai/02.jpg',
                    'detail': ['04', '05', '06', '07', '09', '10', '12', '13', '14', '15', '16', '17', '18'],
                    'gallery': ['legacy/013.jpg', 'legacy/015.jpg', 'legacy/014.jpg', 'legacy/016.jpg']},
    'suspicious-roommate': {'dir': 'suspicious-roommate', 'poster': ('suspicious-roommate/01.jpg', .3), 'cover': 'suspicious-roommate/02.jpg',
                            'detail': ['04', '05', '06', '07', '10', '11', '12', '13', '14', '15', '16', '17'],
                            'gallery': ['legacy/026.jpg', 'legacy/024.jpg', 'legacy/025.jpg', 'legacy/023.jpg']},
    'office-romance-report': {'dir': 'office-romance-report', 'poster': ('office-romance-report/01.jpg', .5), 'cover': 'office-romance-report/01.jpg',
                              'detail': ['04', '05', '06', '07', '11', '12', '13', '14', '15', '16', '17', '18'],
                              'gallery': ['legacy/055.png', 'legacy/056.png', 'legacy/057.png', 'legacy/058.png', 'legacy/059.png']},
    'drag-in-hyehwa': {'dir': 'drag-in-hyehwa', 'poster': ('drag-in-hyehwa/01.jpg', .45), 'cover': 'drag-in-hyehwa/02.jpg',
                       'detail': ['03', '04', '05'], 'gallery': []},
    'wolf-forest-piglets': {'dir': 'wolf-forest-pigs', 'poster': ('legacy/085.jpg', .45), 'cover': 'wolf-forest-pigs/02.jpg',
                            'detail': ['04', '05', '06', '07', '08'],
                            'gallery': ['legacy/027.jpg', 'legacy/029.jpg', 'legacy/043.jpg', 'legacy/038.jpg', 'legacy/044.jpg', 'legacy/031.jpg', 'legacy/046.jpg', 'legacy/040.jpg']},
    # 플러팅: 네이버 예약 1550184(2026-10-26 수집). 포스터는 상세 09, 가로 키비주얼이 없어 상세 이미지 속 무대 사진을 잘라 커버·무대 사진으로 쓴다
    # (상자 = 원본에서 자를 영역 x0,y0,x1,y1). 상세에서 03 리뷰 치킨 이벤트·04 9월 리뷰 당첨·05 재관람 카드·06 군인 할인(11/30까지)·07 수험생 할인(11/20~30) 제외
    'flirting': {'dir': 'flirting', 'poster': ('flirting/09.jpg', 1), 'cover': ('flirting/10.jpg', (0, 2700, 860, 3300)),
                 'detail': ['08', '10', '11', '12', '13', '14'],
                 'gallery': [('flirting/10.jpg', (0, 2720, 860, 3300)), ('flirting/10.jpg', (0, 5100, 860, 5680)), ('flirting/14.jpg', (0, 3290, 860, 3881)),
                             ('flirting/11.jpg', (0, 4260, 860, 4860)), ('flirting/10.jpg', (0, 1560, 860, 2180)), ('flirting/10.jpg', (0, 3860, 860, 4440))]},
    'pinocchio': {'dir': 'pinocchio', 'poster': ('legacy/086.jpg', .4), 'cover': 'pinocchio/02.jpg',
                  'detail': ['04', '05', '06', '07', '08'],
                  'gallery': ['legacy/076.png', 'legacy/060.png', 'legacy/079.png', 'legacy/062.png', 'legacy/080.png', 'legacy/073.png', 'legacy/081.png', 'legacy/078.jpg']},
}
# 영상 스틸(홍보 영상 원본 프레임) — [이름, 클립, 프레임]
STILLS = [('exterior', 'exterior', 3), ('crowd-a', 'crowdA', 12), ('crowd-b', 'crowdB', 20), ('laugh', 'laugh', 10),
          ('hat', 'hat', 14), ('dress', 'dress', 30), ('couple', 'couple', 24), ('couple-2', 'couple', 6), ('spot', 'spot', 10), ('cap', 'cap', 6)]
# 기존 사이트 홈 하단 「공연사진」 갤러리 9장(01~06 작품명 미표기) → 회사 소개 무대 기록·홈 공연사진 줄
# 07~09 는 같은 갤러리의 늑대숲 또옹돼지 원정대 장면(홈 하단 공연사진 줄에서 9장 모두 사용)
ARCHIVE = ['legacy/090.jpg', 'legacy/091.jpg', 'legacy/092.jpg', 'legacy/093.jpg', 'legacy/094.jpg', 'legacy/095.jpg', 'legacy/030.jpg', 'legacy/029.jpg', 'legacy/028.jpg']


SM_W = 560  # 작은 사본 너비: 모바일 2열 칸(약 175px) × 화면 배율 3


def load(rel):
    """rel 이 (파일, (x0, y0, x1, y1)) 이면 그 영역만 잘라 쓴다."""
    box = None
    if isinstance(rel, tuple):
        rel, box = rel
    im = Image.open(SRC / rel)
    im = ImageOps.exif_transpose(im).convert('RGB')
    return im.crop(box) if box else im


def save(im, path, q=80, maxw=None):
    if maxw and im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'WEBP', quality=q, method=6)
    return im.size


def crop_ratio(im, r, fy=.5):
    """가로:세로 = r 로 자른다. fy: 세로 자를 때 위쪽 기준 위치(0 위, 1 아래)."""
    w, h = im.size
    if w / h > r:
        nw = round(h * r); x = (w - nw) // 2
        return im.crop((x, 0, x + nw, h))
    nh = round(w / r); y = round((h - nh) * fy)
    return im.crop((0, y, w, y + nh))


def main(only=None):
    report = json.loads((ROOT / 'src' / 'images.json').read_text(encoding='utf-8')) if only else {}
    for slug, c in SHOWS.items():
        if only and slug not in only:
            continue
        d = OUT / 'shows' / slug
        if d.exists():
            shutil.rmtree(d)
        src, fy = c['poster']
        p = crop_ratio(load(src), 4 / 5, fy)
        save(p, d / 'poster.webp', 82, 1000)
        save(p.resize((320, 400), Image.LANCZOS), d / 'thumb.webp', 80)
        cv = load(c['cover'])
        save(cv, d / 'cover.webp', 80, 1600)
        # 공유 이미지(1200×630): 가로 키비주얼을 자른다
        og = crop_ratio(cv, 1200 / 630, .45).resize((1200, 630), Image.LANCZOS)
        og.save(d / 'og.jpg', 'JPEG', quality=86, optimize=True, progressive=True)
        det = []
        for n in c['detail']:
            f = next((x for x in (SRC / c['dir']).iterdir() if x.stem == n), None)
            if not f:
                raise SystemExit(f'{slug}: 상세 {n} 없음')
            im = load(f'{c["dir"]}/{f.name}')
            det.append(save(im, d / 'detail' / f'{n}.webp', 78, 1000))
        gal = []
        for i, g in enumerate(c['gallery'], 1):
            im = load(g)
            gal.append(save(im, d / 'gallery' / f'{i:02d}.webp', 80, 1400))
            save(im, d / 'gallery' / f'{i:02d}-sm.webp', 76, SM_W)  # 모바일 2열 격자용(srcset)
        report[slug] = {'detail': [[n, *s] for n, s in zip(c['detail'], det)], 'gallery': [list(s) for s in gal]}
        print(slug, 'detail', len(det), 'gallery', len(gal))
    if only:  # 공연 몇 개만: 스틸·로고는 건드리지 않고 목록만 갱신
        report = {k: report[k] for k in SHOWS if k in report}
        (ROOT / 'src' / 'images.json').write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
        print('ok (일부)')
        return
    # 영상 스틸
    st = OUT / 'stage'
    st.mkdir(parents=True, exist_ok=True)
    for name, clip, fr in STILLS:
        im = Image.open(CLIPS / clip / f'f{fr:04d}.jpg').convert('RGB')
        save(im, st / f'{name}.webp', 80, 1600)
    for i, a in enumerate(ARCHIVE, 1):
        save(load(a), st / f'archive-{i:02d}.webp', 80, 1200)
    # 로고 축소본
    b = OUT / 'brand'
    for name in ['logo', 'logo-white']:
        im = Image.open(b / f'{name}.png')
        w = 640; im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(b / f'{name.replace("logo", "logo-h")}.png', optimize=True)
    mark = Image.open(b / 'logo-mark.png')
    for size, name, pad, bg in [(512, 'logo-512.png', 60, (255, 255, 255, 255)), (180, 'apple-touch-icon.png', 22, (14, 13, 18, 255)), (192, 'icon-192.png', 24, (14, 13, 18, 255))]:
        cv = Image.new('RGBA', (size, size), bg)
        m = mark.copy(); m.thumbnail((size - pad * 2, size - pad * 2), Image.LANCZOS)
        cv.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2 + round(size * .03)))
        cv.convert('RGB' if bg[3] == 255 else 'RGBA').save(b / name, optimize=True)
    ico = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); m = mark.copy(); m.thumbnail((60, 60), Image.LANCZOS)
    ico.alpha_composite(m, ((64 - m.width) // 2, (64 - m.height) // 2))
    ico.save(ROOT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    m = mark.copy(); m.thumbnail((96, 96), Image.LANCZOS); fav = Image.new('RGBA', (96, 96), (0, 0, 0, 0)); fav.alpha_composite(m, ((96 - m.width) // 2, (96 - m.height) // 2)); fav.save(b / 'favicon-96.png', optimize=True)
    (ROOT / 'src' / 'images.json').write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
    print('ok')


if __name__ == '__main__':
    import sys
    main(sys.argv[1:] or None)

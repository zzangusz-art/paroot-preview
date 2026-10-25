"""보도 썸네일 만들기 — 기존 paroot.kr 뉴스 게시판에 고객사가 올린 기사 이미지(첫 번째 본문 이미지)를 640×400 WebP로.
원본: ../research/images/press/<게시글 idx>_<n>.<ext> (2026-10-23 수집, 목록 press-images.json)
출력: assets/img/press/<idx>.webp (+ 360×225 작은 사본 <idx>-sm.webp)
사용: python -I tools/prepare_press.py
"""
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT.parent / 'research' / 'images' / 'press'
OUT = ROOT / 'assets' / 'img' / 'press'

# 게시글 idx → (원본 파일, 세로 자르기 기준 0=위·1=아래). 사이트 로고만 있는 _1 이미지는 쓰지 않는다
PICK = {
    '168756716': ('168756716_0', .3),   # 한국경제TV 19차 캐스팅 — 한뼘사이·중국판 포스터
    '168806113': ('168806113_0', .4),   # ABC뉴스 크리스마스 추천 3선 — 포스터 3종
    '168408122': ('168408122_0', .4),   # 잡포스트 비누향기 7차 — 포스터
    '168408179': ('168408179_1', .25),  # 뉴스티앤티 사내연애 4차 — 캐스팅 사진
    '167909512': ('167909512_0', .4),   # 한국경제TV 한가위 할인 — 작품 이미지 모음
    '166718283': ('166718283_0', .45),  # 이데일리 한뼘사이 저력 — 무대 사진
    '166718106': ('166718106_0', .5),   # 한국일보 대학로 — 무대 조명 사진
    '167028083': ('167028083_0', .4),   # 뉴스프리즌 스윙스 출연 — 대배우스윙스 배너
    '148184104': ('148184104_0', .45),  # 한국정경신문 광양제철소 — 무대 사진
    '128992849': ('128992849_0', .4),   # 중앙일보 우수브랜드 — 커튼콜 사진
    '128991451': ('128991451_0', .45),  # 시선뉴스 사내연애 예매순위 — 무대 사진
    '27566460': ('27566460_0', .4),     # 경인매일 중국 진출 — 중국판 포스터·무대
    '22022699': ('22022699_0', .45),    # K스피릿 아기돼지삼형제 — 무대 사진
}


def cover(im, w, h, fy):
    r = w / h
    if im.width / im.height > r:
        nw = round(im.height * r); x = (im.width - nw) // 2
        im = im.crop((x, 0, x + nw, im.height))
    else:
        nh = round(im.width / r); y = round((im.height - nh) * fy)
        im = im.crop((0, y, im.width, y + nh))
    return im.resize((w, h), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for idx, (stem, fy) in PICK.items():
        f = next(p for p in SRC.iterdir() if p.stem == stem)
        im = ImageOps.exif_transpose(Image.open(f)).convert('RGB')
        c = cover(im, 640, 400, fy)
        c.save(OUT / f'{idx}.webp', 'WEBP', quality=80, method=6)
        c.resize((360, 225), Image.LANCZOS).save(OUT / f'{idx}-sm.webp', 'WEBP', quality=78, method=6)  # 모바일 목록용(srcset)
        print(idx, f.name, im.size)


if __name__ == '__main__':
    main()

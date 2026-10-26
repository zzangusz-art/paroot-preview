"""공지사항·이벤트 이미지 만들기.
원본: ../research/images/<공연>/NN.jpg (네이버 예약 상세의 기간 한정 이벤트 이미지 — 공연 상세에서는 빼고 여기로 옮김)
      ../research/notices/<게시글 idx>_<n>.jpg (기존 paroot.kr 공지사항 게시판, 2026-10-26 수집)
출력: assets/img/notice/<id>.webp(본문용, 최대 폭 900) · <id>-t.webp(목록 썸네일 480×360)
사용: python -I tools/prepare_notices.py
"""
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT.parent / 'research'
OUT = ROOT / 'assets' / 'img' / 'notice'

# id → [(원본, 썸네일 자를 영역 비율(x0,y0,x1,y1) 또는 None=가운데 4:3)]
SRC = {
    'ev-flirting-chicken': ['images/flirting/03.jpg'],
    'ev-flirting-revisit': ['images/flirting/05.jpg'],
    'ev-flirting-military': ['images/flirting/06.jpg'],
    'ev-flirting-exam': ['images/flirting/07.jpg'],
    'ev-office-military': ['images/office-romance-report/09.jpg'],
    'ev-office-exam': ['images/office-romance-report/10.jpg'],
    'ev-hanbbeum-exam': ['images/hanbbyumsai/08.jpg'],
    'ev-roommate-exam': ['images/suspicious-roommate/09.jpg'],
    'ev-review-sep': ['images/hanbbyumsai/11.jpg', 'images/suspicious-roommate/08.jpg', 'images/office-romance-report/08.jpg', 'images/flirting/04.jpg'],
    **{f'au-{i}': [f'notices/{i}_1.jpg'] for i in ['30482479', '78879621', '86959728', '144358491', '148182285', '153305574', '167140434', '167309987', '167909437']},
}
# 오디션 공고는 세로로 아주 긴 이미지 → 썸네일은 위쪽 포스터 부분(제목 포함)
TALL_THUMB = (0, .02, 1, .25)


def thumb(im, box=None):
    if box:
        w, h = im.size
        im = im.crop((round(box[0] * w), round(box[1] * h), round(box[2] * w), round(box[3] * h)))
    # 이벤트 이미지는 제목이 있는 위쪽, 오디션 포스터는 「N차팀 배우 오디션」 글자가 있는 아래쪽을 남긴다
    return ImageOps.fit(im, (480, 360), Image.LANCZOS, centering=(.5, .0 if not box else .9))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for nid, files in SRC.items():
        for k, f in enumerate(files):
            im = ImageOps.exif_transpose(Image.open(RES / f)).convert('RGB')
            name = nid if k == 0 else f'{nid}-{k + 1}'
            big = im if im.width <= 900 else im.resize((900, round(im.height * 900 / im.width)), Image.LANCZOS)
            big.save(OUT / f'{name}.webp', 'WEBP', quality=78, method=6)
            if k == 0:
                tall = im.height / im.width > 3
                thumb(im, TALL_THUMB if tall else None).save(OUT / f'{nid}-t.webp', 'WEBP', quality=80, method=6)
            print(name, big.size)


if __name__ == '__main__':
    main()

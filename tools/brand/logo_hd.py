"""기존 홈페이지 로고(636x162 PNG, imweb CDN 20240311/3b5c5d94c8a31.png)를 고해상도로 복원한다.
- 알파: 8배 lanczos 확대 → 가우시안 블러 → 0.5 기준 부드러운 임계값(가장자리를 다시 매끈하게)
- 색: 투명 픽셀까지 주변 색으로 번지게 채운 뒤 확대(가장자리 검은 테두리 방지)
출력: assets/img/brand/logo.png(가로형 전체), logo-mark.png(크라운), logo-word.png(글자), logo-white.png
사용: python -I tools/brand/logo_hd.py   (paroot-site 폴더에서)
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'tools/brand/logo-legacy-636.png'
OUT = ROOT / 'assets/img/brand'
K = 8

im = Image.open(SRC).convert('RGBA')
a = np.asarray(im).astype(np.float32) / 255
rgb, al = a[..., :3], a[..., 3]

# 색 번지기: 알파가 있는 픽셀 색을 주변 투명 영역으로 반복 확장
mask = al > 0.92  # 반투명 가장자리 색은 어둡게 섞여 있어 쓰지 않음
col = rgb.copy()
filled = mask.copy()
for _ in range(12):
    acc = np.zeros_like(col); cnt = np.zeros(al.shape, np.float32)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            sh = np.roll(np.roll(filled, dy, 0), dx, 1)
            acc += np.roll(np.roll(col * filled[..., None], dy, 0), dx, 1)
            cnt += sh
    new = (~filled) & (cnt > 0)
    col[new] = acc[new] / cnt[new][:, None]
    filled |= new

H, W = al.shape
big = (W * K, H * K)
col_img = Image.fromarray((np.clip(col, 0, 1) * 255).astype(np.uint8)).resize(big, Image.LANCZOS)
al_img = Image.fromarray((al * 255).astype(np.uint8)).resize(big, Image.LANCZOS).filter(ImageFilter.GaussianBlur(K * 0.55))
A = np.asarray(al_img).astype(np.float32) / 255
# 부드러운 임계값: 0.5 중심, 폭 ±0.08 (확대 후 1~2px 안티앨리어싱)
A = np.clip((A - 0.5) / 0.16 + 0.5, 0, 1)
A = A * A * (3 - 2 * A)
C = np.asarray(col_img).astype(np.float32) / 255
out = np.dstack([C, A])
full = Image.fromarray((out * 255).astype(np.uint8), 'RGBA')

def crop_alpha(img, pad):
    bb = img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    x0, y0, x1, y1 = bb
    return img.crop((max(0, x0 - pad), max(0, y0 - pad), x1 + pad, y1 + pad))

full = crop_alpha(full, 8)
OUT.mkdir(parents=True, exist_ok=True)
full.save(OUT / 'logo.png', optimize=True)
# 크라운/글자 분리: 원본에서 크라운은 x<150px 부근(빈 세로줄 기준)
colsum = np.asarray(full.getchannel('A')).sum(0)
gap = [x for x in range(int(full.width * 0.15), int(full.width * 0.35)) if colsum[x] == 0]
cut = gap[len(gap) // 2] if gap else int(full.width * 0.25)
crop_alpha(full.crop((0, 0, cut, full.height)), 8).save(OUT / 'logo-mark.png', optimize=True)
crop_alpha(full.crop((cut, 0, full.width, full.height)), 8).save(OUT / 'logo-word.png', optimize=True)
w = full.copy(); px = np.asarray(w).copy(); px[..., :3] = 255
Image.fromarray(px, 'RGBA').save(OUT / 'logo-white.png', optimize=True)
for f in ['logo.png', 'logo-mark.png', 'logo-word.png', 'logo-white.png']:
    print(f, Image.open(OUT / f).size)

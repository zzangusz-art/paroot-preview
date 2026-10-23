#!/usr/bin/env python3
"""대학로 연극 가이드(블로그) 썸네일 — 1200×630 JPG
입력: content/blog/*.md 머리말(title, category, keyword, show, slug, thumb_img)
출력: assets/img/blog/<slug>.jpg → 목록 카드·글 상단·og:image·JSON-LD 가 모두 이 파일을 쓴다

구성: 어두운 무대색 배경 + 은은한 핑크·시안 빛 / 왼쪽 카테고리·제목(대표 키워드는 핑크) / 오른쪽 공연 포스터 또는 무대 사진 카드 / 하단 파릇 로고
배치는 textbbox 실측으로 계산한다. 원본(글·이미지·이 스크립트)이 더 최신일 때만 다시 만든다(--force 로 전부).
사용: python tools/thumbs/build_thumbs.py [--force] [--only <slug>]
"""
import hashlib
import os
import re
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
POSTS = os.path.join(ROOT, 'content', 'blog')
OUT = os.path.join(ROOT, 'assets', 'img', 'blog')
IMG = os.path.join(ROOT, 'assets', 'img')
LOGO = os.path.join(IMG, 'brand', 'logo-white.png')
BOLD = os.path.join(HERE, 'fonts', 'NotoSansKR-Bold.ttf')
MED = os.path.join(HERE, 'fonts', 'NotoSansKR-Medium.ttf')

W, H = 1200, 630
INK = (14, 13, 18)
PINK = (240, 128, 182)
WHITE = (247, 244, 250)
SUB = (182, 176, 194)

# 공연이 없는 글은 카테고리별 무대 사진을 돌려 쓴다(같은 사진이 이어지지 않게 slug 해시로 고름)
STILLS = {
    '공연 고르기': ['stage/crowd-a.webp', 'stage/crowd-b.webp', 'shows/hanbbeumsai/gallery/01.webp', 'shows/office-romance-report/gallery/02.webp'],
    '데이트·모임': ['stage/couple.webp', 'stage/couple-2.webp', 'shows/suspicious-roommate/gallery/01.webp', 'shows/hanbbeumsai/gallery/03.webp'],
    '아이와 공연': ['shows/wolf-forest-piglets/gallery/01.webp', 'shows/pinocchio/gallery/01.webp', 'shows/wolf-forest-piglets/gallery/03.webp', 'shows/pinocchio/gallery/03.webp'],
    '관람 가이드': ['stage/exterior.webp', 'stage/spot.webp', 'stage/crowd-b.webp', 'shows/office-romance-report/gallery/01.webp'],
    '작품 노트': ['stage/laugh.webp', 'stage/hat.webp', 'stage/dress.webp', 'shows/suspicious-roommate/gallery/02.webp'],
}


def front(path):
    s = open(path, encoding='utf-8').read().lstrip('﻿')
    m = re.match(r'^---\r?\n([\s\S]*?)\r?\n---', s)
    meta = {}
    if m:
        for line in m.group(1).splitlines():
            kv = re.match(r'^([a-zA-Z_]+):\s*(.*)$', line)
            if kv:
                meta[kv.group(1)] = kv.group(2).strip().strip('"\'')
    return meta


def cover_crop(im, w, h, fy=.42):
    r = w / h
    if im.width / im.height > r:
        nw = round(im.height * r); x = (im.width - nw) // 2
        im = im.crop((x, 0, x + nw, im.height))
    else:
        nh = round(im.width / r); y = round((im.height - nh) * fy)
        im = im.crop((0, y, im.width, y + nh))
    return im.resize((w, h), Image.LANCZOS)


def glow(base, cx, cy, r, color, a):
    layer = Image.new('RGBA', base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color + (a,))
    layer = layer.filter(ImageFilter.GaussianBlur(r * .45))
    base.alpha_composite(layer)


def wrap(d, text, font, maxw):
    """한글 어절 단위 줄바꿈(실측). 어절이 너무 길면 글자 단위."""
    words, lines, cur = text.split(' '), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=font) <= maxw:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
            while d.textlength(cur, font=font) > maxw:
                for i in range(len(cur), 0, -1):
                    if d.textlength(cur[:i], font=font) <= maxw:
                        lines.append(cur[:i]); cur = cur[i:]; break
    if cur:
        lines.append(cur)
    return lines


def draw_title(d, x, y, lines, font, keyword, lh):
    """대표 키워드 부분만 핑크로 칠한다(줄을 넘어가도 이어서)."""
    full = '\n'.join(lines)
    flat = full.replace('\n', ' ')
    k = keyword.strip()
    start = flat.find(k) if k else -1
    pos = 0
    for li, line in enumerate(lines):
        cx = x
        for ch in line:
            on = start >= 0 and start <= pos < start + len(k)
            d.text((cx, y + li * lh), ch, font=font, fill=PINK if on else WHITE)
            cx += d.textlength(ch, font=font)
            pos += 1
        pos += 1  # 줄바꿈 = 공백


def build(meta, out):
    base = Image.new('RGBA', (W, H), INK + (255,))
    glow(base, 120, 40, 360, (232, 85, 154), 90)
    glow(base, 1150, 640, 420, (31, 167, 219), 70)
    glow(base, 760, 300, 300, (142, 124, 195), 50)
    d = ImageDraw.Draw(base)

    # 오른쪽 카드
    show = meta.get('show', '').strip()
    pick = meta.get('thumb_img', '').strip()
    if pick:
        src = os.path.join(IMG, pick)
    elif show and os.path.exists(os.path.join(IMG, 'shows', show, 'poster.webp')):
        src = os.path.join(IMG, 'shows', show, 'poster.webp')
    else:
        lst = STILLS.get(meta.get('category', ''), STILLS['공연 고르기'])
        h = int(hashlib.md5(meta['slug'].encode()).hexdigest(), 16)
        src = os.path.join(IMG, lst[h % len(lst)])
    cw, ch = 360, 450
    card = cover_crop(Image.open(src).convert('RGB'), cw, ch)
    mask = Image.new('L', (cw, ch), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, cw - 1, ch - 1), 22, fill=255)
    cx, cy = W - cw - 70, (H - ch) // 2
    sh = Image.new('RGBA', base.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((cx + 6, cy + 18, cx + cw + 6, cy + ch + 18), 24, fill=(0, 0, 0, 150))
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(18)))
    base.paste(card, (cx, cy), mask)
    ImageDraw.Draw(base).rounded_rectangle((cx, cy, cx + cw - 1, cy + ch - 1), 22, outline=(255, 255, 255, 40), width=2)

    # 왼쪽 글
    x, maxw = 70, cx - 70 - 60
    f_cat = ImageFont.truetype(MED, 24)
    cat = meta.get('category', '대학로 연극 가이드')
    d.text((x, 92), '대학로 연극 가이드  ·  ' + cat, font=f_cat, fill=PINK)
    title = meta['title']
    for size in (60, 56, 52, 48, 44):
        f = ImageFont.truetype(BOLD, size)
        lines = wrap(d, title, f, maxw)
        if len(lines) <= 3:
            break
    lh = round(size * 1.32)
    ty = 150 + max(0, (3 - len(lines)) * lh // 3)
    draw_title(d, x, ty, lines, f, meta.get('keyword', ''), lh)
    # 하단 로고
    logo = Image.open(LOGO).convert('RGBA')
    lw = 190
    logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
    base.alpha_composite(logo, (x, H - 70 - logo.height))
    d.text((x + lw + 22, H - 70 - logo.height + 2), 'www.paroot.kr', font=ImageFont.truetype(MED, 22), fill=SUB)
    base.convert('RGB').save(out, 'JPEG', quality=86, optimize=True, progressive=True)


def main():
    force = '--force' in sys.argv
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
    os.makedirs(OUT, exist_ok=True)
    me = os.path.getmtime(__file__)
    n = 0
    for f in sorted(os.listdir(POSTS)):
        if not f.endswith('.md') or f.startswith('_'):
            continue
        meta = front(os.path.join(POSTS, f))
        if not meta.get('slug') or not meta.get('title'):
            continue
        if only and meta['slug'] != only:
            continue
        out = os.path.join(OUT, meta['slug'] + '.jpg')
        src_m = max(os.path.getmtime(os.path.join(POSTS, f)), me)
        if not force and os.path.exists(out) and os.path.getmtime(out) >= src_m:
            continue
        build(meta, out); n += 1
        print('썸네일', out[len(ROOT) + 1:])
    print(f'완료: {n}개 생성')


if __name__ == '__main__':
    main()

// 공식 네이버 블로그 RSS → 최근 글 목록. 빌드할 때 읽고, 실패하면 content/naver-blog.json(직전 결과)을 쓴다.
// 오래된 글이 홈에 "최신 소식"처럼 보이지 않게 FRESH_DAYS 안의 글만 고르고, 리뷰 이벤트 당첨자 발표는 뺀다.
import fs from 'node:fs';
import path from 'node:path';

const FRESH_DAYS = 60;
const text = (item, tag) => (item.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)) || [, ''])[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();

export function parseFeed(xml) {
  return xml.split('<item>').slice(1).map(item => ({
    title: text(item, 'title'),
    url: text(item, 'link').split('?')[0],
    date: new Date(text(item, 'pubDate')).toISOString().slice(0, 10),
  })).filter(p => p.title && p.url);
}

export const freshPosts = (posts, today, days = FRESH_DAYS) => posts
  .filter(p => !/당첨자/.test(p.title) && p.date <= today && (Date.parse(today) - Date.parse(p.date)) / 864e5 <= days)
  .slice(0, 3);

export async function loadNaverBlog(ROOT, rssUrl) {
  const cache = path.join(ROOT, 'content/naver-blog.json');
  const old = fs.existsSync(cache) ? fs.readFileSync(cache, 'utf8') : '';
  try {
    const res = await fetch(rssUrl, { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; parootent.kr build)' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const posts = parseFeed(await res.text()).slice(0, 12);
    if (!posts.length) throw new Error('글 없음');
    const json = JSON.stringify(posts, null, 1) + '\n';
    if (json !== old) fs.writeFileSync(cache, json);
    return posts;
  } catch (e) {
    console.warn('네이버 블로그 RSS 못 읽음, 직전 결과 사용:', e.message);
    return old ? JSON.parse(old) : [];
  }
}

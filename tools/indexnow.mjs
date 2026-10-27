// IndexNow: 새로 공개되거나 바뀐 주소를 네이버·빙 등 참여 검색엔진에 바로 알린다(네이버는 2023년 7월부터 지원).
// 구글은 IndexNow를 쓰지 않으므로 Search Console에 제출한 sitemap.xml로 수집한다.
//   node tools/indexnow.mjs <주소...>                    → 그 주소들을 알림
//   node tools/indexnow.mjs --diff <옛 sitemap> <새 sitemap> → 새로 생겼거나 lastmod가 바뀐 주소만(파일 경로 또는 URL)
//   node tools/indexnow.mjs --today <sitemap>             → lastmod가 오늘(한국 시간)인 주소
//   node tools/indexnow.mjs --all <sitemap>               → sitemap의 모든 주소(처음 공개할 때 한 번)
//   --dry 를 붙이면 보내지 않고 목록만 보여 준다.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { SITE } from '../src/data.mjs';

const ENDPOINTS = ['https://api.indexnow.org/indexnow', 'https://searchadvisor.naver.com/indexnow'];

export function parseSitemap(xml) {
  const m = new Map();
  for (const [, loc, mod] of xml.matchAll(/<loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)) m.set(loc, mod || '');
  return m;
}
export const changedUrls = (prev, next) => [...next].filter(([u, mod]) => !prev.has(u) || prev.get(u) !== mod).map(([u]) => u);
export const todayUrls = (map, today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date())) => [...map].filter(([, mod]) => mod.startsWith(today)).map(([u]) => u);

export async function ping(urls, { dry = !!process.env.INDEXNOW_DRY, log = console.log } = {}) {
  const site = new URL(SITE.url);
  const list = [...new Set(urls)].filter(u => u.startsWith(site.origin)).slice(0, 10000);
  if (!list.length || !SITE.indexNowKey || /^(localhost|127\.)/.test(site.hostname)) return [];
  const body = { host: site.host, key: SITE.indexNowKey, keyLocation: `${site.origin}/${SITE.indexNowKey}.txt`, urlList: list };
  if (dry) { log(`[IndexNow 미전송] ${list.length}개\n` + list.join('\n')); return []; }
  const res = [];
  for (const ep of ENDPOINTS) {
    const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) }).then(x => x.status).catch(e => 'ERR ' + e.message);
    res.push([ep, r]);
  }
  log(`IndexNow ${list.length}개 알림: ${res.map(([e, s]) => `${new URL(e).host} ${s}`).join(', ')}`);
  return res;
}

const read = async src => /^https?:/.test(src) ? fetch(src).then(r => (r.ok ? r.text() : '')).catch(() => '') : (fs.existsSync(src) ? fs.readFileSync(src, 'utf8') : '');

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry') || !!process.env.INDEXNOW_DRY;
  const rest = args.filter(a => a !== '--dry');
  let urls = [];
  if (rest[0] === '--diff') urls = changedUrls(parseSitemap(await read(rest[1])), parseSitemap(await read(rest[2])));
  else if (rest[0] === '--today') urls = todayUrls(parseSitemap(await read(rest[1])));
  else if (rest[0] === '--all') urls = [...parseSitemap(await read(rest[1])).keys()];
  else urls = rest;
  if (!urls.length) console.log('알릴 주소가 없습니다.');
  else await ping(urls, { dry });
}

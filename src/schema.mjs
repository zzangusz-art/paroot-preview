// 구조화 데이터(JSON-LD). 모든 페이지는 @graph 하나로 내보낸다.
// 평점은 네이버 예약(외부 사이트) 집계라 화면에만 출처와 함께 보여 주고 aggregateRating 마크업은 하지 않는다(다른 사이트 평점 집계 금지 지침).
import { SITE, SHOWS, AWARDS, HISTORY, venueOf, ASOF } from './data.mjs';

const ORG_ID = () => SITE.url + '#org';
const SITE_ID = () => SITE.url + '#website';
const DAYS = { 월: 'Monday', 화: 'Tuesday', 수: 'Wednesday', 목: 'Thursday', 금: 'Friday', 토: 'Saturday', 일: 'Sunday' };
const ORDER = ['월', '화', '수', '목', '금', '토', '일'];

function postal(addr) {
  return { '@type': 'PostalAddress', streetAddress: addr.replace(/^서울(특별시)? 종로구 /, ''), addressLocality: '종로구', addressRegion: '서울특별시', addressCountry: 'KR' };
}

export function organization() {
  return {
    '@type': ['Organization', 'PerformingGroup'],
    '@id': ORG_ID(),
    name: SITE.name,
    alternateName: [SITE.brand, '파릇', SITE.nameEn, SITE.en, '(주)파릇'],
    slogan: SITE.tagline,
    description: '주식회사 파릇은 서울 대학로(혜화)에서 연극과 어린이 뮤지컬을 제작·기획·운영하는 공연 제작사입니다. 2016년 어린이뮤지컬 기획으로 시작해 2017년부터 연극 「한뼘사이」를 오픈런으로 공연하고 있습니다.',
    url: SITE.url,
    logo: SITE.url + 'assets/img/brand/logo-512.png',
    image: SITE.url + 'assets/img/og-default.jpg',
    foundingDate: SITE.founded,
    foundingLocation: { '@type': 'Place', name: '서울 종로구 대학로' },
    taxID: SITE.bizNo,
    telephone: SITE.tel,
    email: SITE.email,
    address: { '@type': 'PostalAddress', streetAddress: SITE.address.street, addressLocality: SITE.address.locality, addressRegion: SITE.address.region, addressCountry: 'KR' },
    location: { '@type': 'Place', name: '대학로', geo: { '@type': 'GeoCoordinates', latitude: SITE.address.lat, longitude: SITE.address.lng } },
    areaServed: { '@type': 'Country', name: '대한민국' },
    knowsAbout: ['대학로 연극', '혜화 연극', '로맨틱 코미디 연극', '어린이 참여형 뮤지컬', '공연 제작', '공연 기획', '기업 초청 공연', '드랙 쇼'],
    award: AWARDS.map(a => `${a.t} — ${a.d}`),
    contactPoint: [
      { '@type': 'ContactPoint', contactType: '공연·제휴 문의', email: SITE.email, telephone: SITE.tel, availableLanguage: 'Korean' },
      { '@type': 'ContactPoint', contactType: '오디션 지원', email: SITE.audition, availableLanguage: 'Korean' },
    ],
    makesOffer: SHOWS.map(s => ({ '@type': 'Offer', itemOffered: { '@id': SITE.url + `shows/${s.slug}/#event` } })),
  };
}

export function website() {
  return { '@type': 'WebSite', '@id': SITE_ID(), url: SITE.url, name: SITE.name, alternateName: SITE.brand, inLanguage: 'ko-KR', publisher: { '@id': ORG_ID() } };
}

export function webpage({ url, title, description, type = 'WebPage', modified = ASOF, image }) {
  return { '@type': type, '@id': url + '#webpage', url, name: title, description, inLanguage: 'ko-KR', isPartOf: { '@id': SITE_ID() }, about: { '@id': ORG_ID() }, dateModified: modified, ...(image ? { primaryImageOfPage: image } : {}) };
}

export function breadcrumb(items) {
  return { '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })) };
}

export function faqPage(faqs, url) {
  if (!faqs.length) return null;
  return { '@type': 'FAQPage', '@id': url + '#faq', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/[<>]/g, m => (m === '<' ? '「' : '」')) } })) };
}

// 요일별 회차 → Schedule 목록(같은 시각을 요일로 묶는다)
function schedules(s) {
  const byTime = new Map();
  for (const [days, times] of s.schedule) {
    const ds = days.includes('~') ? ORDER.slice(ORDER.indexOf(days[0]), ORDER.indexOf(days[2]) + 1) : days.split('·').map(x => x.trim()[0]);
    for (const t of times.replace(/\(.*?\)/g, '').match(/\d{2}:\d{2}/g) || []) { // 괄호 안(입장 시각)은 제외
      const k = t; if (!byTime.has(k)) byTime.set(k, new Set());
      ds.forEach(d => byTime.get(k).add(d));
    }
  }
  return [...byTime].map(([t, ds]) => ({ '@type': 'Schedule', repeatFrequency: 'P1W', byDay: [...ds].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).map(d => 'https://schema.org/' + DAYS[d]), startTime: t + ':00', scheduleTimezone: 'Asia/Seoul', startDate: s.since }));
}

export function event(s, url, image) {
  const v = venueOf(s);
  const prices = s.prices.map(p => p.price);
  const age = s.cat === 'kids' ? '2-' : (s.age.match(/만 (\d+)세/)?.[1] ?? '12') + '-';   // 연극 12·15세, 드랙 19세
  return {
    '@type': s.cat === 'show' ? 'Event' : 'TheaterEvent',
    '@id': url + '#event',
    name: s.full,
    alternateName: [s.title, s.original ? `비누향기` : null, s.short, s.titleEn].filter(Boolean),
    description: s.lead,
    url,
    image,
    inLanguage: 'ko',
    startDate: s.since,
    duration: `PT${s.runtime}M`,
    typicalAgeRange: age,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventSchedule: schedules(s),
    location: {
      '@type': 'PerformingArtsTheater', name: v.name + (v.alias ? ` (${v.alias})` : ''),
      address: postal(v.addr), geo: { '@type': 'GeoCoordinates', latitude: v.lat, longitude: v.lng },
    },
    organizer: { '@id': ORG_ID() },
    workPerformed: { '@type': 'CreativeWork', name: s.title, genre: s.genre, ...(s.original ? { isBasedOn: { '@type': 'CreativeWork', name: s.original } } : {}) },
    offers: {
      '@type': 'AggregateOffer', priceCurrency: 'KRW', lowPrice: Math.min(...prices), highPrice: Math.max(...prices.concat(s.prices.map(p => p.normal))),
      offerCount: s.prices.length, url: s.booking.url, availability: 'https://schema.org/InStock', validFrom: s.since,
    },
  };
}

export function showList(url) {
  return { '@type': 'ItemList', '@id': url + '#shows', name: '파릇 공연', itemListElement: SHOWS.map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE.url + `shows/${s.slug}/`, name: s.full })) };
}

export function blogPosting(p, url, image) {
  return {
    '@type': 'BlogPosting', '@id': url + '#article', headline: p.title, description: p.description,
    datePublished: p.date, dateModified: p.updated || p.date, inLanguage: 'ko-KR', url,
    mainEntityOfPage: url, articleSection: p.category, keywords: p.tags.join(', '),
    author: { '@type': 'Organization', name: p.author || '파릇 공연기획팀', url: SITE.url + 'about/' },
    publisher: { '@id': ORG_ID() },
    image,
    ...(p.show ? { about: { '@id': SITE.url + `shows/${p.show}/#event` } } : {}),
  };
}

export function historyPage() {
  return { '@type': 'ItemList', name: '파릇 공연 연혁', itemListElement: HISTORY.flatMap(h => h.items).map(([d, t], i) => ({ '@type': 'ListItem', position: i + 1, name: `${d} ${t}` })) };
}

export const graph = (...nodes) => ({ '@context': 'https://schema.org', '@graph': nodes.flat().filter(Boolean) });

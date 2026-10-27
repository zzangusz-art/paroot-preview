// 방문 분석 태그: GA4(gtag)·Google 태그 관리자·네이버 애널리틱스·Microsoft Clarity.
// SITE.analytics에 ID가 있는 것만 넣고, 운영 빌드에서만 켠다(setTracking). 이벤트는 assets/js/app.js의 「방문 분석 이벤트」가 보낸다.
import { SITE } from './data.mjs';

const A = SITE.analytics || {};
const valid = { ga4: /^G-[A-Z0-9]{4,}$/, gtm: /^GTM-[A-Z0-9]{4,}$/, naver: /^[a-z0-9]{6,}$/i, clarity: /^[a-z0-9]{6,}$/i };
const ids = Object.fromEntries(Object.entries(valid).map(([k, re]) => [k, re.test(A[k] || '') ? A[k] : '']));
let on = false;
export const setTracking = v => { on = !!v; };
export const trackingTools = () => (on ? Object.keys(ids).filter(k => ids[k]) : []);

export function analyticsHead() {
  if (!trackingTools().length) return '';
  const out = [`<script>window.PAROOT_ANALYTICS=${JSON.stringify(ids)};window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}</script>`];
  if (ids.gtm) out.push(`<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${ids.gtm}');</script>`);
  if (ids.ga4) out.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${ids.ga4}"></script>`, `<script>gtag('js',new Date());gtag('config','${ids.ga4}');</script>`);
  if (ids.clarity) out.push(`<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${ids.clarity}");</script>`);
  return out.join('\n') + '\n';
}

export function analyticsBodyTop() {
  return on && ids.gtm ? `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${ids.gtm}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n` : '';
}

// 네이버 애널리틱스: 페이지 끝에서 비동기로 불러 첫 화면을 막지 않는다. wcs.inflow는 네이버 광고 유입·전환 연결용.
export function analyticsBodyEnd() {
  return on && ids.naver ? `<script>window.wcs_add=window.wcs_add||{};wcs_add.wa="${ids.naver}";</script>\n<script async src="https://wcs.naver.net/wcslog.js" onload="if(window.wcs){if(wcs.inflow)wcs.inflow('${SITE.displayDomain}');wcs_do();}"></script>\n` : '';
}

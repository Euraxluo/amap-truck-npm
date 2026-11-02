// 拦截高德域名请求 → /_amap/ 本地反代 (解决用户代理网络下瓦片失败)
const AMAP = /(\.|^)(amap\.com|autonavi\.com)$/;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
  const host = url.hostname;
  if (!AMAP.test(host)) return;             // 只拦高德系域名
  if (url.origin === self.location.origin) return;
  e.respondWith(
    fetch('/_amap/' + encodeURIComponent(e.request.url), { headers: { 'Referer': location.origin } })
      .catch(() => fetch(e.request))
  );
});

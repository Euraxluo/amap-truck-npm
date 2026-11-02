/** 单元测试: 参数构造/校验/summary (mock fetch, 不打真实网络) */
import { strict as assert } from 'node:assert';
import { setServer } from '../src/api.js';

setServer('http://test.local');

// 直接构造 qs 逻辑的等价测试 — truckRoute 的 URL 组装
let captured = null;
globalThis.fetch = async (url) => {
  captured = url;
  return {
    ok: true,
    json: async () => ({
      errcode: 0, errmsg: 'OK',
      data: { count: 1, route: { origin: '116,39', destination: '121,31', paths: [
        { distance: 1000, duration: 60, tolls: 5, steps: [{ instruction: '直行', road: 'G2', distance: 1000, duration: 60 }] },
      ] } },
    }),
  };
};

const { truckRoute, summary, SIZE, STRATEGY } = await import('../src/api.js');

// 1. 基本参数
await truckRoute({ origin: [116.481008, 39.989625], destination: [121.499718, 31.239703] });
assert.match(captured, /origin=116\.481008%2C39\.989625/);
assert.match(captured, /destination=121\.499718%2C31\.239703/);
assert.match(captured, /size=2/);           // 默认轻型
assert.match(captured, /strategy=11/);      // 默认高德推荐
assert.ok(!/key=/.test(captured), '不应再有 key 参数');
console.log('✓ 基本参数 + 无 key');

// 2. 途经点 ; 分隔 (官方格式)
await truckRoute({
  origin: [116.48, 39.98], destination: [121.49, 31.23],
  waypoints: [[117.12, 36.65], [118.83, 32.30]],
});
assert.match(captured, /waypoints=117\.12%2C36\.65%3B118\.83%2C32\.3/);
console.log('✓ waypoints 官方 ; 格式');

// 3. 校验
await assert.rejects(() => truckRoute({ origin: null, destination: [1, 2] }), TypeError);
await assert.rejects(() => truckRoute({
  origin: [1, 2], destination: [3, 4],
  waypoints: Array.from({ length: 17 }, (_, i) => [i, i]),
}), RangeError);
console.log('✓ 参数校验');

// 4. summary
const resp = await truckRoute({ origin: [1, 2], destination: [3, 4] });
const s = summary(resp);
assert.equal(s.distance, 1000);
assert.equal(s.tolls, 5);
assert.equal(s.steps, 1);
console.log('✓ summary 提取');

// 5. 错误透传
globalThis.fetch = async () => ({ ok: true, json: async () => ({ errcode: 3, errmsg: 'Params error' }) });
await assert.rejects(() => truckRoute({ origin: [1, 2], destination: [3, 4] }), /errcode 3/);
console.log('✓ 错误码透传');

console.log('\n全部通过');

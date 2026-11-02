/**
 * 请求层 — 调用本地/远程 amap-truck-server (高德APP货车导航私有通道的封装服务)
 *
 * 服务端即 amap-truck-rev/scripts/truck_openapi.py, 可本地跑也可部署到远端。
 * 浏览器直连高德私有端点会有 CORS 限制, 所以渲染层一律走这个代理。
 */

const DEFAULTS = {
  // 本地默认; 部署后改成你的服务地址, 或用 setServer()
  server: 'http://127.0.0.1:18964',
  timeout: 25000,
};

let config = { ...DEFAULTS };

export function setServer(server) {
  config.server = String(server).replace(/\/+$/, '');
}

export function getServer() {
  return config.server;
}

/** 官方 strategy 枚举 (与 v4/direction/truck strategy 参数一致) */
export const STRATEGY = Object.freeze({
  CONGESTION: 1,          // 躲避拥堵
  NO_HIGHWAY: 2,          // 不走高速
  AVOID_TOLL: 3,          // 避免收费
  CONGESTION_NO_HIGHWAY: 4,
  AVOID_TOLL_NO_HIGHWAY: 5,
  CONGESTION_AVOID_TOLL: 6,
  CONGESTION_TOLL_NO_HIGHWAY: 7,
  HIGHWAY_FIRST: 8,       // 高速优先
  CONGESTION_HIGHWAY: 9,
  SPEED_NO_TRAFFIC: 10,   // 无路况速度优先
  RECOMMEND: 11,          // 高德推荐
  NO_TRAFFIC_NO_HIGHWAY: 12,
  DISTANCE: 13,           // 距离优先
});

/** 国标车型档位 */
export const SIZE = Object.freeze({
  MINI: 1,    // 微型 ≤3.5m, ≤1.8t
  LIGHT: 2,   // 轻型 <6m, <4.5t
  MEDIUM: 3,  // 中型 ≥6m, 4.5-12t
  HEAVY: 4,   // 重型 ≥6m, ≥12t
});

function qs(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    p.set(k, String(v));
  }
  return p.toString();
}

/**
 * 货车路径规划
 * @param {object} opts
 * @param {[number,number]} opts.origin      [lng,lat] GCJ-02
 * @param {[number,number]} opts.destination [lng,lat]
 * @param {Array<[number,number]>} [opts.waypoints] 途经点, ≤16
 * @param {number} [opts.size=2]   车型档位 SIZE.*
 * @param {number} [opts.strategy] 策略 STRATEGY.*
 * @param {number} [opts.height]   车高 m
 * @param {number} [opts.width]    车宽 m
 * @param {number} [opts.load]     总重 t
 * @param {number} [opts.weight]   核定载重 t
 * @param {number} [opts.axis]     轴数
 * @param {string} [opts.province] 车牌省份 (如 "京")
 * @param {string} [opts.number]   车牌号 (如 "A12345")
 * @returns {Promise<object>} v4 兼容响应 {errcode, errmsg, data}
 */
export async function truckRoute(opts) {
  const { origin, destination } = opts || {};
  if (!Array.isArray(origin) || !Array.isArray(destination)) {
    throw new TypeError('origin/destination 必须是 [lng, lat]');
  }
  const q = {
    origin: origin.join(','),
    destination: destination.join(','),
    size: opts.size ?? SIZE.LIGHT,
    strategy: opts.strategy ?? STRATEGY.RECOMMEND,
  };
  if (Array.isArray(opts.waypoints) && opts.waypoints.length) {
    if (opts.waypoints.length > 16) throw new RangeError('waypoints 最多 16 个');
    q.waypoints = opts.waypoints.map((w) => w.join(',')).join(';');
  }
  for (const k of ['height', 'width', 'load', 'weight', 'axis', 'province', 'number']) {
    if (opts[k] !== undefined) q[k] = opts[k];
  }
  // 无需 key: 通道鉴权在后端代理内完成
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), config.timeout);
  try {
    const res = await fetch(`${config.server}/v4/direction/truck?${qs(q)}`, {
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.errcode !== 0) throw new Error(`errcode ${json.errcode}: ${json.errmsg}`);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

/** 从响应提取汇总 (路径0/最优) */
export function summary(resp) {
  const p = resp?.data?.route?.paths?.[0];
  if (!p) return null;
  return {
    distance: p.distance,
    duration: p.duration,
    tolls: p.tolls,
    steps: p.steps.length,
    alternatives: resp.data.route.paths.length - 1,
  };
}

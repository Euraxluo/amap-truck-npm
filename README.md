# amap-truck-nav

高德地图 APP 货车导航的前端渲染层。配套后端代理逆向还原了高德 APP 私有货车算路通道，
对外暴露与官方《物流服务API·货车路径规划基础版》v4 OpenAPI 兼容的接口。

```
浏览器/Node ──> amap-truck-nav (本包) ──> truck_openapi.py (后端代理) ──> 高德 APP 私有通道
```

## 特性

- 🚛 货车路径规划：距离/耗时/过路费/分步转向，多备选方案
- 📏 国标车型档位：`1`微型 `2`轻型 `3`中型 `4`重型 + 精确车长/宽/高/载重/轴数
- 📍 多途经点：最多 16 个，全部生效
- 🧭 13 种策略：躲避拥堵/避免收费/高速优先/距离优先/不走高速…（官方枚举）
- 🎨 三端渲染：原生 HTML / React / Vue 3 组合式 API
- ✅ 响应只含通道真实返回的字段（距离/耗时/过路费/分步转向/电子眼），无 key、无假数据

## 安装

```bash
npm install amap-truck-nav
```

## 后端代理（必需）

浏览器直连高德有 CORS，需跑后端代理（[amap-truck-rev](../amap-truck-rev) 子项目）：

```bash
python3 ../amap-truck-rev/scripts/truck_openapi.py
# → http://127.0.0.1:18964/v4/direction/truck
```

## 使用

### 原生 HTML / Vue

```html
<script type="module">
  import { truckRoute, renderRoute, injectStyles, setServer } from 'amap-truck-nav';
  // CDN: https://esm.sh/amap-truck-nav
  setServer(location.origin); // 同源反代 /v4/*
  injectStyles();
  const resp = await truckRoute({
    origin: [116.481008, 39.989625],       // GCJ-02
    destination: [121.499718, 31.239703],
    waypoints: [[117.12, 36.65]],           // 可选, ≤16
    size: 4,                                 // 重型
    strategy: 3,                             // 避免收费
    height: 4.0, width: 2.55, load: 31, weight: 20, axis: 6,
    province: '京', number: 'A12345',
  });
  document.body.appendChild(renderRoute(resp));
</script>
```

Vue 里挂载返回的 DOM 元素即可：`onMounted(() => host.appendChild(renderRoute(resp)))`。

### React

```jsx
import { setReact, createTruckRouteHook, renderRoute, injectStyles } from 'amap-truck-nav/react';
import React from 'react';
setReact(React);

const useTruckRoute = createTruckRouteHook();

function App() {
  const { data, loading, error } = useTruckRoute(
    { origin: [116.481, 39.989], destination: [121.499, 31.239], size: 4 },
    []
  );
  if (loading) return <p>算路中…</p>;
  if (error) return <p>{error}</p>;
  return <pre>{JSON.stringify(data, null, 2)}</pre>; // {distance, duration, tolls, steps, alternatives}
}
```

### Vue 3

```js
import { setVue, createTruckRoute } from 'amap-truck-nav/vue';
import { ref, onMounted } from 'vue';
setVue(Vue); // 或 import 的 Vue

const truck = createTruckRoute();

// 组件里:
setup() {
  const { data, loading, error } = truck.use(
    { origin: [116.481, 39.989], destination: [121.499, 31.239], size: 4 },
    []
  );
  return { data, loading, error };
}
// 模板: <div v-if="data">{{ data.distance }}m / {{ data.duration }}s</div>
```

### Node（无渲染）

```js
import { truckRoute } from 'amap-truck-nav/api';
setServer('https://your-proxy.example.com');
const resp = await truckRoute({ origin: [116.481, 39.989], destination: [121.499, 31.239] });
```

## API

| 导出 | 说明 |
|---|---|
| `truckRoute(opts)` | 算路，返回 v4 兼容 `{errcode, errmsg, data.route.paths[]}` |
| `summary(resp)` | 提取 `{distance, duration, tolls, steps, alternatives}` |
| `setServer(url)` / `getServer()` | 后端代理地址，默认 `http://127.0.0.1:18964` |
| `renderRoute(resp, opts?)` | 渲染路线面板（方案切换+分步列表），返回 DOM |
| `camerasOf(resp)` | 提取电子眼坐标 `[{lng,lat,type,speed}]` |
| `injectStyles()` | 注入默认样式（可不用，自己写 CSS） |
| `STRATEGY` / `SIZE` | 策略/车型枚举常量 |
| `setReact(R)` + `createTruckRouteHook()` | React hook 工厂 |
| `setVue(V)` + `createTruckRoute()` | Vue 3 组合式容器 (导入路径 `amap-truck-nav/vue`) |

`truckRoute` 参数：`origin`、`destination`（`[lng,lat]`，GCJ-02）、`waypoints`、`size`、`strategy`、
`height`、`width`、`load`（总重 t）、`weight`（核定载重 t）、`axis`、`province`、`number`。

## Demo

```bash
npm run demo   # http://127.0.0.1:18965 (自动拉起 18964 后端)
```

## 响应数据说明（诚实边界）

通道真实返回（本包响应的全部字段）：

```jsonc
{ "errcode": 0, "errmsg": "OK", "data": { "count": 1, "route": { "origin": "...", "destination": "...",
  "paths": [{ "distance": 13710, "duration": 1500, "tolls": 43,
    "steps": [{ "instruction": "沿…向西南行驶41米右转", "road": "无名道路", "distance": 41,
      "cameras": [{ "x": "116.7647", "y": "39.9895", "type": "3", "speed": "0" }] }] }] } } }
```

**不返回**（通道不存在，本包绝不编造）：polyline 路线坐标串、分段路况 tmcs、
限行明细 restriction、toll_distance、action/orientation。需要画线叠加高德 JS API 显示层，电子眼可直接打点。

## License

MIT

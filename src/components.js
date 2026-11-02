/**
 * 纯数据渲染组件 — 不依赖任何地图 SDK。
 * 把 v4 响应渲染成: 路线摘要 + 分步转向列表 + 电子眼坐标列表。
 * 框架无关: 返回 DOM 元素, React/Vue/原生 HTML 均可挂载。
 */

const ORIENT_CN = { 1: '北', 2: '东北', 3: '东', 4: '东南', 5: '南', 6: '西南', 7: '西', 8: '西北' };

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function fmtKm(m) { return `${(m / 1000).toFixed(1)} km`; }
function fmtH(s) {
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h}小时${m}分` : `${m}分钟`;
}

/**
 * 渲染完整路线面板
 * @param {object} resp truckRoute() 的响应
 * @param {object} [opts] { collapsed: 初始折叠步骤 }
 * @returns {HTMLElement}
 */
export function renderRoute(resp, opts = {}) {
  const root = el('div', 'atruck-panel');
  const paths = resp?.data?.route?.paths ?? [];
  if (!paths.length) {
    root.appendChild(el('div', 'atruck-empty', '无可行路线'));
    return root;
  }

  const tabs = el('div', 'atruck-tabs');
  const body = el('div', 'atruck-body');
  root.append(tabs, body);

  paths.forEach((p, i) => {
    const tab = el('button', 'atruck-tab' + (i === 0 ? ' is-active' : ''),
      `方案${i + 1} · ${fmtKm(p.distance)} · ${fmtH(p.duration)} · 过路费${p.tolls || 0}元`);
    tab.addEventListener('click', () => {
      tabs.querySelectorAll('.atruck-tab').forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      renderSteps(body, p, opts);
    });
    tabs.appendChild(tab);
  });
  renderSteps(body, paths[0], opts);
  return root;
}

function renderSteps(container, path, opts) {
  container.innerHTML = '';
  const list = el('ol', 'atruck-steps');
  const fold = el('button', 'atruck-fold', opts.collapsed ? `展开 ${path.steps.length} 步` : '收起');
  list.style.display = opts.collapsed ? 'none' : '';
  path.steps.forEach((s, i) => {
    const li = el('li', 'atruck-step');
    const idx = el('span', 'atruck-idx', String(i + 1));
    const main = el('div', 'atruck-main');
    main.appendChild(el('div', 'atruck-text', s.instruction || s.road || ''));
    const meta = el('div', 'atruck-meta');
    if (s.road) meta.appendChild(el('span', 'atruck-road', s.road));
    meta.appendChild(el('span', 'atruck-dist', fmtKm(s.distance)));
    if (s.duration) meta.appendChild(el('span', 'atruck-dur', fmtH(s.duration)));
    main.appendChild(meta);
    li.append(idx, main);
    list.appendChild(li);
  });
  fold.addEventListener('click', () => {
    const hidden = list.style.display === 'none';
    list.style.display = hidden ? '' : 'none';
    fold.textContent = hidden ? '收起' : `展开 ${path.steps.length} 步`;
  });
  container.append(fold, list);
}

/** 电子眼/摄像头坐标列表 (APP 通道真实返回的唯一点位数据) */
export function camerasOf(resp) {
  const out = [];
  for (const p of resp?.data?.route?.paths ?? []) {
    for (const s of p.steps ?? []) {
      for (const c of s.cameras ?? []) {
        if (c.x && c.y) out.push({ lng: +c.x, lat: +c.y, type: +c.type, speed: +c.speed });
      }
    }
  }
  return out;
}

/** 默认样式 — 注入一次即可; 也可不用, 自己写 CSS 类 */
const CSS = `
.atruck-panel{font:14px/1.6 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#333;max-width:480px;border:1px solid #e5e6eb;border-radius:12px;overflow:hidden;background:#fff}
.atruck-tabs{display:flex;flex-wrap:wrap;gap:8px;padding:10px;background:#f7f8fa;border-bottom:1px solid #e5e6eb}
.atruck-tab{border:1px solid #d0d3d9;background:#fff;border-radius:8px;padding:6px 10px;font-size:13px;cursor:pointer}
.atruck-tab.is-active{border-color:#1890ff;color:#1890ff;font-weight:600}
.atruck-body{padding:10px 12px}
.atruck-fold{border:none;background:none;color:#1890ff;cursor:pointer;padding:4px 0;font-size:13px}
.atruck-steps{list-style:none;margin:6px 0 0;padding:0;max-height:420px;overflow:auto}
.atruck-step{display:flex;gap:10px;padding:8px 0;border-bottom:1px dashed #eef0f3}
.atruck-step:last-child{border-bottom:none}
.atruck-idx{flex:none;width:22px;height:22px;border-radius:50%;background:#e6f4ff;color:#1890ff;font-size:12px;display:flex;align-items:center;justify-content:center;margin-top:2px}
.atruck-text{font-weight:500}
.atruck-meta{display:flex;gap:10px;font-size:12px;color:#8a8f99;margin-top:2px}
`;

export function injectStyles(doc = document) {
  if (doc.querySelector('#atruck-styles')) return;
  const s = doc.createElement('style');
  s.id = 'atruck-styles';
  s.textContent = CSS;
  doc.head.appendChild(s);
}

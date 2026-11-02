/**
 * Vue 3 适配 — createTruckRoute() 返回组合式容器, 模板里直接用
 * Vue 以 peerDependency 引入, 不打进包。
 */

let Vue = null;

/** 由宿主注入 Vue 3 (避免把 Vue 打进包) */
export function setVue(v) { Vue = v; }

/**
 * 创建货车路线容器 (Composition API)
 * @returns {{ use: (opts:object, deps?:any[]) => { data, loading, error, resp } , TruckRoutePanel: object }}
 */
export function createTruckRoute() {
  if (!Vue || !Vue.ref || !Vue.onMounted) {
    throw new Error('先调 setVue(Vue) 注入 Vue 3');
  }
  const use = (opts = {}, deps = []) => {
    const data = Vue.ref(null);
    const loading = Vue.ref(false);
    const error = Vue.ref(null);
    const resp = Vue.shallowRef(null);
    let timer = null;
    const run = async () => {
      loading.value = true; error.value = null;
      try {
        const { truckRoute, summary } = await import('./api.js');
        const r = await truckRoute(opts);
        resp.value = r; data.value = summary(r);
      } catch (e) {
        error.value = String(e?.message || e);
      } finally {
        loading.value = false;
      }
    };
    Vue.onMounted(() => {
      // deps 变化去抖重算
      let last = JSON.stringify(deps);
      timer = setInterval(() => {
        const now = JSON.stringify(deps);
        if (now !== last) { last = now; run(); }
      }, 300);
      run();
    });
    Vue.onUnmounted(() => clearInterval(timer));
    return { data, loading, error, resp };
  };
  return { use };
}

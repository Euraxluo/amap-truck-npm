/**
 * React 适配 — useTruckRoute hook + <TruckRoutePanel> 组件 (无 jsx, 兼容任意打包器)
 * React 以 peerDependency 引入, 不打进包里。
 */

let React = null;

/** 由宿主应用注入 React (避免把 React 打进包) */
export function setReact(R) { React = R; }

/** @returns {import('./api.js').summary 的结果|null, loading, error} */
export function createTruckRouteHook() {
  if (!React || !React.useState || !React.useEffect) {
    throw new Error('先调 setReact(React) 注入 React');
  }
  const { useState, useEffect } = React;
  return function useTruckRoute(opts, deps = []) {
    const [state, setState] = useState({ data: null, loading: false, error: null });
    useEffect(() => {
      let alive = true;
      setState({ data: null, loading: true, error: null });
      import('./api.js').then(async ({ truckRoute, summary }) => {
        try {
          const resp = await truckRoute(opts);
          if (alive) setState({ data: summary(resp), loading: false, error: null, resp });
        } catch (e) {
          if (alive) setState({ data: null, loading: false, error: String(e?.message || e) });
        }
      });
      return () => { alive = false; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
    return state;
  };
}

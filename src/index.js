import { truckRoute, summary, setServer, getServer, STRATEGY, SIZE } from './api.js';
import { renderRoute, camerasOf, injectStyles } from './components.js';
import { createTruckRouteHook } from './react.js';
import { createTruckRoute, setVue } from './vue.js';

export {
  truckRoute, summary, setServer, getServer, STRATEGY, SIZE,
  renderRoute, camerasOf, injectStyles,
  createTruckRouteHook,
  createTruckRoute, setVue,
};
export default { truckRoute, summary, setServer, getServer, STRATEGY, SIZE, renderRoute, camerasOf, injectStyles, createTruckRouteHook, createTruckRoute, setVue };

import Vue from 'vue';
import { sync } from 'vuex-router-sync';
import 'material-components-web/dist/material-components-web.css';
import App from './renderer/App';
import router from './renderer/router';
import store from './renderer/store';
import './renderer/mixin';

Vue.config.devtools = false;
Vue.config.productionTip = false;

sync(store, router);

new Vue({ // eslint-disable-line no-new
  el: '#app',
  router,
  store,
  template: '<App/>',
  components: { App },
});

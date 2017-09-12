import { remote } from 'electron';
import path from 'path';
import Vue from 'vue';
import Vuex from 'vuex';
import createPersistedState from 'vuex-persistedstate';
import { listFiles } from '../utils/file';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    directory: remote.app.getPath('home'),
    files: [],
  },
  actions: {
    async changeDirectory({ commit }, dir) {
      commit('setDirectory', { dir });
      const files = await listFiles(dir);
      commit('setFiles', { files });
    },
    async changeChildDirectory({ dispatch, state }, dirname) {
      const child = path.join(state.directory, dirname);
      await dispatch('changeDirectory', child);
    },
    async changeParentDirectory({ dispatch, state }) {
      const parent = path.dirname(state.directory);
      await dispatch('changeDirectory', parent);
    },
  },
  mutations: {
    setDirectory(state, { dir }) {
      Vue.set(state, 'directory', dir);
    },
    setFiles(state, { files }) {
      Vue.set(state, 'files', files);
    },
  },
  plugins: [
    createPersistedState({
      paths: ['directory'],
    }),
  ],
});

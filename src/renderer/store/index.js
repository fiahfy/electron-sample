import path from 'path'
import { remote } from 'electron'
import Vue from 'vue'
import Vuex from 'vuex'
import createPersistedState from 'vuex-persistedstate'
import router from '../router'
import { listFiles, isImage } from '../utils/file'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    error: false,
    directory: remote.app.getPath('home'),
    files: [],
    selectedFile: '',
    isViewing: false,
    images: [],
    currentImage: ''
  },
  actions: {
    async loadFiles ({ commit }, dir) {
      try {
        const files = await listFiles(dir)
        commit('loadedFiles', { files, error: false })
      } catch (e) {
        commit('loadedFiles', { files: [], error: true })
      }
    },
    async changeDirectory ({ commit, dispatch }, dir) {
      commit('changedDirectory', { dir })
      await dispatch('loadFiles', dir)
    },
    async changeChildDirectory ({ dispatch, state }, dirname) {
      const child = path.join(state.directory, dirname)
      await dispatch('changeDirectory', child)
    },
    async changeParentDirectory ({ dispatch, state }) {
      const parent = path.dirname(state.directory)
      await dispatch('changeDirectory', parent)
    },
    async refreshDirectory ({ dispatch, state }) {
      await dispatch('loadFiles', state.directory)
    },
    async showViewer ({ commit }, file) {
      try {
        const dir = path.dirname(file)
        let files = await listFiles(dir)
        files = files.filter((file) => isImage(file.path))
        commit('preparedViewer', { files, file, error: false })
      } catch (e) {
        commit('preparedViewer', { files: [], file: '', error: true })
      }
    }
  },
  mutations: {
    changedDirectory (state, { dir }) {
      state.directory = dir
    },
    loadedFiles (state, { files, error }) {
      state.files = files
      state.error = error
    },
    preparedViewer (state, { files, file }) {
      state.images = files
      state.currentImage = file
      state.isViewing = true
    },
    selectFile (state, { file }) {
      state.selectedFile = file
    },
    viewPreviousImage (state) {
      let index = state.images.findIndex((file) => {
        return file.path === state.currentImage
      }) - 1
      if (index < 0) {
        index = state.images.length - 1
      }
      state.currentImage = state.images[index].path
    },
    viewNextImage (state) {
      let index = state.images.findIndex((file) => {
        return file.path === state.currentImage
      }) + 1
      if (index > state.images.length - 1) {
        index = 0
      }
      state.currentImage = state.images[index].path
    },
    changeRoute (state, { name }) {
      router.push({ name })
    },
    closeViewer (state) {
      state.isViewing = false
    }
  },
  plugins: [
    createPersistedState({
      paths: ['directory']
    })
  ]
})

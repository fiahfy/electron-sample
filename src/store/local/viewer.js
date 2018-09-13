import * as File from '~/utils/file'
import * as WorkerHelper from '~/utils/worker-helper'
import FileWorker from '~/workers/file.worker.js'

const scales = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5]

const worker = new FileWorker()

export default {
  namespaced: true,
  state: {
    loading: false,
    error: null,
    files: [],
    currentFilepath: '',
    originalScale: 0,
    scale: 0,
    scaling: false
  },
  getters: {
    currentFileIndex (state) {
      return state.files.findIndex((file) => state.currentFilepath === file.path)
    },
    currentFile (state) {
      return state.files.find((file) => state.currentFilepath === file.path)
    }
  },
  actions: {
    async loadFiles ({ commit, rootGetters, rootState }, { dirpath, filepath, filepathes }) {
      commit('setLoading', { loading: true })
      commit('setError', { error: null })
      commit('setFiles', { files: [] })
      commit('setCurrentFilepath', { currentFilepath: '' })
      try {
        let files = []
        let currentFilepath = ''
        if (dirpath) {
          files = await WorkerHelper.post(worker, { id: 'listFiles', data: [dirpath, { recursive: rootState.settings.recursive }] })
        } else if (filepath) {
          const file = File.getFile(filepath)
          files = await WorkerHelper.post(worker, { id: 'listFiles', data: [file.dirname] })
          currentFilepath = filepath
        } else {
          files = await WorkerHelper.post(worker, { id: 'getFiles', data: [filepathes] })
        }
        files = files.filter((file) => rootGetters['settings/isFileAvailable']({ filepath: file.path }))
        if (files.length && (!currentFilepath || !files.find((file) => file.path === currentFilepath))) {
          currentFilepath = files[0].path
        }
        commit('setError', { error: null })
        commit('setFiles', { files })
        commit('setCurrentFilepath', { currentFilepath })
      } catch (e) {
        console.error(e)
        commit('setError', { error: e })
        commit('setFiles', { files: [] })
        commit('setCurrentFilepath', { currentFilepath: null })
      }
      commit('setLoading', { loading: false })
    },
    movePreviousFile ({ dispatch, getters, state }) {
      let index = getters.currentFileIndex - 1
      if (index < 0) {
        index = state.files.length - 1
      }
      dispatch('moveFile', { index })
    },
    moveNextFile ({ dispatch, getters, state }) {
      let index = getters.currentFileIndex + 1
      if (index > state.files.length - 1) {
        index = 0
      }
      dispatch('moveFile', { index })
    },
    moveFile ({ commit, state }, { index }) {
      const file = state.files[index]
      if (file) {
        commit('setCurrentFilepath', { currentFilepath: file.path })
      }
    },
    setupZoom ({ commit }, { scale }) {
      commit('setScale', { scale })
      commit('setOriginalScale', { originalScale: scale })
      commit('setScaling', { scaling: false })
    },
    zoomIn ({ commit, state }) {
      const scale = scales.find((scale) => {
        return scale > state.scale
      }) || state.scale
      commit('setScale', { scale })
      commit('setScaling', { scaling: true })
    },
    zoomOut ({ commit, state }) {
      const scale = scales.concat().reverse().find((scale) => {
        return scale < state.scale
      }) || state.scale
      commit('setScale', { scale })
      commit('setScaling', { scaling: true })
    },
    resetZoom ({ commit, state }) {
      commit('setScale', { scale: state.originalScale })
      commit('setScaling', { scaling: false })
    },
    toggleFullScreen ({ dispatch, rootState }) {
      if (rootState.fullScreen) {
        dispatch('leaveFullScreen', null, { root: true })
      } else {
        dispatch('enterFullScreen', null, { root: true })
      }
    },
    dismiss ({ dispatch }) {
      dispatch('dismissViewer', null, { root: true })
    }
  },
  mutations: {
    setLoading (state, { loading }) {
      state.loading = loading
    },
    setError (state, { error }) {
      state.error = error
    },
    setFiles (state, { files }) {
      state.files = files
    },
    setCurrentFilepath (state, { currentFilepath }) {
      state.currentFilepath = currentFilepath
    },
    setOriginalScale (state, { originalScale }) {
      state.originalScale = originalScale
    },
    setScale (state, { scale }) {
      state.scale = scale
    },
    setScaling (state, { scaling }) {
      state.scaling = scaling
    }
  }
}

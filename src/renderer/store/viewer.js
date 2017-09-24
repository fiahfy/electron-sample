import path from 'path'
import { getFile, listFiles, isImage } from '../utils/file'

export default {
  namespaced: true,
  state: {
    error: null,
    isViewing: false,
    files: [],
    currentFile: {}
  },
  actions: {
    show ({ commit, dispatch, rootState }, filepath) {
      try {
        let files
        let file = getFile(filepath)
        if (file.stats.isDirectory()) {
          files = listFiles(file.path)
          files = files.filter((file) => isImage(file.path))
          file = files[0]
          if (!files.length) {
            throw new Error('Image Not Found')
          }
        } else {
          files = [file]
        }
        commit('setError', null)
        commit('setFiles', files)
        commit('setCurrentFile', file)
      } catch (e) {
        let error = e.message === 'Image Not Found' ? e : new Error('Invalid Image')
        commit('setError', error)
        commit('setFiles', [])
        commit('setCurrentFile', {})
      }
      commit('setViewing', true)
      dispatch('focusSelector', '.viewer', { root: true })
      if (rootState.settings.fullScreen) {
        dispatch('enableFullScreen', null, { root: true })
      }
    },
    showSelectedFile ({ dispatch, rootState }) {
      dispatch('show', rootState.explorer.selectedFile.path)
    },
    dismiss ({ commit, dispatch }) {
      commit('setViewing', false)
      dispatch('focusSelector', '.file-list', { root: true })
      dispatch('disableFullScreen', null, { root: true })
    },
    viewPreviousImage ({ commit, getters, state }) {
      let index = getters.currentIndex - 1
      if (index < 0) {
        index = state.files.length - 1
      }
      commit('setCurrentFile', state.files[index])
    },
    viewNextImage ({ commit, getters, state }) {
      let index = getters.currentIndex + 1
      if (index > state.files.length - 1) {
        index = 0
      }
      commit('setCurrentFile', state.files[index])
    }
  },
  mutations: {
    setError (state, error) {
      state.error = error
    },
    setViewing (state, isViewing) {
      state.isViewing = isViewing
    },
    setFiles (state, files) {
      state.files = files
    },
    setCurrentFile (state, file) {
      state.currentFile = file
    },
    setCurrentIndex (state, index) {
      state.currentFile = state.files[index]
    }
  },
  getters: {
    currentIndex (state) {
      return state.files.findIndex((file) => {
        return file.path === state.currentFile.path
      })
    }
  }
}

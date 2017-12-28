import path from 'path'
import { getFile, listFiles, isImage } from '../utils/file'

export default {
  namespaced: true,
  state: {
    error: null,
    display: false,
    files: [],
    currentFile: null
  },
  actions: {
    showSelectedFile ({ dispatch, rootState }) {
      if (rootState.explorer.selectedFile) {
        const filepath = rootState.explorer.selectedFile.path
        dispatch('showFile', { filepath })
      }
    },
    showFile ({ dispatch }, { filepath }) {
      const file = getFile(filepath)
      if (file.stats.isDirectory()) {
        dispatch('showDirectory', { dirpath: filepath, recursive: true })
      } else {
        dispatch('showDirectory', { dirpath: path.dirname(filepath), currentFile: file })
      }
    },
    showDirectory ({ dispatch }, { dirpath, currentFile, recursive = false }) {
      const files = listFiles(dirpath, { recursive })
      dispatch('show', { files, currentFile })
    },
    show ({ commit, dispatch, rootGetters, rootState }, { files, currentFile }) {
      try {
        files = files.filter((file) => isImage(file.path))
        if (!files.length) {
          throw new Error('Image Not Found')
        }
        commit('setError', { error: null })
        commit('setFiles', { files })
        currentFile = currentFile || files[0]
        commit('setCurrentFile', { currentFile })
      } catch (e) {
        const error = e.message === 'Image Not Found' ? e : new Error('Invalid Image')
        commit('setError', { error })
        commit('setFiles', { files: [] })
        commit('setCurrentFile', { currentFile: null })
      }
      commit('setDisplay', { display: true })
      dispatch('focus', { selector: '.viewer' }, { root: true })
      if (rootState.settings.fullScreen && rootGetters.fullScreenAvailable) {
        dispatch('enterFullScreen', null, { root: true })
      }
    },
    dismiss ({ commit, dispatch, rootGetters }) {
      commit('setDisplay', { display: false })
      dispatch('focus', { selector: '.file-list table' }, { root: true })
      if (rootGetters.fullScreenAvailable) {
        dispatch('leaveFullScreen', null, { root: true })
      }
    },
    viewPreviousImage ({ commit, getters, state }) {
      let index = getters.currentIndex - 1
      if (index < 0) {
        index = state.files.length - 1
      }
      const currentFile = state.files[index]
      commit('setCurrentFile', { currentFile })
    },
    viewNextImage ({ commit, getters, state }) {
      let index = getters.currentIndex + 1
      if (index > state.files.length - 1) {
        index = 0
      }
      const currentFile = state.files[index]
      commit('setCurrentFile', { currentFile })
    }
  },
  mutations: {
    setError (state, { error }) {
      state.error = error
    },
    setDisplay (state, { display }) {
      state.display = display
    },
    setFiles (state, { files }) {
      state.files = files
    },
    setCurrentFile (state, { currentFile }) {
      state.currentFile = currentFile
    },
    setCurrentIndex (state, { currentIndex }) {
      state.currentFile = state.files[currentIndex]
    }
  },
  getters: {
    currentIndex (state) {
      return state.files.findIndex((file) => {
        return state.currentFile && file.path === state.currentFile.path
      })
    }
  }
}

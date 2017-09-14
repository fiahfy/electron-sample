import path from 'path'
import { listFiles, isImage } from '../utils/file'

export default {
  state: {
    error: false,
    isViewing: false,
    files: [],
    currentFile: {}
  },
  actions: {
    async showViewer ({ commit }, file) {
      try {
        let files
        if (file.stats.isDirectory()) {
          files = await listFiles(file.path)
          files = files.filter((file) => isImage(file.path))
          file = files[0]
        } else {
          const dir = path.dirname(file.path)
          files = await listFiles(dir)
          files = files.filter((file) => isImage(file.path))
        }
        commit('preparedViewer', { files, file, error: false })
      } catch (e) {
        commit('preparedViewer', { files: [], file: {}, error: true })
      }
    },
    async showViewerWithSelectedFile ({ dispatch, rootState }) {
      await dispatch('showViewer', rootState.selectedFile)
    }
  },
  mutations: {
    preparedViewer (state, { files, file, error }) {
      state.files = files
      state.currentFile = file
      state.isViewing = true
      state.error = error
    },
    viewPreviousImage (state) {
      let index = state.files.findIndex((file) => {
        return file.path === state.currentFile.path
      }) - 1
      if (index < 0) {
        index = state.files.length - 1
      }
      state.currentFile = state.files[index]
    },
    viewNextImage (state) {
      let index = state.files.findIndex((file) => {
        return file.path === state.currentFile.path
      }) + 1
      if (index > state.files.length - 1) {
        index = 0
      }
      state.currentFile = state.files[index]
    },
    closeViewer (state) {
      state.isViewing = false
    }
  }
}

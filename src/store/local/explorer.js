import { remote, shell } from 'electron'
import { Selector } from '~/store'
import * as File from '~/utils/file'
import * as Worker from '~/utils/worker'
import FileWorker from '~/workers/file.worker.js'

const reversed = {
  name: false,
  rating: true,
  modified_at: true
}

const worker = new FileWorker()

export default {
  namespaced: true,
  state: {
    loading: false,
    files: [],
    selectedFilepath: '',
    directoryInput: '',
    query: '',
    queryInput: '',
    display: 'list',
    histories: [],
    historyIndex: -1,
    orders: {},
    directoryImagePathes: {}
  },
  getters: {
    backDirectories (state) {
      return state.histories.slice(0, state.historyIndex).reverse().map(history => history.directory)
    },
    forwardDirectories (state) {
      return state.histories.slice(state.historyIndex + 1, state.histories.length).map(history => history.directory)
    },
    canBackDirectory (state) {
      return state.historyIndex > 0
    },
    canForwardDirectory (state) {
      return state.historyIndex < state.histories.length - 1
    },
    canViewFile (state) {
      return !!state.selectedFilepath
    },
    directoryBookmarked (state, getters, rootState, rootGetters) {
      return rootGetters['bookmark/isBookmarked']({ filepath: rootState.directory })
    },
    scrollTop (state) {
      return state.histories[state.historyIndex].scrollTop
    },
    order (state, getters, rootState) {
      return state.orders[rootState.directory] || {
        by: 'name',
        descending: false
      }
    },
    filteredFiles (state) {
      return state.files.concat().filter((file) => {
        return !state.query || file.name.toLowerCase().indexOf(state.query.toLowerCase()) > -1
      })
    },
    selectedFileIndex (state, getters) {
      return getters.filteredFiles.findIndex((file) => getters.isFileSelected({ filepath: file.path }))
    },
    isFileSelected (state) {
      return ({ filepath }) => state.selectedFilepath === filepath
    },
    isFileAvailable (state, getters, rootState, rootGetters) {
      return ({ filepath }) => rootGetters['settings/isFileAvailable']({ filepath })
    }
  },
  actions: {
    initialize ({ dispatch, rootState }) {
      const dirpath = rootState.directory
      dispatch('changeDirectory', { dirpath, force: true })
    },
    upDirectory ({ dispatch, rootState }) {
      const dirpath = File.getFile(rootState.directory).dirname
      dispatch('changeDirectory', { dirpath })
    },
    changeHomeDirectory ({ dispatch }) {
      const dirpath = remote.app.getPath('home')
      dispatch('changeDirectory', { dirpath })
    },
    changeSelectedDirectory ({ dispatch, state }) {
      if (state.selectedFilepath && File.getFile(state.selectedFilepath).directory) {
        const dirpath = state.selectedFilepath
        dispatch('changeDirectory', { dirpath })
      }
    },
    changeDirectory ({ commit, dispatch, state, rootState }, { dirpath, force = false }) {
      if (state.loading) {
        return
      }
      if (dirpath === rootState.directory && !force) {
        return
      }
      const historyIndex = state.historyIndex + 1
      const histories = [...state.histories.slice(0, historyIndex), {
        directory: dirpath,
        scrollTop: 0
      }]
      commit('setSelectedFilepath', { selectedFilepath: '' })
      commit('setHistories', { histories })
      commit('setHistoryIndex', { historyIndex })

      dispatch('restoreDirectory', { historyIndex })
    },
    backDirectory ({ getters, dispatch, state }, { offset = 0 } = {}) {
      if (!getters.canBackDirectory) {
        return
      }
      const historyIndex = state.historyIndex - 1 - offset
      dispatch('restoreDirectory', { historyIndex })
    },
    forwardDirectory ({ getters, dispatch, state }, { offset = 0 } = {}) {
      if (!getters.canForwardDirectory) {
        return
      }
      const historyIndex = state.historyIndex + 1 + offset
      dispatch('restoreDirectory', { historyIndex })
    },
    reloadDirectory ({ dispatch, state }) {
      dispatch('restoreDirectory', { historyIndex: state.historyIndex })
    },
    restoreDirectory ({ commit, dispatch, state }, { historyIndex }) {
      if (state.loading) {
        return
      }
      const history = state.histories[historyIndex]
      commit('setHistoryIndex', { historyIndex })

      commit('setDirectory', { directory: history.directory }, { root: true })
      commit('setDirectoryInput', { directoryInput: history.directory })
      commit('setQuery', { query: '' })

      dispatch('loadFiles')
    },
    browseDirectory ({ dispatch, rootState }) {
      const result = shell.openItem(rootState.directory)
      if (!result) {
        dispatch('showMessage', { color: 'error', text: 'Invalid directory' }, { root: true })
      }
    },
    toggleDirectoryBookmarked ({ dispatch, rootState }) {
      dispatch('bookmark/toggle', { filepath: rootState.directory }, { root: true })
    },
    async loadFiles ({ commit, dispatch, rootGetters, rootState, state }) {
      if (state.loading) {
        return
      }
      commit('setLoading', { loading: true })
      try {
        commit('setFiles', { files: [] })
        let files = await Worker.post(worker, { id: 'listFiles', data: [rootState.directory] })
        files = files.filter((file) => file.directory || rootGetters['settings/isFileAvailable']({ filepath: file.path }))
          .map((file) => {
            return {
              ...file,
              rating: rootGetters['rating/getRating']({ filepath: file.path })
            }
          })
        commit('setFiles', { files })
      } catch (e) {
        console.error(e)
        commit('setFiles', { files: [] })
      }
      dispatch('sortFiles')
      dispatch('focus')
      commit('setLoading', { loading: false })
    },
    sortFiles ({ commit, getters, state }) {
      const { by, descending } = getters.order
      const files = state.files.concat().sort((a, b) => {
        let result = 0
        if (a[by] > b[by]) {
          result = 1
        } else if (a[by] < b[by]) {
          result = -1
        }
        if (result === 0) {
          if (a.name > b.name) {
            result = 1
          } else if (a.name < b.name) {
            result = -1
          }
        }
        result = reversed[by] ? -1 * result : result
        return descending ? -1 * result : result
      })
      commit('setFiles', { files })
    },
    selectFile ({ commit }, { filepath }) {
      commit('setSelectedFilepath', { selectedFilepath: filepath })
    },
    selectFileIndex ({ dispatch, getters }, { index }) {
      const file = getters.filteredFiles[index]
      if (file) {
        dispatch('selectFile', { filepath: file.path })
      }
    },
    selectFirstFile ({ dispatch }) {
      dispatch('selectFileIndex', { index: 0 })
    },
    selectLastFile ({ dispatch, getters }) {
      dispatch('selectFileIndex', { index: getters.filteredFiles.length - 1 })
    },
    selectPreviousFile ({ dispatch, getters }) {
      dispatch('selectFileIndex', { index: getters.selectedFileIndex - 1 })
    },
    selectNextFile ({ dispatch, getters }) {
      dispatch('selectFileIndex', { index: getters.selectedFileIndex + 1 })
    },
    searchFiles ({ commit }, { query }) {
      commit('setQueryInput', { queryInput: query })
      commit('setQuery', { query })
    },
    updateFile ({ commit }, { file }) {
      commit('rating/setRating', { filepath: file.path, rating: file.rating }, { root: true })
      commit('setFile', { filepath: file.path, file })
    },
    openFile ({ dispatch }, { filepath }) {
      const file = File.getFile(filepath)
      if (file.directory) {
        dispatch('changeDirectory', { dirpath: file.path })
      } else {
        dispatch('viewFile', { filepath: file.path })
      }
    },
    viewFile ({ dispatch }, { filepath }) {
      const file = File.getFile(filepath)
      if (file.directory) {
        dispatch('showViewer', { dirpath: file.path }, { root: true })
      } else {
        dispatch('showViewer', { filepath: file.path }, { root: true })
      }
    },
    setScrollTop ({ commit, state }, { scrollTop }) {
      if (state.loading) {
        return
      }
      const history = {
        ...state.histories[state.historyIndex],
        scrollTop
      }
      commit('setHistory', { history, index: state.historyIndex })
    },
    changeOrderBy ({ commit, dispatch, getters, rootState }, { orderBy }) {
      const descending = getters.order.by === orderBy ? !getters.order.descending : false
      const order = { by: orderBy, descending }
      commit('setOrder', { order, directory: rootState.directory })
      dispatch('sortFiles')
    },
    setDisplay ({ commit, dispatch }, { display }) {
      dispatch('setScrollTop', { scrollTop: 0 })
      commit('setDisplay', { display })
      dispatch('focus')
    },
    focus ({ dispatch, state }) {
      const selector = state.display === 'list' ? Selector.explorerTable : Selector.explorerGridList
      dispatch('focus', { selector }, { root: true })
    },
    async loadDirectoryImage ({ commit, dispatch, state }, { filepath }) {
      commit('setDirectoryImagePathes', { directoryImagePathes: { ...state.directoryImagePathes, [filepath]: '' } })
      if (state.imageLoading) {
        return
      }
      commit('setImageLoading', { imageLoading: true })
      await dispatch('loadDirectoryImages')
    },
    async loadDirectoryImages ({ commit, dispatch, rootGetters, state }) {
      // console.log('load', state.directoryImagePathes)
      const filepath = Object.keys(state.directoryImagePathes).find((filepath) => {
        return state.directoryImagePathes[filepath] === ''
      })
      if (!filepath) {
        commit('setImageLoading', { imageLoading: false })
        return
      }
      console.log(filepath)
      const files = await Worker.post(worker, { id: 'listFiles', data: [filepath] })
      // console.log(files)
      const file = files.find((file) => rootGetters['settings/isFileAvailable']({ filepath: file.path }))
      const imagePath = file ? file.path : null
      console.log(filepath, imagePath)
      commit('setDirectoryImagePathes', { directoryImagePathes: { ...state.directoryImagePathes, [filepath]: imagePath } })
      await dispatch('loadDirectoryImages')
    }
  },
  mutations: {
    setLoading (state, { loading }) {
      state.loading = loading
    },
    setFiles (state, { files }) {
      state.files = files
    },
    setFile (state, { filepath, file }) {
      state.files = state.files.map((current) => current.path !== filepath ? current : { ...current, ...file })
    },
    setSelectedFilepath (state, { selectedFilepath }) {
      state.selectedFilepath = selectedFilepath
    },
    setDirectoryInput (state, { directoryInput }) {
      state.directoryInput = directoryInput
    },
    setQuery (state, { query }) {
      state.query = query
    },
    setQueryInput (state, { queryInput }) {
      state.queryInput = queryInput
    },
    setDisplay (state, { display }) {
      state.display = display
    },
    setHistory (state, { history, index }) {
      state.histories = [
        ...state.histories.slice(0, index),
        history,
        ...state.histories.slice(index + 1, state.histories.length)
      ]
    },
    setHistories (state, { histories }) {
      state.histories = histories
    },
    setHistoryIndex (state, { historyIndex }) {
      state.historyIndex = historyIndex
    },
    setOrder (state, { order, directory }) {
      state.orders = {
        ...state.orders,
        [directory]: order
      }
    },
    setDirectoryImagePathes (state, { directoryImagePathes }) {
      state.directoryImagePathes = directoryImagePathes
    },
    setImageLoading (state, { imageLoading }) {
      state.imageLoading = imageLoading
    }
  }
}

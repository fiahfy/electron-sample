import fs from 'fs'
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

let watcher = null

export default {
  namespaced: true,
  state: {
    loading: false,
    files: [],
    selectedFilepath: '',
    directoryInput: '',
    query: '',
    queryInput: '',
    histories: [],
    historyIndex: -1,
    orders: {}
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
      return getters.filteredFiles.findIndex((file) => getters.isSelectedFile({ filepath: file.path }))
    },
    isSelectedFile (state) {
      return ({ filepath }) => state.selectedFilepath === filepath
    }
  },
  actions: {
    initialize ({ dispatch, rootState }) {
      const dirpath = rootState.directory
      dispatch('changeDirectory', { dirpath, force: true })
    },
    upDirectory ({ dispatch, rootState }) {
      const dirpath = File.get(rootState.directory).dirname
      dispatch('changeDirectory', { dirpath })
    },
    changeHomeDirectory ({ dispatch }) {
      const dirpath = remote.app.getPath('home')
      dispatch('changeDirectory', { dirpath })
    },
    changeSelectedDirectory ({ dispatch, state }) {
      if (state.selectedFilepath && File.get(state.selectedFilepath).directory) {
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
    async loadFiles ({ commit, dispatch, rootGetters, rootState, state }) {
      if (state.loading) {
        return
      }
      commit('setLoading', { loading: true })
      try {
        if (watcher) {
          watcher.close()
        }
        watcher = fs.watch(rootState.directory, () => {
          dispatch('loadFiles')
        })
        const timer = setTimeout(() => {
          commit('setFiles', { files: [] })
        }, 1000)
        let files = await Worker.post(worker, { id: 'listFiles', data: [rootState.directory] })
        files = files.filter((file) => file.directory || rootGetters['settings/isAvailableFile']({ filepath: file.path }))
          .map((file) => {
            return {
              ...file,
              rating: rootGetters['rating/getRating']({ filepath: file.path })
            }
          })
        clearTimeout(timer)
        commit('setFiles', { files })
      } catch (e) {
        console.error(e)
        commit('setFiles', { files: [] })
      }
      dispatch('sortFiles')
      dispatch('focusTable')
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
      const file = File.get(filepath)
      if (file.directory) {
        dispatch('changeDirectory', { dirpath: file.path })
      } else {
        dispatch('viewFile', { filepath: file.path })
      }
    },
    viewFile ({ dispatch }, { filepath }) {
      const file = File.get(filepath)
      if (file.directory) {
        dispatch('showViewer', { dirpath: file.path }, { root: true })
      } else {
        dispatch('showViewer', { filepath: file.path }, { root: true })
      }
    },
    setScrollTop ({ commit, state }, { scrollTop }) {
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
    focusTable ({ dispatch }) {
      dispatch('focus', { selector: Selector.explorerTable }, { root: true })
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
    }
  }
}

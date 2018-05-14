import File from '../utils/file'

const sortReversed = {
  name: false,
  size: false,
  mtime: true
}

export default {
  namespaced: true,
  state: {
    items: [],
    query: '',
    queryInput: '',
    filepath: '',
    scrollTop: 0,
    sortOption: {
      key: 'name',
      descending: false
    }
  },
  actions: {
    initialize ({ dispatch, rootState }) {
      dispatch('loadItems')
    },
    loadItems ({ commit, dispatch, rootState }) {
      const items = rootState.bookmarks.map((bookmark) => {
        // TODO:
        const file = (typeof bookmark === 'string') ? (new File(bookmark).toObject()) : (new File(bookmark.path).toObject())
        file.bookmarked = true
        file.createdAt = new Date(bookmark.createdAt || 0)
        return file
      })
      commit('setItems', { items })
      dispatch('sortItems')
      dispatch('focusBookmarkTable', null, { root: true })
    },
    sortItems ({ commit, getters, state }) {
      const items = state.items.sort((a, b) => {
        let result = 0
        const key = state.sortOption.key
        if (a[key] > b[key]) {
          result = 1
        } else if (a[key] < b[key]) {
          result = -1
        }
        if (result === 0) {
          if (a.name > b.name) {
            result = 1
          } else if (a.name < b.name) {
            result = -1
          }
        }
        result = sortReversed[state.sortOption.key] ? -1 * result : result
        return state.sortOption.descending ? -1 * result : result
      })
      commit('setItems', { items })
    },
    bookmark ({ commit, dispatch, getters, rootState }, { filepath }) {
      if (!filepath || getters.isBookmarked({ filepath })) {
        return
      }
      const bookmarks = [
        ...rootState.bookmarks,
        {
          path: filepath,
          createdAt: new Date()
        }
      ]
      commit('setBookmarks', { bookmarks }, { root: true })
      dispatch('loadItems')
    },
    deleteBookmark ({ commit, dispatch, rootState }, { filepath }) {
      const bookmarks = rootState.bookmarks.filter((bookmark) => {
        // TODO:
        return (typeof bookmark === 'string') ? bookmark !== filepath : bookmark.path !== filepath
      })
      commit('setBookmarks', { bookmarks }, { root: true })
      dispatch('loadItems')
    },
    toggleBookmark ({ dispatch, getters }, { filepath }) {
      if (getters.isBookmarked({ filepath })) {
        dispatch('deleteBookmark', { filepath })
      } else {
        dispatch('bookmark', { filepath })
      }
    },
    select ({ commit }, { filepath }) {
      commit('setFilepath', { filepath })
    },
    selectIndex ({ dispatch, getters }, { index }) {
      if (index < 0 || index > getters.filteredItems.length - 1) {
        return
      }
      const filepath = getters.filteredItems[index].path
      dispatch('select', { filepath })
    },
    selectFirst ({ dispatch }) {
      dispatch('selectIndex', { index: 0 })
    },
    selectLast ({ dispatch, getters }) {
      dispatch('selectIndex', { index: getters.filteredItems.length - 1 })
    },
    selectPrevious ({ dispatch, getters }) {
      dispatch('selectIndex', { index: getters.selectedIndex - 1 })
    },
    selectNext ({ dispatch, getters }) {
      dispatch('selectIndex', { index: getters.selectedIndex + 1 })
    },
    search ({ commit, state }) {
      const query = state.queryInput
      commit('setQuery', { query })
    },
    changeSortKey ({ commit, dispatch, state }, { sortKey }) {
      let sortDescending = false
      if (state.sortOption.key === sortKey) {
        sortDescending = !state.sortOption.descending
      }
      const sortOption = { key: sortKey, descending: sortDescending }
      commit('setSortOption', { sortOption })
      dispatch('sortItems')
    },
    action ({ commit, dispatch, state }, { filepath }) {
      const file = new File(filepath)
      if (!file.exists()) {
        return
      }
      if (file.isDirectory()) {
        dispatch('explorer/changeDirectory', { dirpath: file.path }, { root: true })
        dispatch('changeRoute', { name: 'explorer' }, { root: true })
      } else {
        dispatch('showViewer', { filepath: file.path })
      }
    },
    showViewer ({ dispatch }, { filepath }) {
      const file = new File(filepath)
      if (file.isDirectory()) {
        const filepathes = File.listFiles(filepath, { recursive: true }).map(file => file.path)
        dispatch('viewer/show', { filepathes }, { root: true })
      } else {
        dispatch('viewer/show', { filepathes: [filepath] }, { root: true })
      }
    }
  },
  mutations: {
    setItems (state, { items }) {
      state.items = items
    },
    setQuery (state, { query }) {
      state.query = query
    },
    setQueryInput (state, { queryInput }) {
      state.queryInput = queryInput
    },
    setFilepath (state, { filepath }) {
      state.filepath = filepath
    },
    setScrollTop (state, { scrollTop }) {
      state.scrollTop = scrollTop
    },
    setSortOption (state, { sortOption }) {
      state.sortOption = sortOption
    }
  },
  getters: {
    filteredItems (state) {
      return state.items.concat().filter((file) => {
        return !state.query || file.name.toLowerCase().indexOf(state.query.toLowerCase()) > -1
      })
    },
    selectedIndex (state, getters) {
      return getters.filteredItems.findIndex((file) => {
        return getters.isSelected({ filepath: file.path })
      })
    },
    isSelected (state) {
      return ({ filepath }) => {
        return state.filepath === filepath
      }
    },
    isBookmarked (state, getters, rootState) {
      return ({ filepath }) => {
        return rootState.bookmarks.findIndex((bookmark) => {
          // TODO:
          return (typeof bookmark === 'string') ? bookmark === filepath : bookmark.path === filepath
        }) > -1
      }
    }
  }
}

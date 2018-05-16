import File from '../utils/file'

const reversed = {
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
    order: {
      by: 'name',
      descending: false
    }
  },
  actions: {
    initialize ({ dispatch, rootState }) {
      dispatch('loadItems')
    },
    loadItems ({ commit, dispatch, rootState }) {
      const items = rootState.bookmarks.map((bookmark) => {
        const file = new File(bookmark).toObject()
        file.bookmarked = true
        return file
      })
      commit('setItems', { items })
      dispatch('sortItems')
      dispatch('focusBookmarkTable', null, { root: true })
    },
    sortItems ({ commit, getters, state }) {
      const { by, descending } = state.order
      const items = state.items.sort((a, b) => {
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
      commit('setItems', { items })
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
    changeOrderBy ({ commit, dispatch, state }, { orderBy }) {
      let descending = false
      if (state.order.by === orderBy) {
        descending = !state.order.descending
      }
      const order = { by: orderBy, descending }
      commit('setOrder', { order })
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
    },
    toggleBookmark ({ dispatch }, { filepath }) {
      dispatch('toggleBookmark', { filepath }, { root: true })
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
    setOrder (state, { order }) {
      state.order = order
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
        return rootState.bookmarks.includes(filepath)
      }
    }
  }
}

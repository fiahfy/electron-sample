import { ipcRenderer, remote } from 'electron'

export const addIpcRendererListeners = (store) => {
  ipcRenderer.on('enterFullScreen', () => {
    store.commit('setFullScreen', { fullScreen: true })
  })
  ipcRenderer.on('leaveFullScreen', () => {
    store.commit('setFullScreen', { fullScreen: false })
  })
  ipcRenderer.on('showExplorer', () => {
    store.dispatch('changeRoute', { name: 'explorer' })
  })
  ipcRenderer.on('showBookmark', () => {
    store.dispatch('changeRoute', { name: 'bookmark' })
  })
  ipcRenderer.on('showSettings', () => {
    store.dispatch('changeRoute', { name: 'settings' })
  })
  ipcRenderer.on('openDirectory', () => {
    const filepathes = remote.dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (!filepathes.length) {
      return
    }
    const dirpath = filepathes[0]
    store.dispatch('openDirectory', { dirpath })
    store.dispatch('changeRoute', { name: 'explorer' })
  })
  ipcRenderer.on('openImages', () => {
    const filepathes = remote.dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] })
    if (!filepathes.length) {
      return
    }
    store.dispatch('openImages', { filepathes })
  })
  ipcRenderer.on('openLocation', () => {
    store.dispatch('focusLocationInput')
  })
  ipcRenderer.on('search', () => {
    store.dispatch('focusSearchInput')
  })
  ipcRenderer.on('backDirectory', () => {
    store.dispatch('explorer/backDirectory')
  })
  ipcRenderer.on('forwardDirectory', () => {
    store.dispatch('explorer/forwardDirectory')
  })
  ipcRenderer.on('changeParentDirectory', () => {
    store.dispatch('explorer/changeParentDirectory')
  })
  ipcRenderer.on('changeHomeDirectory', () => {
    store.dispatch('explorer/changeHomeDirectory')
  })
  ipcRenderer.on('openCurrentDirectory', () => {
    store.dispatch('explorer/openDirectory')
  })
  ipcRenderer.on('zoomIn', () => {
    store.dispatch('viewer/zoomIn')
  })
  ipcRenderer.on('zoomOut', () => {
    store.dispatch('viewer/zoomOut')
  })
  ipcRenderer.on('resetZoom', () => {
    store.dispatch('viewer/resetZoom')
  })
}

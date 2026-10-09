export function setupBusinessTableScroll(rootSelector) {
  let cleanups = []
  let observer

  const sync = () => {
    cleanups.forEach(cleanup => cleanup())
    cleanups = []
    document.querySelectorAll(`${rootSelector} .business-table`).forEach(table => {
      const bodyWrap = table.querySelector('.el-table__body-wrapper .el-scrollbar__wrap')
      const headerWrap = table.querySelector('.el-table__header-wrapper')
      if (!bodyWrap || !headerWrap) return
      const onScroll = () => { headerWrap.scrollLeft = bodyWrap.scrollLeft }
      bodyWrap.addEventListener('scroll', onScroll, { passive: true })
      onScroll()
      cleanups.push(() => bodyWrap.removeEventListener('scroll', onScroll))
    })
  }

  const root = document.querySelector(rootSelector)
  if (root && typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(() => sync())
    observer.observe(root, { childList: true, subtree: true })
  }
  sync()

  return {
    sync,
    dispose() {
      cleanups.forEach(cleanup => cleanup())
      cleanups = []
      observer?.disconnect()
    }
  }
}

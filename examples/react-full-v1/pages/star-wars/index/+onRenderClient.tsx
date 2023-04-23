export default onRenderClient

import './css/index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { PageShell } from '../../../renderer/PageShell'
import { getPageTitle } from '../../../renderer/getPageTitle'
import type { PageContextClient } from '../../../renderer/types'

let root: ReactDOM.Root
async function onRenderClient(pageContext: PageContextClient) {
  const { Page, pageProps } = pageContext
  const page = (
    <PageShell pageContext={pageContext}>
      <Page {...pageProps} />
    </PageShell>
  )
  const container = document.getElementById('page-view')!
  if (pageContext.isHydration) {
    root = ReactDOM.hydrateRoot(container, page)
  } else {
    if (!root) {
      root = ReactDOM.createRoot(container)
    }
    root.render(page)
  }
  document.title = getPageTitle(pageContext)
}

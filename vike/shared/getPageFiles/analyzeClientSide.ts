export { analyzeClientSide }

import { getConfigValue } from '../page-configs/utils.js'
import type { PageConfigRuntime } from '../page-configs/PageConfig.js'
import type { PageFile } from './getPageFileObject.js'
import { analyzePageClientSide } from './analyzePageClientSide.js'

function analyzeClientSide(
  pageConfig: PageConfigRuntime | null,
  pageFilesAll: PageFile[],
  pageId: string
): { isClientSideRenderable: boolean; isClientRouting: boolean } {
  // V1 design
  if (pageConfig) {
    const isClientRouting = getConfigValue(pageConfig, 'clientRouting', 'boolean')?.value ?? false
    const isClientSideRenderable = getConfigValue(pageConfig, 'isClientSideRenderable', 'boolean')?.value ?? false
    return { isClientSideRenderable, isClientRouting }
  } else {
    // TODO/v1-release:
    //  - remove V0.4 implementation
    //  - globally rename isHtmlOnly to !isClientSideRenderable
    // V0.4 design
    const { isHtmlOnly, isClientRouting } = analyzePageClientSide(pageFilesAll, pageId)
    return { isClientSideRenderable: !isHtmlOnly, isClientRouting }
  }
}

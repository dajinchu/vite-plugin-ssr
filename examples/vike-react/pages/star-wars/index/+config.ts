import type { Config } from 'vike/types'

// Default configs (can be overriden by pages)
export default {
  mything: true,
  meta: {
    mything: { env: { client: true } }
  }
} satisfies Config

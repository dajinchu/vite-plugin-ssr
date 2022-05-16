import { slice } from './slice'
import { assert, assertUsage } from './assert'

export { parseUrl }
export { isParsable }

export { prependBaseUrl }
export { assertBaseUrl }
export { assertUsageBaseUrl }
export { normalizeBaseUrl }

function isParsable(url: string): boolean {
  // `parseUrl()` doesn't work with these URLs
  if (url.startsWith('//')) {
    return false
  }

  // `parseUrl()` works with these URLs
  if (
    url.startsWith('/') ||
    url.startsWith('http') ||
    url.startsWith('.') ||
    url.startsWith('?') ||
    // Less sure about `#some-hash` URLs, but should work in principle
    url.startsWith('#') ||
    url === ''
  ) {
    return true
  }

  // assertUsage(false, `Unexpected URL format ${url}`)
  return false
}

function parseUrl(
  url: string,
  baseUrl: string,
): {
  origin: null | string
  pathnameWithoutBaseUrl: string
  pathnameWithBaseUrl: string
  hasBaseUrl: boolean
  search: Record<string, string>
  searchString: null | string
  hash: string
  hashString: null | string
} {
  assert(isParsable(url), { url })
  assert(baseUrl.startsWith('/'), { url, baseUrl })

  // Hash
  const [urlWithoutHash, ...hashList] = url.split('#')
  assert(urlWithoutHash !== undefined)
  const hashString = ['', ...hashList].join('#') || null
  assert(hashString === null || hashString.startsWith('#'))
  const hash = hashString === null ? '' : decodeSafe(hashString.slice(1))

  // Search
  const [urlWithoutSearch, ...searchList] = urlWithoutHash.split('?')
  assert(urlWithoutSearch !== undefined)
  const searchString = ['', ...searchList].join('?') || null
  assert(searchString === null || searchString.startsWith('?'), { url, searchString })
  const search = Object.fromEntries(Array.from(new URLSearchParams(searchString || '')))

  // Origin + pathname
  const { origin, pathnameResolved } = parseWithNewUrl(urlWithoutSearch)
  assert(origin === null || origin === decodeSafe(origin), { origin }) // AFAICT decoding the origin is useless
  const pathnameWithBaseUrl = pathnameResolved
  assert(pathnameWithBaseUrl.startsWith('/'), { url, pathnameWithBaseUrl })
  assert(origin === null || url.startsWith(origin), { url, origin })

  // `pathnameOriginal`
  const pathnameOriginal = urlWithoutSearch.slice((origin || '').length)
  {
    const urlRecreated = `${origin || ''}${pathnameOriginal}${searchString || ''}${hashString || ''}`
    assert(url === urlRecreated, { url, urlRecreated })
  }

  // Base URL
  let { pathnameWithoutBaseUrl, hasBaseUrl } = analyzeBaseUrl(pathnameWithBaseUrl, baseUrl)
  pathnameWithoutBaseUrl = decodeSafe(pathnameWithoutBaseUrl)

  assert(pathnameWithBaseUrl.startsWith('/'))
  assert(pathnameWithoutBaseUrl.startsWith('/'))
  return { origin, pathnameWithoutBaseUrl, pathnameWithBaseUrl, hasBaseUrl, search, searchString, hash, hashString }
}
function decodeSafe(urlComponent: string): string {
  try {
    return decodeURIComponent(urlComponent)
  } catch {}
  try {
    return decodeURI(urlComponent)
  } catch {}
  return urlComponent
}
function parseWithNewUrl(url: string) {
  let origin: string | null
  let pathnameResolved: string
  try {
    // `new URL(url)` throws an error if `url` doesn't have an origin
    const urlParsed = new URL(url)
    origin = urlParsed.origin
    pathnameResolved = urlParsed.pathname
  } catch (err) {
    // `url` has no origin
    origin = null
    // In the browser, this is the Base URL of the current URL
    const currentBase =
      typeof window !== 'undefined' &&
      // We need to access safely in case the user sets `window` in Node.js
      window?.document?.baseURI
    // We cannot resolve relative URLs in Node.js
    assert(currentBase || !url.startsWith('.'))
    // Is there any other kind of URLs that vite-plugin-ssr should support?
    assert(currentBase || url.startsWith('/') || url.startsWith('?'))
    const fakeBase = currentBase || 'http://fake-origin.example.org'
    // Supports:
    //  - `url === '/absolute/path'`
    //  - `url === './relative/path'`
    //  - `url === '?queryWithoutPath'`
    const urlParsed = new URL(url, fakeBase)
    pathnameResolved = urlParsed.pathname
  }

  assert(pathnameResolved.startsWith('/'), { url, pathnameResolved })
  // The URL pathname should be the URL without origin, query string, and hash.
  //  - https://developer.mozilla.org/en-US/docs/Web/API/URL/pathname
  assert(pathnameResolved === pathnameResolved.split('?')[0]!.split('#')[0])

  return { origin, pathnameResolved }
}

function assertUsageBaseUrl(baseUrl: string, usageErrorMessagePrefix: string = '') {
  assertUsage(
    !baseUrl.startsWith('http'),
    usageErrorMessagePrefix +
      '`base` is not allowed to start with `http`. Consider using `baseAssets` instead, see https://vite-plugin-ssr/base-url',
  )
  assertUsage(
    baseUrl.startsWith('/'),
    usageErrorMessagePrefix + 'Wrong `base` value `' + baseUrl + '`; `base` should start with `/`.',
  )
  assertBaseUrl(baseUrl)
}

function assertBaseUrl(baseUrl: string) {
  assert(baseUrl.startsWith('/'))
}

function assertUrlPathname(urlPathname: string) {
  assert(urlPathname.startsWith('/'))
  assert(!urlPathname.includes('?'))
  assert(!urlPathname.includes('#'))
}

function analyzeBaseUrl(
  urlPathnameWithBase: string,
  baseUrl: string,
): { pathnameWithoutBaseUrl: string; hasBaseUrl: boolean } {
  assertUrlPathname(urlPathnameWithBase)
  assertBaseUrl(baseUrl)

  // Mutable
  let urlPathname = urlPathnameWithBase

  assert(urlPathname.startsWith('/'))
  assert(baseUrl.startsWith('/'))

  if (baseUrl === '/') {
    const pathnameWithoutBaseUrl = urlPathnameWithBase
    return { pathnameWithoutBaseUrl, hasBaseUrl: true }
  }

  // Support `url === '/some-base-url' && baseUrl === '/some-base-url/'`
  let baseUrlNormalized = baseUrl
  if (baseUrl.endsWith('/') && urlPathname === slice(baseUrl, 0, -1)) {
    baseUrlNormalized = slice(baseUrl, 0, -1)
    assert(urlPathname === baseUrlNormalized)
  }

  if (!urlPathname.startsWith(baseUrlNormalized)) {
    const pathnameWithoutBaseUrl = urlPathnameWithBase
    return { pathnameWithoutBaseUrl, hasBaseUrl: false }
  }
  assert(urlPathname.startsWith('/') || urlPathname.startsWith('http'))
  assert(urlPathname.startsWith(baseUrlNormalized))
  urlPathname = urlPathname.slice(baseUrlNormalized.length)
  if (!urlPathname.startsWith('/')) urlPathname = '/' + urlPathname

  assert(urlPathname.startsWith('/'))
  return { pathnameWithoutBaseUrl: urlPathname, hasBaseUrl: true }
}

function prependBaseUrl(url: string, baseUrl: string): string {
  if (isBaseAssets(baseUrl)) {
    const baseAssets = baseUrl
    const baseAssetsNormalized = normalizeBaseAssets(baseAssets)
    assert(!baseAssetsNormalized.endsWith('/'))
    assert(url.startsWith('/'))
    return `${baseAssetsNormalized}${url}`
  }
  assertBaseUrl(baseUrl)

  const baseUrlNormalized = normalizeBaseUrl(baseUrl)

  if (baseUrlNormalized === '/') return url

  assert(!baseUrlNormalized.endsWith('/'))
  assert(url.startsWith('/'))
  return `${baseUrlNormalized}${url}`
}

function normalizeBaseUrl(baseUrl: string) {
  let baseUrlNormalized = baseUrl
  if (baseUrlNormalized.endsWith('/') && baseUrlNormalized !== '/') {
    baseUrlNormalized = slice(baseUrlNormalized, 0, -1)
  }
  // We can and should expect `baseUrl` to not contain `/` doublets.
  assert(!baseUrlNormalized.endsWith('/') || baseUrlNormalized === '/')
  return baseUrlNormalized
}

function isBaseAssets(base: string) {
  if (base.startsWith('http')) {
    return true
  }
  return false
}
function normalizeBaseAssets(baseAssets: string) {
  let baseAssetsNormalized = baseAssets
  if (baseAssetsNormalized.endsWith('/')) {
    baseAssetsNormalized = slice(baseAssetsNormalized, 0, -1)
  }
  assert(!baseAssetsNormalized.endsWith('/'))
  return baseAssetsNormalized
}

export { testRun }

import { page, test, expect, run, fetchHtml, partRegex, getServerUrl, testScreenshotFixture } from '@brillout/test-e2e'

function testRun(cmd: 'pnpm run dev' | 'pnpm run preview') {
  {
    // Preview => `npm run preview` takes a long time
    // Dev => `Learn more collapsible` takes a long time
    const additionalTimeout = 120 * 1000
    run(cmd, { additionalTimeout, doNotFailOnWarning: true })
  }

  test('page content is rendered to HTML', async () => {
    {
      const html = await fetchHtml('/')
      expect(html).toContain('<meta name="description" content="DocPress Demo" />')
      expect(html).toContain('Praesent eu augue lacinia, tincidunt purus nec, ultrices ante.')
      expect(html).toMatch(partRegex`<h2>${/[^\/]+/}Feature 2</h2>`)
    }
    {
      const html = await fetchHtml('/about')
      expect(html).toContain('<title>About | DocPress Demo</title>')
      expect(html).toContain('<h1>About</h1>')
      expect(html).toContain('<p>This demo is for developing DocPress.</p>')
    }
  })

  test('Learn more collapsible', async () => {
    const collapsibleText = 'More content for Feature 2.'
    const sectionHeading = 'Feature 2'
    await page.goto(getServerUrl() + '/')
    await page.waitForFunction(() => (window as any).__docpress_hydrationFinished)
    const selector = `p:has-text("${collapsibleText}")`
    const locator = page.locator(selector)
    expect(await locator.count()).toBe(1)
    expect(await locator.isHidden()).toBe(true)
    await page.locator(`h2:has-text("${sectionHeading}")`).click()
    await page.waitForSelector(selector, { state: 'visible' })
    expect(await locator.isHidden()).toBe(false)
    await page.locator(`h2:has-text("${sectionHeading}")`).click()
    await page.waitForSelector(selector, { state: 'hidden' })
    expect(await locator.isHidden()).toBe(true)
    await page.locator(`h2:has-text("${sectionHeading}")`).click()
    await page.waitForSelector(selector, { state: 'visible' })
    expect(await locator.isHidden()).toBe(false)
  })

  test('screenshot fixture', async () => {
    await testScreenshotFixture({ doNotTestLocally: true })
  })
}

import { expect, test } from '@playwright/test'

test('selects and publishes an institutional image without changing the hero or rebuilding', async ({
  page,
  baseURL,
  isMobile,
}) => {
  test.skip(
    process.env.CMS_IMAGE_TESTS !== 'true',
    'Requires disposable fixtures from pnpm test:cms',
  )
  test.skip(
    isMobile,
    'Admin editing is exercised once; public responsive checks run on both projects',
  )
  test.setTimeout(120_000)
  expect(['127.0.0.1', 'localhost']).toContain(new URL(baseURL!).hostname)
  expect(new URL(process.env.DATABASE_URL!).pathname).toMatch(/_test$/)

  const headers = { Origin: baseURL! }
  const login = await page.request.post('/api/users/login', {
    headers,
    data: { email: 'cms-images@example.test', password: 'cms-images-test-password' },
  })
  expect(login.ok()).toBe(true)
  const uploads = await page.request.get('/api/media?limit=20')
  const media = (await uploads.json()).docs as { id: number; alt: string; url: string }[]
  const replacement = media.find((item) => item.alt === 'Orquestra substituta')!
  expect(replacement).toBeTruthy()

  const reset = await page.request.post('/api/globals/home', {
    headers,
    data: { aboutImage: null, _status: 'published' },
  })
  expect(reset.ok()).toBe(true)
  await page.goto('/admin/globals/home')
  const field = page.locator('#field-aboutImage')
  await field.getByRole('button', { name: /choose from existing/i }).click()
  await page.getByText('Orquestra substituta', { exact: true }).last().click()
  await expect(field).toContainText('replacement.png')
  await page.getByRole('button', { name: /^publish$|publish changes/i }).click()
  await expect(page.getByText(/successfully|sucesso/i).first()).toBeVisible()

  await page.goto('/')
  await expect(page.locator('.hero-media img')).toHaveAttribute('alt', 'Orquestra existente')
  const institutional = page.locator('.editorial-image img')
  await expect(institutional).toHaveAttribute('alt', 'Orquestra substituta')
  const optimized = new URL((await institutional.getAttribute('src'))!, baseURL)
  expect(optimized.searchParams.get('url')).toMatch(/^\/api\/media\/file\//)
  expect((await page.request.get(optimized.toString())).status()).toBe(200)

  // Publish a second relationship through the API, then read the already-running build.
  const changed = await page.request.post('/api/globals/home', {
    headers,
    data: { aboutImage: 100, _status: 'published' },
  })
  expect(changed.ok()).toBe(true)
  await page.reload()
  await expect(institutional).toHaveAttribute('alt', 'Orquestra existente')
  await expect(page.locator('.hero-media img')).toHaveAttribute('alt', 'Orquestra existente')
  const removed = await page.request.post('/api/globals/home', {
    headers,
    data: { aboutImage: null, _status: 'published' },
  })
  expect(removed.ok()).toBe(true)
  await page.reload()
  await expect(institutional).toHaveAttribute('src', /orchestra-hall.webp/)
  await expect(page.locator('.hero-media img')).toHaveAttribute('alt', 'Orquestra existente')

  // Logo and SEO defaults are consumed on the next request as well.
  const settings = await page.request.post('/api/globals/site-settings', {
    headers,
    data: { logo: replacement.id, socialImage: replacement.id },
  })
  expect(settings.ok()).toBe(true)
  await page.goto('/contato')
  await expect(page.locator('.brand-logo')).toHaveCount(2)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    replacement.url,
  )
  const seo = await page.request.post('/api/globals/home', {
    headers,
    data: { meta: { image: replacement.id }, _status: 'published' },
  })
  expect(seo.ok()).toBe(true)
  await page.goto('/')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    replacement.url,
  )
  const restored = await page.request.post('/api/globals/site-settings', {
    headers,
    data: { logo: null },
  })
  expect(restored.ok()).toBe(true)
  await page.reload()
  await expect(page.locator('.brand-mark')).toHaveCount(2)
})

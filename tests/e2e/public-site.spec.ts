import { expect, test } from '@playwright/test'

test('renders the public home and exposes the navigation', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: /agenda/i }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /notícias/i }).first()).toBeVisible()
})

test('protects the administration area with Payload authentication', async ({ page }) => {
  await page.goto('/admin')

  await expect(page).toHaveURL(/\/admin\/(login|create-first-user)/)
  await expect(page.getByRole('heading', { name: /welcome|login|entrar/i })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
})

test('reports liveness without querying application content', async ({ request }) => {
  const response = await request.get('/api/health/live')
  expect(response.ok()).toBe(true)
  await expect(response.json()).resolves.toMatchObject({ status: 'ok' })
})

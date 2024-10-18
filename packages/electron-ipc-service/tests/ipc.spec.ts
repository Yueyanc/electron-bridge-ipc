import { _electron as electron, test } from '@playwright/test'

test('test', async () => {
  const electronApp = await electron.launch({ args: ['./main.js'] })
})

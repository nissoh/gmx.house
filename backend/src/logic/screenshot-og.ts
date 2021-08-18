import puppeteer from 'puppeteer-core'


async function runPuppeteer() {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
    defaultViewport: {
      width: 1000,
      height: 500
    }
  })

  const page = await browser.newPage()

  return { browser, page }
}

export async function screenPage(url: string) {

  const instance = await runPuppeteer()

  await instance.page.goto(url, { waitUntil: 'networkidle0' })

  const file = await instance.page.screenshot({
    type: 'jpeg',
    quality: 81,
    fullPage: false
  })

  await instance.browser.close()

  return file
}
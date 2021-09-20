import puppeteer from 'puppeteer'


const executablePath =
  process.platform === "win32"
    ? "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
    : process.platform === "linux"
      ? "/usr/bin/google-chrome"
      : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

async function runPuppeteer() {
  
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    // executablePath,
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
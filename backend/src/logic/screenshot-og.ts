import puppeteer from 'puppeteer-core'

// helper function just in case to give a page some time to render things after loading


const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))


const exePath =
  process.platform === "win32"
    ? "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
    : process.platform === "linux"
      ? "/usr/bin/google-chrome"
      : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

async function runPuppeteer(isDev: boolean) {
  // let options
  // if (isDev) {
  //   options = {
  //     args: [],
  //     executablePath: exePath,
  //     headless: true,
  //   }
  // } else {
  //   options = {
  //     args: chrome.args,
  //     executablePath: await chrome.executablePath,
  //     headless: chrome.headless,
  //   }
  // }

  const browser = await puppeteer.launch({
    args: [],
    executablePath: exePath,
    headless: true,
    defaultViewport: {
      width: 1000,
      height: 500
    }
  })

  const page = await browser.newPage()

  return { browser, page }
}
// const puppeteerInstance = runPuppeteer(true)

export async function screenPage(url: string) {

  const instance = await runPuppeteer(true)

  await instance.page.goto(url, { waitUntil: 'networkidle0' })

  const file = await instance.page.screenshot({
    type: 'jpeg',
    quality: 81,
    fullPage: false
  })

  await instance.browser.close()

  return file
}
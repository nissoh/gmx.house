import express from 'express'
import http from 'http'
import puppeteer from 'puppeteer'
import Router from 'express-promise-router'

const port = process.env.PORT


async function runPuppeteer() {
  
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    // executablePath,
    headless: true,
    defaultViewport: {
      width: 800,
      height: 418
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
    quality: 97,
    fullPage: false
  })

  await instance.browser.close()

  return file
}


const app = express()

const server = http.createServer(app)




export const openGraphScreenshot = Router()

openGraphScreenshot.get('/og-trade-preview', async (req, res) => {
  const tradeType = req.query.tradeType
  const tradeId = req.query.tradeId
  const startDate = req.query.startDate
  const endDate = req.query.endDate
  const token = req.query.token

  const fragments = [tradeType, tradeId].filter(s => s && typeof s === 'string')
  if (fragments.length !== 2) {
    return res.status(403).json({
      message: `invalid query params. tradeType: ${tradeType} tradeId: ${tradeId}`
    })
  }

  const selfRef = `${process.env.APP}/card/${token}-${tradeType}-${startDate}-${endDate}/${tradeId}`
  // const file = await screenPage(`http://localhost:3000/card/0x4CC6d33B7605809wc1E5DBb2198758a0010A67E00`)
  const file = await screenPage(selfRef)
  
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
  res.setHeader('Content-Type', `image/jpeg`)
  res.end(file)
})


app.use(openGraphScreenshot)


server.listen(port, () => {
  console.log(`express started at http://localhost:${port}`)
})
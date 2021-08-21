import Router from 'express-promise-router'
import { screenPage } from './screenshot-og'


export const openGraphScreenshot = Router()

openGraphScreenshot.get('/og-account', async (req, res) => {
  const account = req.query.account

  if (typeof account !== 'string') {
    return res.status(403).json({ message: 'Invalid account' })
  }

  const selfRef = `http://${req.hostname}/card/${account}`
  // const file = await screenPage(`http://localhost:3000/card/0x4CC6d33B7605809c1E5DBb2198758a0010A67E00`)
  console.log(`http://${req.hostname}:${process.env.PORT}/card/${account}`)
  const file = await screenPage(selfRef)
  
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
  res.setHeader('Content-Type', `image/jpeg`)
  res.end(file)
})

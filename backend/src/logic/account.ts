import Router from 'express-promise-router'

import { EM } from '../server'
import { dto } from '../dto'
import { AccountHistoricalDataApi } from 'gambit-middleware'


export const accountApi = Router()



accountApi.post('/account-historical-pnl', async (req, res) => {
  const params: AccountHistoricalDataApi = req.body

  const aggTradeList = await EM.find(
    dto.AggregatedTrade, {
      account: params.account,
    },
    {
      populate: true
    }
  )

  res.json(aggTradeList)
})




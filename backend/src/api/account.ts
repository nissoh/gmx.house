import Router from 'express-promise-router'

import { EM } from '../server'
import { dto } from '../dto'
import { HistoricalDataApi } from './types'


export const accountApi = Router()


export interface AccountHistoricalDataApi extends HistoricalDataApi {
  account: string
}

accountApi.post('/account-historical-pnl', async (req, res) => {
  const params: AccountHistoricalDataApi = req.body

  const closedPositionsQuery = EM.find(
    dto.PositionClose, {
      account: params.account,
    })
  const increasePositionsQuery = EM.find(
    dto.PositionIncrease, {
      account: params.account,
    })

  const closedPositions = await closedPositionsQuery
  const increasePositions = await increasePositionsQuery

  res.json({ closedPositions, increasePositions })
})




import Router from 'express-promise-router'

import { EM } from '../server'
import { dto } from '../dto'
import { HistoricalDataApi } from './types'


export const leaderboardApi = Router()



export interface LeaderboardApi extends HistoricalDataApi {
}


function getTimespanParams(params: HistoricalDataApi) {
  if (params.timeRange) {
    const [start, end] = params.timeRange
    const startDate = new Date(start)
    const endDate = new Date(end)

    return { $gt: startDate, $lt: endDate, }
  }

  return {}
}

leaderboardApi.post('/leaderboard', async (req, res) => {
  const queryParams: LeaderboardApi = req.body

  const modelList = await EM.find(
    dto.PositionClose, {
      createdAt: getTimespanParams(queryParams),
    })
  res.json(modelList)
})

leaderboardApi.post('/liquidations', async (req, res) => {
  const queryParams: HistoricalDataApi = req.body

  const modelList = await EM.find(
    dto.PositionLiquidated, {
      createdAt: getTimespanParams(queryParams),
    })
  res.json(modelList)
})

// leaderboardApi.get('/liquidations', async (req, res) => {
//   const modelList = await EM.find(dto.PositionClose, {})
//   res.json(modelList)
// })



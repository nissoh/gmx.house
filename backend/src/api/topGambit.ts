import Router from 'express-promise-router'

import { EM } from '../server'
import { dto } from '../dto'
import { HistoricalDataApi } from './types'


export const leaderboardApi = Router()



export interface LeaderboardApi extends HistoricalDataApi {
}


function getTimespanParams(params: HistoricalDataApi) {
  return params.timeRange
    ? {
      $gt: new Date(params.timeRange[0]),
      $lt: new Date(params.timeRange[1]),
    }
    : null
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



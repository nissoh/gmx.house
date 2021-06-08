import Router from 'express-promise-router'

import { EM } from '../server'
import { dto } from '../dto'
import { HistoricalDataApi } from './types'


export const leaderboardApi = Router()



export interface LeaderboardApi extends HistoricalDataApi {
}

leaderboardApi.post('/leaderboard', async (req, res) => {
  const queryParams: LeaderboardApi = req.body

  const modelList = await EM.find(
    dto.PositionClose, {
      createdAt: queryParams.timeRange
        ? {
          $gt: new Date(queryParams.timeRange[0]),
          $lt: new Date(queryParams.timeRange[1]),
        }
        : null,
    })
  res.json(modelList)
})

// leaderboardApi.get('/liquidations', async (req, res) => {
//   const modelList = await EM.find(dto.PositionClose, {})
//   res.json(modelList)
// })



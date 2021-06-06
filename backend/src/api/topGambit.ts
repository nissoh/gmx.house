import Router from 'express-promise-router'

import { EM } from '../server'
import { dto } from '../dto'


export const leaderboardApi = Router()


const inceptionTime = new Date(0)

export interface LeaderboardApiQueryParams {
  startTime?: number
  endTime?: number
}

leaderboardApi.post('/leaderboard', async (req, res) => {
  const queryParams: LeaderboardApiQueryParams = req.body
  const startTime = queryParams.startTime ? new Date(Number(queryParams.startTime)) : inceptionTime
  const endTime = queryParams.endTime ? new Date(Number(queryParams.endTime)) : new Date()

  const modelList = await EM.find(
    dto.PositionClose, {
      createdAt: {
        $gt: startTime,
        $lt: endTime,
      },
    })
  res.json(modelList)
})

// leaderboardApi.get('/liquidations', async (req, res) => {
//   const modelList = await EM.find(dto.PositionClose, {})
//   res.json(modelList)
// })



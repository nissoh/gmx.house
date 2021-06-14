import Router from 'express-promise-router'

import { EM } from '../server'
import { dto } from '../dto'
import { HistoricalDataApi } from './types'
import { PositionClose, PositionLiquidated } from '../dto/Vault'
import { timeTzOffset } from 'gambit-middleware'

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

export interface Tournament {
  closedPositions: PositionClose[]
  liquidatedPositions: PositionLiquidated[]
}

leaderboardApi.get('/tournament/0', async (req, res) => {
  const start = Date.UTC(2021, 5, 14, 12, 0, 0, 0)
  const end = Date.UTC(2021, 5, 30, 12, 0, 0, 0)


  const closedPositions = await EM.find(
    dto.PositionClose, {
      createdAt: getTimespanParams({timeRange: [start, end]}),
  })
  

  const liquidatedPositions = await EM.find(
    dto.PositionLiquidated, {
    createdAt: getTimespanParams({timeRange: [start, end]}),
  })
  
  const tournament: Tournament = {
    closedPositions, liquidatedPositions
  }
  res.json(tournament)
})

leaderboardApi.post('/liquidations', async (req, res) => {
  const queryParams: HistoricalDataApi = req.body

  const modelList = await EM.find(
    dto.PositionLiquidated, {
      createdAt: getTimespanParams(queryParams),
    })
  res.json(modelList)
})




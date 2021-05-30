import Router from 'express-promise-router'
import { QueryOrder } from '@mikro-orm/core'

import { EM } from '../server'
import { dto } from '../dto'


export const leaderboardApi = Router()


leaderboardApi.get('/leaderboard', async (req, res) => {
  const modelList = await EM.find(dto.PositionClose, {})
  res.json(modelList)
})



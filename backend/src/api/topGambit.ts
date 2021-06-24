import Router from 'express-promise-router'

import { EM } from '../server'
import { dto } from '../dto'
import { HistoricalDataApi } from './types'
import { PositionClose, PositionLiquidated } from '../dto/Vault'
import { getPositionFee, groupByMapMany, intervalInMsMap } from 'gambit-middleware'
import { Claim } from '../dto/Account'
import { BaseEntity } from '../dto/BaseEntity'
import { timespanPassedSinceInvoke } from '../utils'

export const leaderboardApi = Router()


export interface Account {
  address: string
  settledPositionCount: number
  profitablePositionsCount: number
  realisedPnl: bigint
  claim: Claim | null
}


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



const cacheTimePassFn = timespanPassedSinceInvoke(intervalInMsMap.MIN15) // 15min cache

let cache: Account[] = []


leaderboardApi.get('/tournament/0', async (req, res) => {

  const cacheTimespanPasses = cacheTimePassFn()

  if (!cacheTimespanPasses) {
    return res.json(cache)
  }

  const start = Date.UTC(2021, 5, 14, 12, 0, 0, 0)
  const end = Date.UTC(2021, 5, 30, 12, 0, 0, 0)

  const initPositions = await EM.find(
    dto.PositionIncrease, {
      createdAt: getTimespanParams({ timeRange: [start, end] }),
    }
  )

  const closedPositions = await EM.find(
    dto.PositionClose, {
      createdAt: getTimespanParams({ timeRange: [start, end] }),
    }
  )

  const liquidatedPositions = await EM.find(
    dto.PositionLiquidated, {
      createdAt: getTimespanParams({ timeRange: [start, end] }),
    }
  )
  

  const sortByCreartion = (a: BaseEntity, b: BaseEntity): number => a.createdAt.getTime() - b.createdAt.getTime()
  const initPositionsMap = groupByMapMany(initPositions.sort(sortByCreartion), a => a.account)
  const settledPositionsMap = groupByMapMany([...closedPositions, ...liquidatedPositions].sort(sortByCreartion), a => a.account)


  const topMap = Object.entries(initPositionsMap).reduce((seed, [address, initPosList]) => {

    const settledPositionList = settledPositionsMap[address]

    if (!settledPositionList) {
      return seed
    }

    const account = {
      address: address,
      settledPositionCount: settledPositionList.length,
      claim: null,
      profitablePositionsCount: 0,
      realisedPnl: 0n,
    }

    settledPositionList.forEach((pos) => {
      const initialInitPos = initPosList.find(x => x.indexToken === pos.indexToken)

      if (!initialInitPos || pos.createdAt.getTime() < initialInitPos.createdAt.getTime()) {
        return
      }

      if (pos instanceof PositionLiquidated) {
        account.realisedPnl -= pos.collateral
      } else {
        const fee = getPositionFee(pos.size, pos.entryFundingRate, pos.entryFundingRate)
        
        account.realisedPnl += pos.realisedPnl + -fee

        if (pos.realisedPnl > 0n) {
          account.profitablePositionsCount++
        }
      }
    })

    seed.push(account)

    return seed
  }, [] as Account[])

      

  const allAccounts = Object.values(topMap)
    .sort((a, b) => Number(b.realisedPnl - a.realisedPnl))
    .map(d => ({ ...d, realisedPnl: d.realisedPnl.toString() }))

  // @ts-ignore
  cache = allAccounts

  res.json(allAccounts)
})

leaderboardApi.post('/liquidations', async (req, res) => {
  const queryParams: HistoricalDataApi = req.body

  const modelList = await EM.find(
    dto.PositionLiquidated, {
      createdAt: getTimespanParams(queryParams),
    })
  res.json(modelList)
})




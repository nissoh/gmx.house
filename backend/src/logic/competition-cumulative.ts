import { O } from "@aelea/core"
import { awaitPromises, map } from "@most/core"
import { fromJson, pagingQuery, groupByMap, groupByMapMany, ITrade, TradeStatus, IChainParamApi, intervalInMsMap, IPagePositionParamApi, ITimerangeParamApi, unixTimestampNow, IPricefeed, calculatePositionDelta, isTradeOpen, isTradeSettled } from "@gambitdao/gmx-middleware"
import { IAccountLadderSummary } from "common"
import { EM } from '../server'
import { Claim } from "./dto"
import { cacheMap } from "../utils"
import { competitionAccountListQuery } from "./queries"
import { fetchHistoricTrades, graphMap } from "./api"
import { gql, TypedDocumentNode } from "@urql/core"


const bigNumberForPriority = 10n ** 50n

const createCache = cacheMap({})

export const competitionNov2021LowestCumulative = O(
  map((queryParams: IChainParamApi & IPagePositionParamApi & ITimerangeParamApi) => {
    const query = createCache('tradeByTimespan' + queryParams.from + queryParams.chain, intervalInMsMap.MIN5, async () => {

      const timeSlot = Math.floor(Math.min(unixTimestampNow(), queryParams.to) / intervalInMsMap.MIN5)
      const timestamp = timeSlot * intervalInMsMap.MIN5 - intervalInMsMap.MIN5

      const from = queryParams.from
      const to = queryParams.to

      const historicTradeListQuery = fetchHistoricTrades(competitionAccountListQuery, { from, to, offset: 0, pageSize: 1000 }, queryParams.chain, 0, (res) => res.trades)

      const claimListQuery = EM.find(Claim, {})

      const competitionPricefeedMap: TypedDocumentNode<{ pricefeeds: IPricefeed[] }, {}> = gql`
      {
        pricefeeds(where: { timestamp_gte: ${timestamp.toString()} }) {
          id
          timestamp
          tokenAddress
          c
          interval
        }
      }
    `

      const priceMapQuery = graphMap[queryParams.chain](competitionPricefeedMap, {}).then(res => {
        const list = groupByMap(res.pricefeeds, item => item.tokenAddress)
        return list
      })

      const historicTradeList = await historicTradeListQuery
      const priceMap = await priceMapQuery
      const claimList = await claimListQuery
      
      const settledList: ITrade[] = historicTradeList.map(fromJson.toTradeJson)
      const claimMap = groupByMap(claimList, item => item.account.toLowerCase())

      const formattedList = toAccountCompetitionSummary(settledList, priceMap)
        // .filter(x => !!claimMap[x.account])
        .sort((a, b) => {
          const aN = claimMap[a.account] ? a.realisedPnl : a.realisedPnl - bigNumberForPriority
          const bN = claimMap[b.account] ? b.realisedPnl : b.realisedPnl - bigNumberForPriority

          return Number(bN - aN)
        })

      return formattedList
    })

    return pagingQuery(queryParams, query)
  }),
  awaitPromises
)

export interface ILadderAccount {
  winTradeCount: number
  settledTradeCount: number
  openTradeCount: number

  size: number
}


export function toAccountCompetitionSummary(list: ITrade[], priceMap: { [k: string]: IPricefeed }): IAccountLadderSummary[] {
  const settledListMap = groupByMapMany(list, a => a.account)
  const allPositions = Object.entries(settledListMap)

  return allPositions.reduce((seed, [account, allSettled]) => {

    const seedAccountSummary: IAccountLadderSummary = {
      claim: null,
      account,

      collateral: 0n,
      size: 0n,

      fee: 0n,
      realisedPnl: 0n,

      collateralDelta: 0n,
      sizeDelta: 0n,
      realisedPnlPercentage: 0n,
      roi: 0n,

      winTradeCount: 0,
      settledTradeCount: 0,
      openTradeCount: 0,
    }

    const summary = allSettled.reduce((seed, next): IAccountLadderSummary => {

      const indexTokenMarkPrice = BigInt(priceMap['_' + next.indexToken].c)
      const posDelta = calculatePositionDelta(indexTokenMarkPrice, next.averagePrice, next.isLong, next)

      const isSettled = isTradeSettled(next)

      return {
        ...seed,
        fee: seed.fee + next.fee,
        collateral: seed.collateral + next.collateral,
        collateralDelta: seed.collateralDelta + next.collateralDelta,
        realisedPnl: seed.realisedPnl + (next.realisedPnl - next.fee) + posDelta.delta,
        realisedPnlPercentage: seed.realisedPnlPercentage + next.realisedPnlPercentage,
        size: seed.size + next.size,
        sizeDelta: seed.sizeDelta + next.sizeDelta,

        winTradeCount: seed.winTradeCount + (isSettled && next.realisedPnl > 0n ? 1 : 0),
        settledTradeCount: seed.settledTradeCount + (isSettled ? 1 : 0),
        openTradeCount: next.status === TradeStatus.OPEN ? seed.openTradeCount + 1 : seed.openTradeCount,

      }
    }, seedAccountSummary)

    seed.push(summary)

    return seed
  }, [] as IAccountLadderSummary[])
}


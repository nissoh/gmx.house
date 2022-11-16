import { O } from "@aelea/core"
import { awaitPromises, map } from "@most/core"
import { fromJson, pagingQuery, groupByMap, ITrade, IChainParamApi, intervalInMsMap, IPagePositionParamApi, ITimerangeParamApi, unixTimestampNow, IPricefeed } from "@gambitdao/gmx-middleware"
import { EM } from '../server'
import { Claim } from "./dto"
import { cacheMap, toAccountCompetitionSummary } from "../utils"
import { competitionAccountListDoc } from "./queries"
import { fetchHistoricTrades, graphMap } from "./api"
import { gql, TypedDocumentNode } from "@urql/core"

const USED_PERCISION = 10n ** 30n
const bigNumberForPriority = 100000000n

const createCache = cacheMap({})

export const competitionCumulativeRoi = O(
  map((queryParams: IChainParamApi & IPagePositionParamApi & ITimerangeParamApi) => {

    const dateNow = unixTimestampNow()
    const isLive = queryParams.to > dateNow
    const cacheDuration = isLive ? intervalInMsMap.MIN5 : intervalInMsMap.YEAR

    const query = createCache('competitionCumulativeRoi' + queryParams.from + queryParams.chain, cacheDuration, async () => {

      const to = Math.min(dateNow, queryParams.to)
      const timeSlot = Math.floor(to / intervalInMsMap.MIN5)
      const timestamp = timeSlot * intervalInMsMap.MIN5 - intervalInMsMap.MIN5

      const from = queryParams.from

      const competitionAccountListQuery = fetchHistoricTrades(competitionAccountListDoc, { from, to, offset: 0, pageSize: 1000 }, queryParams.chain, 0, (res) => res.trades)

      const claimListQuery = EM.find(Claim, {})

      const competitionPricefeedMap: TypedDocumentNode<{ pricefeeds: IPricefeed[] }, {}> = gql`
      {
        pricefeeds(where: { timestamp: ${timestamp.toString()} }) {
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

      const historicTradeList = await competitionAccountListQuery
      const priceMap = await priceMapQuery
      const claimList = await claimListQuery
      const tradeList: ITrade[] = historicTradeList.map(fromJson.toTradeJson)

      // .filter(x => x.account === '0xd92f6d0c7c463bd2ec59519aeb59766ca4e56589')
      const claimMap = groupByMap(claimList, item => item.account.toLowerCase())

      const formattedList = toAccountCompetitionSummary(tradeList, priceMap)
        .sort((a, b) => {
          const aN = claimMap[a.account] ? a.roi : a.roi - bigNumberForPriority
          const bN = claimMap[b.account] ? b.roi : b.roi - bigNumberForPriority

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






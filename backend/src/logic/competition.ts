import { O } from "@aelea/core"
import { awaitPromises, map } from "@most/core"
import { fromJson, pagingQuery, groupByMap, parseFixed } from "gambit-middleware"
import { EM } from '../server'
import { Claim } from "./dto"
import { tradeByTimespan } from "./aggregatedTradeList"


const fetchCompeitionResults = O(
  tradeByTimespan,
  map(({ query: listQuery, queryParams }) => { 
    const claimQuery = EM.find(Claim, {})

    const query = Promise.all([claimQuery, listQuery]).then(([claimList, list]) => {
      const hunderedBucks = parseFixed(90, 30)
    
      const formattedList = [...list.aggregatedTradeCloseds, ...list.aggregatedTradeLiquidateds]
        .map(fromJson.toAggregatedTradeSettledSummary)
        .filter(trade =>
          BigInt(trade.collateral) >= hunderedBucks
        )
    
      const claimMap = groupByMap(claimList, item => item.account.toLowerCase())

      return { formattedList, claimMap }
    })
 
    return { query, queryParams }
  })
)
    

const bigNumberForPriority = 1000000n

export const competitionNov2021HighestPercentage = O(
  fetchCompeitionResults,
  map(async ({ query, queryParams }) => {

    const claimPriority = query.then(res => 
      res.formattedList
        .filter(trade => trade.delta.deltaPercentage > 0n)
        .sort((a, b) => {

          const aN = res.claimMap.get(a.account) ? bigNumberForPriority + a.delta.deltaPercentage : a.delta.deltaPercentage
          const bN = res.claimMap.get(b.account) ? bigNumberForPriority + b.delta.deltaPercentage : b.delta.deltaPercentage

          return Number(bN) - Number(aN)
        })
    )

    return pagingQuery(queryParams, claimPriority)
  }),
  awaitPromises
)

export const competitionNov2021LowestPercentage = O(
  fetchCompeitionResults,
  map(async ({ query, queryParams }) => {

    const claimPriority = query.then(res =>
      res.formattedList
        .filter(trade => trade.delta.deltaPercentage < 0n)
        .sort((a, b) => {

          const aN = res.claimMap.get(a.account) ? -bigNumberForPriority + a.delta.deltaPercentage : a.delta.deltaPercentage
          const bN = res.claimMap.get(b.account) ? -bigNumberForPriority + b.delta.deltaPercentage : b.delta.deltaPercentage

          return Number(aN) - Number(bN)
        })
    )


    return pagingQuery(queryParams, claimPriority)
  }),
  awaitPromises
)
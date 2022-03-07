import { O } from "@aelea/core"
import { awaitPromises, map } from "@most/core"
import { fromJson, pagingQuery, groupByMap, parseFixed, toAccountSummary } from "@gambitdao/gmx-middleware"
import { EM } from '../server'
import { Claim } from "./dto"
import { tradeByTimespan } from "./trade"


const fetchCompeitionResults = O(
  tradeByTimespan,
  map(({ query: listQuery, queryParams }) => {
    const claimListQuery = EM.find(Claim, {})

    const query = Promise.all([claimListQuery, listQuery]).then(([claimList, list]) => {
      const minCollateralRequired = parseFixed(950, 30)
      const settledList = list
        .map(fromJson.toTradeJson)
        .filter(summary => {
          const minCollateral = summary.updateList.reduce((seed, b) => {
            const current = b.realisedPnl < 0n ? b.collateral + b.realisedPnl * -1n : b.collateral

            return seed < current ? seed : current
          }, summary.updateList[0].collateral)

          return minCollateral >= minCollateralRequired
        })

      const formattedList = toAccountSummary(settledList)
    
      const claimMap = groupByMap(claimList, item => item.account.toLowerCase())

      return { formattedList, claimMap }
    })
 
    return { query, queryParams }
  })
)

const bigNumberForPriority = 1000000n 
export const competitionNov2021HighestCumulative = O(
  fetchCompeitionResults,
  map(async ({ query, queryParams }) => {

    const claimPriority = query.then(res => 
      res.formattedList
        .filter(trade => trade.realisedPnlPercentage > 0n)
        .sort((a, b) => {
          const aN = res.claimMap[a.account] ? bigNumberForPriority + a.realisedPnlPercentage : a.realisedPnlPercentage
          const bN = res.claimMap[b.account] ? bigNumberForPriority + b.realisedPnlPercentage : b.realisedPnlPercentage

          return Number(bN) - Number(aN)
        })
    )


    return pagingQuery(queryParams, claimPriority)
  }),
  awaitPromises
)

export const competitionNov2021LowestCumulative = O(
  fetchCompeitionResults,
  map(async ({ query, queryParams }) => {

    const claimPriority = query.then(res =>
      res.formattedList
        .filter(trade => trade.realisedPnlPercentage < 0n)
        .sort((a, b) => {
          const aN = res.claimMap[a.account] ? -bigNumberForPriority + a.realisedPnlPercentage : a.realisedPnlPercentage
          const bN = res.claimMap[b.account] ? -bigNumberForPriority + b.realisedPnlPercentage : b.realisedPnlPercentage


          return Number(aN) - Number(bN)
        })
    )


    return pagingQuery(queryParams, claimPriority)
  }),
  awaitPromises
)
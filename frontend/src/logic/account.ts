import { http } from "@aelea/ui-components"
import { fromPromise } from "@most/core"
import { AccountHistoricalDataApi } from "gambit-backend"
import { SettledPosition, PositionIncrease, PositionLiquidated } from "./types"


interface AccountHistorical {
  closedPositions: SettledPosition[];
  increasePositions: PositionIncrease[];
  liquidatedPositions: PositionLiquidated[];
}

export const accountHistoricalPnLApi = (params: AccountHistoricalDataApi) => fromPromise(
  http.fetchJson<AccountHistorical>(`/api/account-historical-pnl`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      parseJson: jsonList => {
        const closedPositions = jsonList.closedPositions.map((json) => {
          const realisedPnl = BigInt(json.realisedPnl)
          const createdAt = new Date(json.createdAt)

          return { ...json, realisedPnl, createdAt }
        })
        const increasePositions = jsonList.increasePositions.map((json) => {
          // const realisedPnl = BigInt(json.realisedPnl)
          const createdAt = new Date(json.createdAt)

          return { ...json, createdAt }
        })

        const liquidatedPositions = jsonList.liquidatedPositions.map((json) => {
          const collateral = BigInt(json.collateral)
          const markPrice = BigInt(json.markPrice)
          const createdAt = new Date(json.createdAt)

          return { ...json, collateral, markPrice, createdAt }
        })
        return { closedPositions, increasePositions, liquidatedPositions }
      },
      body: JSON.stringify(params)
    }
  )
)
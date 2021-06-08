import { http } from "@aelea/ui-components"
import { fromPromise } from "@most/core"
import { AccountHistoricalDataApi } from "gambit-backend"
import { SettledPosition, PositionIncrease } from "./types"


interface AccountHistorical {
  closedPositions: SettledPosition[];
  increasePositions: PositionIncrease[];
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
        return { closedPositions, increasePositions }
      },
      body: JSON.stringify(params)
    }
  )
)
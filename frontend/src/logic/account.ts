import { http } from "@aelea/ui-components"
import { fromPromise } from "@most/core"
import { AccountHistoricalDataApi } from "gambit-backend"
import { SettledPosition, PositionIncrease, PositionLiquidated } from "./types"
import { positionIncreaseJson, positionLiquidatedJson, positonCloseJson } from "./utils"


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
        const closedPositions = jsonList.closedPositions.map(positonCloseJson)
        const increasePositions = jsonList.increasePositions.map(positionIncreaseJson)
        const liquidatedPositions = jsonList.liquidatedPositions.map(positionLiquidatedJson)

        return { closedPositions, increasePositions, liquidatedPositions }
      },
      body: JSON.stringify(params)
    }
  )
)
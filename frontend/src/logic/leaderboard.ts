import { http } from "@aelea/ui-components"
import { fromPromise } from "@most/core"
import { LeaderboardApi } from "gambit-backend"
import { SettledPosition, PositionLiquidated, Tournament } from "./types"
import { positionLiquidatedJson, positonCloseJson } from "./utils"


export const leaderBoardQuery = (params: LeaderboardApi) => fromPromise(
  http.fetchJson<SettledPosition[]>(`/api/leaderboard`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      parseJson: jsonList => {
        return jsonList.map(positonCloseJson)
      },
      body: JSON.stringify(params)
    }
  )
)

export const tournament1Query = () => fromPromise(
  http.fetchJson<Tournament>(`/api/tournament/0`,
    {
      parseJson: jsonList => {
        const closedPositions = jsonList.closedPositions.map(positonCloseJson)
        const liquidatedPositions = jsonList.liquidatedPositions.map(positionLiquidatedJson)

        return { closedPositions, liquidatedPositions }
      }
    }
  )
)

export const liquidationsQuery = (params: LeaderboardApi) => fromPromise(
  http.fetchJson<PositionLiquidated[]>(`/api/liquidations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      parseJson: jsonList => {
        return jsonList.map(positionLiquidatedJson)
      },
      body: JSON.stringify(params)
    }
  )
)

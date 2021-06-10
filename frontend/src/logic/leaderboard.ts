import { http } from "@aelea/ui-components"
import { fromPromise } from "@most/core"
import { LeaderboardApi } from "gambit-backend"
import { SettledPosition, PositionLiquidated } from "./types"




export const leaderBoardQuery = (params: LeaderboardApi) => fromPromise(
  http.fetchJson<SettledPosition[]>(`/api/leaderboard`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      parseJson: jsonList => {
        return jsonList.map((json) => {
          const realisedPnl = BigInt(json.realisedPnl)
          const createdAt = new Date(json.createdAt)

          return { ...json, realisedPnl, createdAt }
        })
      },
      body: JSON.stringify(params)
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
        return jsonList.map((json) => {
          const collateral = BigInt(json.collateral)
          const createdAt = new Date(json.createdAt)

          return { ...json, collateral, createdAt }
        })
      },
      body: JSON.stringify(params)
    }
  )
)
import { http } from "@aelea/ui-components"
import { fromPromise } from "@most/core"
import { LeaderboardApi } from "gambit-backend"
import { SettledPosition } from "./types"




export const leaderBoard = (params: LeaderboardApi) => fromPromise(
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
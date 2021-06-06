import { http } from "@aelea/ui-components"
import { fromPromise } from "@most/core"
import type { dto, LeaderboardApiQueryParams } from "gambit-backend"

export type SettledPosition = InstanceType<typeof dto.PositionClose>
export type Claim = InstanceType<typeof dto.Claim>



export interface Account {
  address: string
  settledPositionCount: number
  profitablePositionsCount: number
  realisedPnl: bigint
  claim: Claim | null
  settledPositions: SettledPosition[]
}


new URLSearchParams({ dd: 'ddÎ' })

export const leaderBoard = (params: LeaderboardApiQueryParams) => fromPromise(
  http.fetchJson<SettledPosition[]>(`/api/leaderboard`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      parseJson: jsonList => {
        return jsonList.map((json) => {
          const realisedPnl = BigInt(json.realisedPnl)

          return { ...json, realisedPnl }
        })
      },
      body: JSON.stringify(params)
    }
  )
)
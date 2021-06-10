import { http } from "@aelea/ui-components"
import { fromPromise } from "@most/core"
import { Claim } from "./types"




export const claimListQuery = () => fromPromise(
  http.fetchJson<Claim[]>(`/api/claim-list`)
)
import { http } from "@aelea/ui-components"
import { fromPromise } from "@most/core"
import { IClaim } from "@gambitdao/gmx-middleware"

export const claimListQuery = () => fromPromise(
  http.fetchJson<IClaim[]>(`/api/claim-list`)
)
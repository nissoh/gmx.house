import { O } from "@aelea/core"
import { http } from "@aelea/ui-components"
import { filter, fromPromise, map, mergeArray, multicast } from "@most/core"
import { Stream } from "@most/types"
import { fromJson, ICommunicationMessage, ILeaderboardRequest, IPositionLiquidated } from "gambit-middleware"


export type ILoopMap<T> = {
  [P in keyof T]: T[P]
}


export const helloBackend = <IN extends ILoopMap<IN>, OUT>(inMap: IN): {[k: string]: Stream<any>}  => {
  const entriesInMap = Object.entries(inMap)
  const outMapEntries = entriesInMap.map(([topic, source]) => {
    // @ts-ignore
    return map(body => ({ topic, body }), source)
  }, {} as ILoopMap<OUT>)
  
  const wss = http.fromWebsocket<ICommunicationMessage<string, OUT>, ICommunicationMessage<string, IN[keyof IN]>>(`ws://${location.host}/api-ws`, multicast(mergeArray(outMapEntries)))
  const multicastConnection = multicast(wss)

  const outMap = entriesInMap.reduce((seed, [topic, source]) => {
    // @ts-ignore
    seed[topic] = O(
      filter((data: ICommunicationMessage<string, any>) => {
        const isMessageValid = typeof data === 'object' && 'body' in data && 'topic' in data
        return isMessageValid && data.topic === topic
      }),
      map(x => x.body)
    )(multicastConnection)

    return seed
  }, {} as ILoopMap<OUT>)
 
  return outMap as any
}





// export const leaderBoardQuery = (params: LeaderboardApi) => fromPromise(
//   http.fetchJson<ISettledPosition[]>(`/api/leaderboard`,
//     {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json'
//       },
//       parseJson: jsonList => {
//         return jsonList.map(positonCloseJson)
//       },
//       body: JSON.stringify(params)
//     }
//   )
// )



export const liquidationsQuery = (params: ILeaderboardRequest) => fromPromise(
  http.fetchJson<IPositionLiquidated[]>(`/api/liquidations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      parseJson: jsonList => {
        return jsonList.map(fromJson.positionLiquidatedJson)
      },
      body: JSON.stringify(params)
    }
  )
)


// export const tournamentOp = O(
//   context<Account[]>('tournament'),
//   map((jsonList) => {
//     const closedPositions = jsonList.map(acc => {
//       return { ...acc, realisedPnl: BigInt(acc.realisedPnl) }
//     })
//     return closedPositions
//   })
// )


import { fromCallback, O, Op } from '@aelea/core'
import { chain, empty, filter, map, mergeArray, recoverWith, tap, until } from '@most/core'
import { Stream } from '@most/types'
import { ICommunicationMessage } from '@gambitdao/gmx-middleware'
import ws, { EventEmitter } from 'ws'



export type WsData = { data: ws.Data, ws: ws }

function wsConnection(wss: EventEmitter, clientPipeList: Op<WsData, string>[]): Stream<string> {
  return {
    run(sink, scheduler) {
      const connection = fromCallback<ws>(cb => {
        return wss.on('connection', data => cb(data))
      })
      const connectToMessages = chain(ws => {
        const clientIn = fromCallback<WsData>(cb => ws.on('message', data => cb({ data, ws })))

        const serverOut = mergeArray(clientPipeList.map(xx => xx(clientIn)))
        const outEffects = tap(outmsg => {
          ws.send(outmsg)
        }, serverOut)

        const wsDipose = fromCallback(cb => ws.on('close', cb))

        return until(wsDipose, outEffects)
      }, connection)


      return connectToMessages.run(sink, scheduler)
    }
  }
}


export type ILoopMap<T> = {
  [P in keyof T]: T[P]
}


export const helloFrontend = <T extends ILoopMap<T>, OUT>(wss: ws.Server | ws, inMap: T)  => {
  const entriesInMap: [string, Op<WsData, any>][] = Object.entries(inMap)

  const composedPipes = entriesInMap.map(([topic, op]) => O(
    map((msg: WsData) => {
      if (msg.data instanceof Buffer) {
        const data = JSON.parse(msg.data.toString())
        return data
      }

      throw new Error('Enexpected client message')
    }),
    filter((data: ICommunicationMessage<string, any>) => {
      const isMessageValid = typeof data === 'object' && 'body' in data && 'topic' in data

      return isMessageValid && data.topic === topic
    }),
    map(({ body }) => body),
    op,
    map(body => JSON.stringify({ body, topic })),
    recoverWith(error => {
      console.error(error)
      return empty()
    })
  ), {} as ILoopMap<OUT>)


  const multicastConnection = wsConnection(wss, composedPipes)

  return multicastConnection
}


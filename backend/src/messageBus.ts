import { fromCallback, nullSink, O, Op } from '@aelea/utils'
import { chain, filter, fromPromise, join, map, mergeArray, multicast, tap } from '@most/core'
import { Stream } from '@most/types'
import { ICommunicationMessage } from 'gambit-middleware'
import ws, { EventEmitter } from 'ws'



export type WsData = { data: ws.Data, ws: ws }

function wsConnection<OUT>(wss: EventEmitter, out: Stream<OUT>): Stream<WsData> {
  return {
    run(sink, scheduler) {

      const connection = fromCallback<ws>(cb => wss.on('connection', data => cb(data)))
      const connectToMessages = chain(ws => {
        const msg = fromCallback<WsData>(cb => ws.on('message', data => cb({ data, ws })))
        const outEffects = tap(outmsg => {
          ws.send(outmsg)
        }, out).run(nullSink, scheduler)

        ws.on('close', () => {
          outEffects.dispose()
          connectDisposable.dispose()
        })

        return msg
      }, connection)

      const connectDisposable = connectToMessages.run(sink, scheduler)

      return connectDisposable
    }
  }
}


export type ILoopMap<T> = {
  [P in keyof T]: T[P]
}


export const helloFrontend = <IN extends ILoopMap<IN>, OUT>(wss: ws.Server | ws, inMap: IN)  => {

  const entriesInMap: [string, Op<any, any>][] = Object.entries(inMap)
  const outMapEntries = entriesInMap.map(async ([topic, op]) => {
    await Promise.resolve()
    const ww = O(
      map((msg: WsData) => {

        if (msg.data instanceof Buffer) {
          return JSON.parse(msg.data.toString())
        }

        throw new Error('unexpected data type')
      }),
      filter((data: ICommunicationMessage<string, any>) => {
        const isMessageValid = typeof data === 'object' && 'body' in data && 'topic' in data

        return isMessageValid && data.topic === topic
      }),
      map(({ body }) => body),
      op,
      map(body => JSON.stringify({ body, topic }))
    )(multicastConnection)

    return ww
  }, {} as ILoopMap<OUT>)

  const outputStream = mergeArray(outMapEntries.map(O(fromPromise, join)))
  const multicastConnection = multicast(wsConnection(wss, outputStream))

  return multicastConnection
}


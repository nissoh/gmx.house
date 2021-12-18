import { fromCallback } from "@aelea/core"
import { BaseContract } from "@ethersproject/contracts"

import { multicast } from "@most/core"
import type { Stream } from '@most/types'


export const listen = <T extends BaseContract, R>(contract: T) => <EventName extends string>(eventName: EventName): Stream<R> => {
  return multicast(
    fromCallback(
      cb => {
        contract.on(eventName, cb)
        return () => contract.off(eventName, cb)
      },
      (...argsArray) => {
        const arrLength = argsArray.length
        const eventDescriptor = argsArray[arrLength - 1] as any
        const argsObj: any = {}
        for (const prop in eventDescriptor.args) {
          if (Object.prototype.hasOwnProperty.call(eventDescriptor.args, prop) && !Number.isFinite(Number(prop))) {
            argsObj[prop] = eventDescriptor.args[prop]
          }
        }
        return argsObj
      }
    )
  )
}




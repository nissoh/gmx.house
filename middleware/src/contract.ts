import { fromCallback } from "@aelea/core"
import { Signer } from "@ethersproject/abstract-signer"
import { BigNumber } from "@ethersproject/bignumber"
import { BaseContract, ContractTransaction } from "@ethersproject/contracts"
import { BaseProvider } from "@ethersproject/providers"
import { multicast } from "@most/core"
import { Stream } from '@most/types'
import { TypedEventFilter } from "./contract/ethers-contracts/commons"
import { Address } from "./types"



export type ConvertTypeToBigInt<T> = {
  [P in keyof T]: T[P] extends BigNumber ? bigint : T[P]
}

export type ConnectFactoryFn<T extends BaseContract> = (address: Address, signerOrProvider: Signer | BaseProvider) => T
export type ExtractEventType<A extends BaseContract, B extends keyof A['filters']> = ReturnType<A['filters'][B]> extends TypedEventFilter<never, infer Z> ? Z : never
export type ExtractAndParseEventType<A extends BaseContract, B extends keyof A['filters']> = ConvertTypeToBigInt<ReturnType<A['filters'][B]> extends TypedEventFilter<never, infer Z> ? Z : never>

export interface IContractBase<T extends BaseContract> {
  contract: T
  listen: <EventName extends string>(eventName: EventName) => Stream<ExtractEventType<T, EventName>>
}


export interface IContract<T extends BaseContract> extends IContractBase<T> {
  transfer(to: string, amount: bigint): Stream<ContractTransaction>
}

export const listen = <T extends BaseContract>(contract: T) => <EventName extends string>(eventName: EventName): Stream<ExtractEventType<T, EventName>> => {
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




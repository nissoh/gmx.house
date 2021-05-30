import { O, Op, fromCallback } from "@aelea/utils"
import { BaseProvider } from "@ethersproject/providers"
import { awaitPromises, at, map, chain, recoverWith, continueWith, switchLatest, take } from "@most/core"
import { disposeWith } from "@most/disposable"
import { Stream } from "@most/types"

export enum CHAIN {
  ETH = 1,
  ETH_ROPSTEN = 3,
  ETH_KOVAN = 42,
  BSC = 56,
  BSC_TESTNET = 97
}




export const awaitProvider = <T extends BaseProvider>(provider: Stream<T>): Stream<T> => {
  const recoverProviderFailure = recoverWith(err => {
    console.error(err)
    return chain(() => awaitProvider(provider), at(3000, null))
  }, provider)

  return recoverProviderFailure
}



export const providerAction = <T>(provider: Stream<BaseProvider>) => (interval: number, actionOp: Op<BaseProvider, Promise<T>>) => {
  const tx: Stream<T> = O(
    actionOp,
    take(1),
    awaitPromises,
    recoverWith(err => {
      console.error(err)
      return switchLatest(at(1500, tx))
    }),
    continueWith(() => {
      return switchLatest(at(interval, tx))
    }),
  )(provider)

  return tx
}


export const providerEvent = <A extends any[]>(provider: Stream<BaseProvider>) => (eventName: string) => map((provider: BaseProvider) => {
  const eventChange: Stream<A> = fromCallback(
    cb => {
      provider.on(eventName, cb)
      return disposeWith(() => provider.removeListener(eventName, cb), null)
    },
    (...args) => {
      return args
    }
  )

  return eventChange
}, provider)


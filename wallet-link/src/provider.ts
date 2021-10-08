import { O, Op, fromCallback } from "@aelea/utils"
import { BaseProvider, EventType, ExternalProvider } from "@ethersproject/providers"
import { awaitPromises, at, map, chain, recoverWith, continueWith, switchLatest, take, filter } from "@most/core"
import { disposeWith } from "@most/disposable"
import { Stream } from "@most/types"



export const keepTryingExternalProvider = <T extends ExternalProvider>(provider: Stream<T | null>): Stream<T> => {
  const validProvider = filter(provider => provider !== null, provider)

  const recoverProviderFailure = recoverWith(err => {
    console.error(err)
    return chain(() => keepTryingExternalProvider(provider), at(3000, null))
  }, validProvider)

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


export const providerEvent = <A extends any[]>(provider: Stream<BaseProvider>) => (eventType: EventType) => map((provider: BaseProvider) => {
  const eventChange: Stream<A> = fromCallback(
    cb => {
      provider.on(eventType, cb)
      return disposeWith(() => provider.removeListener(eventType, cb), null)
    },
    (...args) => {
      return args
    }
  )

  return eventChange
}, provider)


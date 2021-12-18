import { fromCallback, O, Op } from "@aelea/core"
import type { BaseProvider, EventType, ExternalProvider } from "@ethersproject/providers"
import { at, awaitPromises, chain, continueWith, empty, filter, map, recoverWith, switchLatest, take } from "@most/core"
import { disposeWith } from "@most/disposable"
import { Stream } from "@most/types"
import type { EIP1193Provider, ProviderAccounts, ProviderChainId, ProviderInfo, ProviderMessage, ProviderRpcError } from "eip1193-provider"
import { CHAIN, EXPLORER_URL } from "./const"

function resolveError(error: any) {
  if (error instanceof Error) {
    return error
  }

  if (typeof error === 'string') {
    return new Error(error)
  } else if ('message' in error && typeof error.message === 'string') {
    return new Error(error.message)
  }

  throw new Error('Unable to resolve error message')
}

export function parseError(data: any): Error {
  if (data instanceof Error) {
    return data
  }

  if (typeof data === 'string') {
    return resolveError(data)
  }
  
  if ('error' in data) {
    return resolveError((data as any).error)
  } else if ('data' in data) {
    return resolveError((data as any).data)
  } else if ('message' in data) {
    return new Error(data.message)
  }
  
  return new Error('Unknown error')
}

export const resolveWalletProvider = <T extends ExternalProvider>(provider: Stream<T | null>): Stream<T> => {
  const validProvider = filter(provider => provider !== null, provider)

  const recoverProviderFailure = recoverWith(err => {
    console.error(err)
    return chain(() => resolveWalletProvider(provider), at(3000, null))
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


export interface ProviderEventListener {
  (event: "connect"): Stream<ProviderInfo>
  (event: "disconnect"): Stream<ProviderRpcError>
  (event: "message"): Stream<ProviderMessage>
  (event: "chainChanged"): Stream<ProviderChainId>
  (event: "accountsChanged"): Stream<ProviderAccounts>
}



export const filterNull = <T>(prov: Stream<T | null>) => filter((provider): provider is T => provider !== null, prov)

export const eip1193ProviderEvent = <A>(provider: Stream<EIP1193Provider | null>): ProviderEventListener => (eventName: string) => switchLatest(
  map(provider => {
    if (provider === null) {
      return empty()
    }

    const eventChange: Stream<A> = fromCallback<any, any>(
      (cb) => {
        provider.on(eventName as any, cb)
        return disposeWith(() => provider.removeListener(eventName, cb), null)
      },
      a => {
        return a
      }
    )

    return eventChange
  }, provider)
)

export const providerEvent = <A>(ps: Stream<BaseProvider | null>) => (eventType: EventType) => switchLatest(
  map(provider => {
    if (provider === null) {
      return empty()
    }

    const eventChange: Stream<A> = fromCallback(
      cb => {
        provider.on(eventType, cb)
        return disposeWith(() => provider.removeListener(eventType, cb), null)
      },
      (cbValue) => {
        return cbValue
      }
    )

    return eventChange
  }, ps)
)



function getChain(chainId: CHAIN) {
  const explorerUrl = EXPLORER_URL[chainId]
  if (!explorerUrl) {
    throw new Error(`chainId: ${chainId} missing an explorer`)
  }

  return explorerUrl
}

export function getAccountExplorerUrl(chainId: CHAIN, account: string) {
  return getChain(chainId) + "address/" + account
}

export function getTxnUrl(chainId: CHAIN, transactionHash: string) {
  return  getChain(chainId) + 'tx/' + transactionHash 
}



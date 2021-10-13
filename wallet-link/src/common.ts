import { O, Op, fromCallback } from "@aelea/utils"
import type { BaseProvider, EventType, ExternalProvider } from "@ethersproject/providers"
import { awaitPromises, at, map, chain, recoverWith, continueWith, switchLatest, take, filter } from "@most/core"
import { disposeWith } from "@most/disposable"
import { Stream } from "@most/types"
import type { IEthereumProvider, ProviderAccounts, ProviderChainId, ProviderInfo, ProviderMessage, ProviderRpcError } from "eip1193-provider"
import { CHAIN, EXPLORER_URL } from "./const"



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

//  on(event: "connect", listener: (info: ProviderInfo) => void): void;
//  on(event: "disconnect", listener: (error: ProviderRpcError) => void): void;
//  on(event: "message", listener: (message: ProviderMessage) => void): void;
//  on(event: "chainChanged", listener: (chainId: ProviderChainId) => void): void;
//  on(event: "accountsChanged", listener: (accounts: ProviderAccounts) => void): void;


export function eip1193ProviderEvent(provider: IEthereumProvider): ProviderEventListener {
  return (eventName) => fromCallback<any, any>(
    (cb) => {
      provider.on(eventName as any, cb)
      return disposeWith(() => provider.removeListener(eventName, cb), null)
    }
  )
}


export const filterNull = <T>(prov: Stream<T | null>) => filter((provider): provider is T => provider !== null, prov)


export const providerEvent = <A>(ps: Stream<BaseProvider>) => (eventType: EventType) => switchLatest(
  map((provider: BaseProvider) => {
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

export function getTxExplorerUrl(chainId: CHAIN, transactionHash: string) {
  return  getChain(chainId) + 'tx/' + transactionHash 
}



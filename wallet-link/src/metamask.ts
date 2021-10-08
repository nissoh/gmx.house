import { fromCallback } from "@aelea/utils"
import { ExternalProvider, JsonRpcSigner, Web3Provider } from "@ethersproject/providers"
import detectEthereumProvider from "@metamask/detect-provider"
import { awaitPromises, fromPromise, map, merge, now, switchLatest } from "@most/core"
import { disposeWith } from "@most/disposable"
import { Stream } from "@most/types"
import { CHAIN } from "./const"
import { keepTryingExternalProvider } from "./provider"


export type InitMetamaskProvider = {
  w3p: Web3Provider
  metamask: any
  signer: JsonRpcSigner
}


export const metamaskEvent = <Args extends any[], C>(eventName: string, mapFn: (...args: Args) => C) => switchLatest(
  map(provider => {

    const eventChange = fromCallback(
      (cb) => {
        provider.metamask.on(eventName, cb as any)
        return disposeWith(() => provider.metamask.removeListener(eventName, cb as any), null)
      },
      mapFn
    )

    return eventChange
  }, provider)
)

export const awaitMetamask: Stream<ExternalProvider> = fromPromise(detectEthereumProvider({ mustBeMetaMask: true }))

const metamaskProviderSignal = keepTryingExternalProvider(awaitMetamask)

export const provider: Stream<InitMetamaskProvider> = map(metamask => {
  if (metamask) {
    const w3p = new Web3Provider(metamask)
    const signer = w3p.getSigner()

    return { w3p, metamask, signer }
  }
  return null as never
}, metamaskProviderSignal)


export const networkChange: Stream<CHAIN> = metamaskEvent('chainChanged', (network: string) => Number(network))
export const currentNetwork: Stream<CHAIN> = awaitPromises(map(async wallet => (await wallet.w3p.getNetwork()).chainId, provider))
export const network = merge(networkChange, currentNetwork)


export const currentAccount: Stream<string> = awaitPromises(map(async wallet => (await wallet.w3p.listAccounts())[0], provider))

export const accountChange = metamaskEvent('accountsChanged', (account: string[]) => {
  return account[0]
})

export const account = merge(accountChange, currentAccount)


export const requestAccounts: Stream<string[]> = awaitPromises(
  map(wallet => {
    return wallet.metamask.request({ method: 'eth_requestAccounts' })
  }, provider)
)

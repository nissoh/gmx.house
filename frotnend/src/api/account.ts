import { O } from "@aelea/core"
import { fromCallback } from "@aelea/core"
import { Network } from "@ethersproject/providers"
import { awaitPromises, map, merge, switchLatest } from "@most/core"
import { disposeWith } from "@most/disposable"
import { Stream } from "@most/types"
import { awaitProvider, InitWalletProvider } from "./provider"

const metamaskEvent = <A, B = unknown>(eventName: string, action: (a: Stream<[InitWalletProvider, A]>) => Stream<Promise<B>>) => switchLatest(
  map(provider => {
    const eventChange: Stream<A> = fromCallback(cb => {
      provider.metamask.on(eventName, cb)
      return disposeWith(() => provider.metamask.removeListener(eventName, cb), null)
    })

    return O(
      map((ev: A) => [provider, ev]),
      action,
      awaitPromises,
    )(eventChange)
  }, awaitProvider)
)

const networkChange = metamaskEvent<string, Network>('chainChanged', map(([provider, _chainId]) => {
  // ethers.js does not support provider switch, hacky reload is required.. pffft
  window.location.reload()

  return provider.w3p.getNetwork()
}))
const initialNetwork = awaitPromises(map(p => p.w3p.getNetwork(), awaitProvider))
export const network = merge(initialNetwork, networkChange)

const initialAccountList = awaitPromises(map(p => p.w3p.listAccounts(), awaitProvider))
const accountListChange = metamaskEvent<string, string[]>('accountsChanged', map(([provider, _accountHash]) => provider.w3p.listAccounts()))

export const accountList = merge(initialAccountList, accountListChange)
export const account = map(accountList => accountList[0], accountList)

export const requestAccounts: Stream<string[]> = awaitPromises(
  map(provider => {
    return provider.metamask.request({ method: 'eth_requestAccounts' })
  }, awaitProvider)
)



import { fromCallback, Pipe } from '@aelea/utils'
import { ExternalProvider, JsonRpcSigner, Network, Web3Provider } from '@ethersproject/providers'
import { awaitPromises, chain, filter, fromPromise, map, merge, multicast, now, startWith, switchLatest } from "@most/core"
import { disposeWith } from "@most/disposable"
import { Disposable, Scheduler, Sink, Stream } from "@most/types"
import detectEthereumProvider from '@metamask/detect-provider'
import { awaitProvider, CHAIN, getTxDetails } from 'gambit-middleware'






export type InitMetamaskProvider = {
  w3p: Web3Provider
  metamask: any
  signer: JsonRpcSigner
}

const getProvider = () => {
  return fromPromise(detectEthereumProvider())
}

const metamaskProviderSignal = awaitProvider(
  chain(getProvider, now(null))
) as Stream<ExternalProvider>

export const metamaskProvider: Stream<InitMetamaskProvider> = map(metamask => {
  if (metamask) {
    const w3p = new Web3Provider(metamask)
    const signer = w3p.getSigner()

    return { w3p, metamask, signer }
  }
  return null as never
}, metamaskProviderSignal)


// export const awaitMetamask = awaitProvider(metamaskProvider)

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
  }, metamaskProvider)
)


export const networkChange: Stream<CHAIN> = metamaskEvent('chainChanged', (network: Network) => {
  return network.chainId
})
export const currentNetwork: Stream<CHAIN> = awaitPromises(map(async wallet => (await wallet.w3p.getNetwork()).chainId, metamaskProvider))
export const network = merge(networkChange, currentNetwork)


export const currentAccount: Stream<string> = awaitPromises(map(async wallet => (await wallet.w3p.listAccounts())[0], metamaskProvider))

export const accountChange = metamaskEvent('accountsChanged', (account: string) => {
  return account
})

export const account = merge(accountChange, currentAccount)

// const initialNetwork = awaitPromises(map(async p => (await p.w3p.getNetwork()).chainId as CHAIN, awaitProvider))
// export const network = merge(initialNetwork, networkChange)

// const initialAccountList = awaitPromises(map(p => p.w3p.listAccounts(), awaitProvider))
// const accountListChange = metamaskEvent<string, string[]>('accountsChanged', map(([provider, _accountHash]) => provider.w3p.listAccounts()))

// export const accountList = merge(initialAccountList, accountListChange)
// export const account: Stream<Address> = map(accountList => accountList[0], accountList)

export const requestAccounts: Stream<string[]> = awaitPromises(
  map(wallet => {
    return wallet.metamask.request({ method: 'eth_requestAccounts' })
  }, metamaskProvider)
)


export const transactionDetails = getTxDetails(map(mmw => mmw.w3p, metamaskProvider))


// export const addEthereumChain = (chainId = '0x56'): Stream<string[]> => awaitPromises(
//   map(provider => {
//     return provider.metamask.request({
//       method: 'wallet_addEthereumChain', params: [
//         {
//           chainId,
//           chainName: 'Binance Smart Chain',
//           nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
//           rpcUrls: ['https://bsc-dataseed.binance.org/'],
//           blockExplorerUrls: ['https://bscscan.com/']
//         }
//       ]
//     })
//   }, awaitProvider)
// )



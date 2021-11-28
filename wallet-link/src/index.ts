import { O, replayLatest } from "@aelea/core"
import { BaseProvider, TransactionReceipt, Web3Provider } from "@ethersproject/providers"
import { awaitPromises, constant, empty, fromPromise, join, map, merge, mergeArray, multicast, now, skipAfter, switchLatest, tap } from "@most/core"
import { Stream } from "@most/types"
import { IEthereumProvider, ProviderInfo, ProviderRpcError } from "eip1193-provider"
import { eip1193ProviderEvent, getAccountExplorerUrl, getTxExplorerUrl, providerAction } from "./common"
import { CHAIN, NETWORK_METADATA } from "./const"



export const getTxDetails = (provider: Stream<BaseProvider>) => (txHash: string): Stream<TransactionReceipt | null> => {
  return providerAction(provider)(
    350,
    map(provider => provider.getTransactionReceipt(txHash))
  )
}

export { NETWORK_METADATA }

export interface IWalletLink<T extends IEthereumProvider = IEthereumProvider> {
  account: Stream<string>
  network: Stream<CHAIN>
  provider: Web3Provider
  wallet: T
  disconnect: Stream<ProviderRpcError>
  connect: Stream<ProviderInfo>
}



interface IWalletLinkConfig {
  walletProviders: Stream<IEthereumProvider | null>[]
}


// https://eips.ethereum.org/EIPS/eip-3085
export async function attemptToSwitchNetwork(metamask: IEthereumProvider, chain: CHAIN) {
  try {
    // check if the chain to connect to is installed
    await metamask.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x' + chain.toString(16) }], // chainId must be in hexadecimal numbers
    })
  } catch (error: any) {
    // @ts-ignore
    if (!NETWORK_METADATA[chain]) {
      throw new Error(`Could not add metamask network, chainId ${chain} is not supported`)
    }
    // This error code indicates that the chain has not been added to MetaMask
    // if it is not, then install it into the user MetaMask
    if (error.code === 4902) {
      try {
        await metamask.request({
          method: 'wallet_addEthereumChain',
          params: [
            // @ts-ignore
            NETWORK_METADATA[chain]
          ],
        })
      } catch (addError) {
        console.error(addError)
      }
    }
    console.error(error)
  }
}



function connectWallet<T extends IEthereumProvider = IEthereumProvider>(wallet: T): IWalletLink<T> {
  const provider = new Web3Provider(wallet)

  const listen = eip1193ProviderEvent(wallet)

  const connect = listen('connect')
  const disconnect = listen('disconnect')
  
  const networkChange = map(Number, listen('chainChanged'))

  const accountChange = map(list => {
    return list[0]
  }, listen('accountsChanged'))

  const newLocal = provider.getNetwork()
  const currentNetwork = map(net => net.chainId, fromPromise(newLocal))
  const currentAccount = awaitPromises(map(async () => (await provider.listAccounts())[0], now(null)))

  const network = merge(networkChange, currentNetwork)
  const account = merge(accountChange, currentAccount)

  return { account, network, provider, wallet, disconnect, connect }
}

async function lisAccountss(provider: IEthereumProvider | null) {
  // @ts-ignore
  const accounts: string[] = await (provider?.request({ method: 'eth_accounts' }) || [])

  return accounts.length ? connectWallet(provider!) : null
}

// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md
// walletconnect chaining chain issue https://github.com/WalletConnect/walletconnect-monorepo/issues/612
// attempting to manage wallet connection and event flow
export function initWalletLink(config: IWalletLinkConfig, changeProvider: Stream<IEthereumProvider | null>): Stream<IWalletLink> {
  const attemptConnect = O(map(lisAccountss), awaitPromises)

  const walletSources = attemptConnect(mergeArray(config.walletProviders))
  const initialConnection = skipAfter(res => res !== null, walletSources)
  const withProviderChange = attemptConnect(changeProvider)

  const initialWithNetchange = switchLatest(map(initWallet => {
    if (initWallet) {
      return join(constant(initialConnection, initWallet.network))
    }

    return empty()
  }, initialConnection))

  const connection = replayLatest(multicast(mergeArray([
    withProviderChange,
    initialWithNetchange
  ])))
  


  return connection
}

export { CHAIN, getAccountExplorerUrl, getTxExplorerUrl }
 
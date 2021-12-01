import { BaseProvider, TransactionReceipt, Web3Provider } from "@ethersproject/providers"
import { awaitPromises, map, merge, snapshot } from "@most/core"
import { Stream } from "@most/types"
import { EIP1193Provider, ProviderInfo, ProviderRpcError } from "eip1193-provider"
import { eip1193ProviderEvent, getAccountExplorerUrl, getTxExplorerUrl, providerAction } from "./common"
import { CHAIN, NETWORK_METADATA } from "./const"


export interface IWalletLink<T extends EIP1193Provider = EIP1193Provider> {
  account: Stream<string | null>
  network: Stream<CHAIN | null>
  disconnect: Stream<ProviderRpcError>
  connect: Stream<ProviderInfo>

  provider: Stream<Web3Provider | null>
  wallet: Stream<T | null>
}


export const getTxDetails = (provider: Stream<BaseProvider>) => (txHash: string): Stream<TransactionReceipt | null> => {
  return providerAction(provider)(
    350,
    map(provider => provider.getTransactionReceipt(txHash))
  )
}


// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md
// walletconnect chaining chain issue https://github.com/WalletConnect/walletconnect-monorepo/issues/612
// attempting to manage wallet connection and event flow
export function initWalletLink<T extends EIP1193Provider>(walletChange: Stream<T | null>): IWalletLink<T> {
  const ethersWeb3Wrapper = map(wallet => wallet ? new Web3Provider(wallet): wallet, walletChange)

  const walletEvent = eip1193ProviderEvent(walletChange)

  const connect = walletEvent('connect')
  const disconnect = walletEvent('disconnect')
  
  const networkChange = map(Number, walletEvent('chainChanged'))
  const accountChange = map(list => list[0], walletEvent('accountsChanged'))
  const proivderChange = snapshot((walletProvider, net) => {
    if (walletProvider === null) {
      return null
    }
    return new Web3Provider(walletProvider)
  }, walletChange, networkChange)


  const currentAccount = awaitPromises(map(async (provi) => {
    if (provi) {
      return (await provi.listAccounts())[0]
    }
    return null
  }, ethersWeb3Wrapper))


  const account = merge(accountChange, currentAccount)
  const provider = merge(ethersWeb3Wrapper, proivderChange)

  const network = awaitPromises(map(async net => {
    if (net) {
      return (await net.getNetwork()).chainId
    }

    return null
  }, provider))

  return { account, network, provider, disconnect, connect, wallet: walletChange }
}


// https://eips.ethereum.org/EIPS/eip-3085
export async function attemptToSwitchNetwork(metamask: EIP1193Provider, chain: CHAIN) {
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

export { NETWORK_METADATA, CHAIN, getAccountExplorerUrl, getTxExplorerUrl }
 
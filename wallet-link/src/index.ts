import { BaseProvider, TransactionReceipt } from "@ethersproject/providers"
import { map } from "@most/core"
import { Stream } from "@most/types"

import { CHAIN } from "./const"
import * as metamask from "./metamask"
import { providerAction } from "./provider"



export const getTxDetails = (provider: Stream<BaseProvider>) => (txHash: string): Stream<TransactionReceipt | null> => {
  return providerAction(provider)(
    350,
    map(provider => provider.getTransactionReceipt(txHash))
  )
}


export const transactionDetails = getTxDetails(map(mmw => mmw.w3p, metamask.provider))


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



export const EXPLORER_URL = {
  [CHAIN.ETH]: "https://etherscan.io/",
  [CHAIN.ETH_KOVAN]: "https://kovan.etherscan.io/",
  [CHAIN.ETH_ROPSTEN]: "https://ropsten.etherscan.io/",

  [CHAIN.BSC]: "https://bscscan.com/",
  [CHAIN.BSC_TESTNET]: "https://testnet.bscscan.com/",

  [CHAIN.ARBITRUM]: "https://arbiscan.io/",
  [CHAIN.ARBITRUM_RINKBY]: "https://rinkeby-explorer.arbitrum.io/",
} as const


export const network = metamask.network
export const provider = metamask.provider
export const account = metamask.account
export const requestAccounts = metamask.requestAccounts

export function getAccountExplorerUrl(chainId: CHAIN, account: string) {
  if (!account) {
    return EXPLORER_URL[chainId]
  }
  return EXPLORER_URL[chainId] + "address/" + account
}

export { CHAIN }

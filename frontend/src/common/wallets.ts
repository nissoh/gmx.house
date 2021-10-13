import detectEthereumProvider from "@metamask/detect-provider"
import WalletConnectProvider from "@walletconnect/ethereum-provider"
import { IEthereumProvider } from "eip1193-provider"
import { CHAIN, getTxExplorerUrl } from "wallet-link"
import { EXPLORER_URL, NETWORK_METADATA } from "wallet-link/src/const"


export const walletConnect = new WalletConnectProvider({
  rpc: {
    [CHAIN.ARBITRUM]: "https://arb1.arbitrum.io/rpc"
  },
  infuraId: "6d7e461ad6644743b92327579860b662",
  qrcodeModalOptions: {
    mobileLinks: [
      "rainbow",
      "metamask",
      "argent",
      "trust",
      "imtoken",
      "pillar"
    ],
  },
})

export const metamaskQuery = detectEthereumProvider({ mustBeMetaMask: true, silent: true }) as Promise<IEthereumProvider & { selectedAddress: string } | null>



// https://eips.ethereum.org/EIPS/eip-3085
export async function attemptToSwitchNetwork(metamask: IEthereumProvider, chain: CHAIN) {
  try {
    // check if the chain to connect to is installed
    await metamask.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: NETWORK_METADATA[chain].chainId }], // chainId must be in hexadecimal numbers
    })
  } catch (error: any) {
    // This error code indicates that the chain has not been added to MetaMask
    // if it is not, then install it into the user MetaMask
    if (error.code === 4902) {
      try {
        await metamask.request({
          method: 'wallet_addEthereumChain',
          params: [
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
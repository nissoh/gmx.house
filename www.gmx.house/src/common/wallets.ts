import { NETWORK_METADATA } from "@gambitdao/gmx-middleware"
import detectEthereumProvider from "@metamask/detect-provider"
import WalletConnectProvider from "@walletconnect/ethereum-provider"
import { IEthereumProvider } from "eip1193-provider"


export const walletConnect = new WalletConnectProvider({
  rpc: Object.entries(NETWORK_METADATA).reduce((seed, [chainId, net]) => ({ ...seed, [chainId]: net.rpcUrls[0] }), {}),
  infuraId: "6d7e461ad6644743b92327579860b662"
})

export const metamaskQuery = detectEthereumProvider({ mustBeMetaMask: true, silent: true }) as Promise<IEthereumProvider & { selectedAddress: string } | null>



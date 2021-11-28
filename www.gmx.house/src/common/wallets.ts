import { replayLatest } from "@aelea/core"
import detectEthereumProvider from "@metamask/detect-provider"
import { awaitPromises, map, multicast, now } from "@most/core"
import WalletConnectProvider from "@walletconnect/ethereum-provider"
import { IEthereumProvider } from "eip1193-provider"
import { NETWORK_METADATA, CHAIN } from "@gambitdao/wallet-link"


export const walletConnect = replayLatest(multicast(map(() =>
  new WalletConnectProvider({
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
, now(null))))

export const metamask = replayLatest(multicast(awaitPromises(map(() =>
  detectEthereumProvider({ mustBeMetaMask: true, silent: true }) as Promise<IEthereumProvider & { selectedAddress: string } | null>
, now(null)))))



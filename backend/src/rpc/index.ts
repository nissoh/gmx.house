import { WebSocketProvider } from "@ethersproject/providers"


export const provider = new WebSocketProvider(
  "wss://arb-mainnet.g.alchemy.com/v2/plN3HlsQHek6-EiZjJO9BmDcqNGbW7X4"
)

// const provider = new EtherscanProvider()
// provider.getHistory('')
// const history = await provider.getHistory(address)
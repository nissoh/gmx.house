import { WebSocketProvider } from "@ethersproject/providers"


if (process.env.RPC_ALCHEMY_WSS === undefined) {
  throw new Error('missing in n RPC')
}

export const provider = new WebSocketProvider(process.env.RPC_ALCHEMY_WSS)

// const provider = new EtherscanProvider()
// provider.getHistory('')
// const history = await provider.getHistory(address)
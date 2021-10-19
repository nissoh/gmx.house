import { WebSocketProvider } from "@ethersproject/providers"


if (process.env.RPC_ALCHEMY_WSS === undefined) {
  throw new Error('missing provider reference in env variables')
}

if (process.env.RPC_ALCHEMY_MAINNET_WSS === undefined) {
  throw new Error('missing mainnet provider reference in env variables')
}

export const provider = new WebSocketProvider(process.env.RPC_ALCHEMY_WSS)
export const providerMainnet = new WebSocketProvider(process.env.RPC_ALCHEMY_MAINNET_WSS)

// const provider = new EtherscanProvider()
// provider.getHistory('')
// const history = await provider.getHistory(address)
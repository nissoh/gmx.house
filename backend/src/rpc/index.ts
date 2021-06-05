import { EtherscanProvider, JsonRpcProvider } from "@ethersproject/providers"


export const bscNini = new JsonRpcProvider(
  "https://bsc-dataseed1.ninicoin.io/",
  {
    chainId: 56,
    name: "bsc-mainnet",
  }
)

// const provider = new EtherscanProvider()
// provider.getHistory('')
// const history = await provider.getHistory(address)
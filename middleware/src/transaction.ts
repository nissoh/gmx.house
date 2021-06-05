import { BaseProvider, TransactionReceipt } from "@ethersproject/providers"
import { map } from "@most/core"
import { Stream } from "@most/types"
import { providerAction } from "./provider"

export const getTxDetails = (provider: Stream<BaseProvider>) => (txHash: string): Stream<TransactionReceipt | null> => {
  return providerAction(provider)(
    350,
    map(provider => provider.getTransactionReceipt(txHash))
  )
}


import { BaseProvider } from "@ethersproject/providers"
import { BSC_CONTRACTS } from "./address"
import { listen } from "./contract"
import { BscVault__factory } from "./contract/ethers-contracts"

export const gambitContract = (jsonProvider: BaseProvider) => {
  const vaultContract = BscVault__factory.connect(BSC_CONTRACTS.Vault, jsonProvider)
  const vaultEvent = listen(vaultContract)

  return {
    address: BSC_CONTRACTS.Vault,
    increasePosition: vaultEvent('IncreasePosition'),
    decreasePosition: vaultEvent('DecreasePosition'),
    updatePosition: vaultEvent('UpdatePosition'),
    closePosition: vaultEvent('ClosePosition'),
    liquidatePosition: vaultEvent('LiquidatePosition'),
    buyUSDG: vaultEvent('BuyUSDG'),
    swap: vaultEvent('Swap'),
    pnl: vaultEvent('UpdatePnl'),
  }
}

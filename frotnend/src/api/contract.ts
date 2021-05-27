import { BscVault__factory } from "./ethers-contracts"
import { awaitPromises, combine, map, multicast, skipRepeatsWith, switchLatest } from "@most/core"
import { state } from "@aelea/ui-components"
import { account } from "./account"
import { BSC_CONTRACTS } from "./address/contract"
import { providerAction, awaitProvider, metamaskEvent } from "./provider"
import { Address } from "./types"
import { bnToHex, formatFixed } from "./utils"
import { AddressZero } from "./address/token"
import { BaseContract, BigNumber, ContractTransaction, Signer } from "ethers"
import { Provider } from "@ethersproject/providers"

import { Scheduler, Sink, Stream, Disposable } from '@most/types'
import { disposeNone, disposeWith } from '@most/disposable'
import { BscVault, BscVaultInterface } from "./ethers-contracts/BscVault"
import { TypedEventFilter } from "./ethers-contracts/commons"

class FromCallbackSource<Targs extends any[]> {
  constructor(private callbackFunction: (cb: (...ev: Targs) => any) => any, private context: any) { }

  run(sink: Sink<Targs>, scheduler: Scheduler): Disposable {

    // very common that callback functions returns a destructor, perhaps a Disposable in a "most" case
    const maybeDisposable = this.callbackFunction.bind(this.context)((...args) => {
      sink.event(scheduler.currentTime(), args)
    })

    if (maybeDisposable instanceof Function) {
      return disposeWith(maybeDisposable, null)
    }

    if (maybeDisposable && 'dispose' in maybeDisposable && maybeDisposable?.dispose instanceof Function) {
      return maybeDisposable
    }

    return disposeNone()
  }
}


const fromCallback = <Targs extends any[]>(cbf: (cb: (...args: Targs) => any) => any, context: any = null): Stream<Targs> =>
  new FromCallbackSource(cbf, context)


const UPDATE_CONTRACT_INTERVAL = 1350

const formatBN = map((bnb: BigNumber) => formatFixed(BigInt(bnb.toBigInt())))
const skipRepeatedBns = skipRepeatsWith((bn1: BigNumber, bn2: BigNumber) => bn1.eq(bn2))
export const mainchainBalance = providerAction(UPDATE_CONTRACT_INTERVAL, combine(async (accountHash, provider) => provider.w3p.getBalance(accountHash), account))
export const mainchainBalanceReadable = formatBN(mainchainBalance)

export interface IContractBase<T extends BaseContract> {
  address: string

  // balance: Stream<BigNumber>
  // balanceReadable: Stream<string>

  contract: Stream<T>
  listen: <EventName extends string>(eventName: EventName) => Stream<ExtractEventType<T, EventName>>
}



export interface IContract<T extends BaseContract> extends IContractBase<T> {
  transfer(to: string, amount: bigint): Stream<ContractTransaction>
}


type ConnectFactoryFn<T extends BaseContract> = (address: Address, signerOrProvider: Signer | Provider) => T
type ExtractEventType<A extends BaseContract, B extends keyof A['filters']> = ReturnType<A['filters'][B]> extends TypedEventFilter<never, infer Z> ? Z : never

function baseActions<T extends BaseContract>(address: Address, contractFactory: ConnectFactoryFn<T>): IContractBase<T> {

  const contract = map(provider => {

    const signer = provider.w3p.getSigner()

    return contractFactory(address, signer)
  }, awaitProvider)


  const listen = <EventName extends string>(eventName: EventName): Stream<ExtractEventType<T, EventName>> => multicast(
    switchLatest(
      // const listen = (eventName: string) => switchLatest(
      map(({ contract }) => {

        return map(argsArray => {
          const arrLength = argsArray.length
          const eventDescriptor = argsArray[arrLength - 1] as any
          const argsObj: any = {}
        
          for (const prop in eventDescriptor.args) {
            if (Object.prototype.hasOwnProperty.call(eventDescriptor.args, prop) && !Number.isFinite(Number(prop))) {
              argsObj[prop] = eventDescriptor.args[prop]
            }
          }

          return argsObj
        }, fromCallback(cb => {
          contract.on(eventName, cb)
          return () => contract.off(eventName, cb)
        }))
      }, accountAndContract)
    )
  )

  const accountAndContract = state.combineState({ contract, account })

  // const balanceSource = combine(async ({ contract, account }) => {
  //   return contract.balanceOf(account)
  // }, accountAndContract)

  // const balance = skipRepeatedBns(providerAction(UPDATE_CONTRACT_INTERVAL, balanceSource))
  // const balanceReadable = formatBN(balance)

  return { contract, address, listen }
}


export const mainchainContract = {
  address: AddressZero,
  balance: skipRepeatedBns(mainchainBalance),
  balanceReadable: mainchainBalanceReadable,
  contract: null as any, // look into a way to make a compatible interface with mainnet
  listen: metamaskEvent,
  transfer(to: string, amount: bigint) {
    const accountAndContract = state.combineState({ awaitProvider, account })
    const request = map(async (w3) => {
      // txHash is a hex string
      // As with any RPC call, it may throw an error
      const txHash = await w3.awaitProvider.metamask.request({
        method: 'eth_sendTransaction',
        params: [
          { from: w3.account, to, value: bnToHex(amount) },
        ],
      })
      return txHash
    }, accountAndContract)

    const transferSignal = awaitPromises(request)
    return transferSignal
  }
}


const vaultActions = baseActions(BSC_CONTRACTS.Vault, BscVault__factory.connect)

export const vaultContract = {
  address: BSC_CONTRACTS.Vault,
  increasePosition: vaultActions.listen('IncreasePosition'),
  decreasePosition: vaultActions.listen('DecreasePosition'),
  updatePosition: vaultActions.listen('UpdatePosition'),
  closePosition: vaultActions.listen('ClosePosition'),
  liquidatePosition: vaultActions.listen('LiquidatePosition'),
  buyUSDG: vaultActions.listen('BuyUSDG'),
  swap: vaultActions.listen('Swap'),
  pnl: vaultActions.listen('UpdatePnl'),
  // www: map(contract => {
  //   type www = ExtractEventType<typeof contract, 'UpdatePosition'>
  // }, vaultActions.contract)
}



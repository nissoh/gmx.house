import { SYMBOL } from "./address"

export type Address = string

export interface IToken {
  label: string
  symbol: SYMBOL
}

export interface ITransaction {
  token: IToken,
  from: Address
  to: Address
  value: bigint
}
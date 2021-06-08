import { BSC_CONTRACTS, SYMBOL } from "./address"

export type Address = string

export interface Token {
  name: string;
  symbol: SYMBOL;
  decimals: number;
  address: BSC_CONTRACTS;
}

export interface Transaction {
  token: Token,
  from: Address
  to: Address
  value: bigint
}
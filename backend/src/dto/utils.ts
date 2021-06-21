import { Type } from "@mikro-orm/core"

export class NativeBigIntType extends Type<bigint, string> {
  convertToDatabaseValue(value: bigint): string {
    return value.toString()
  }

  convertToJSValue(value: string): bigint {
    if (value.indexOf('n') > -1) {
      return BigInt(value.slice(0, value.length - 1))
    }

    return BigInt(value)
  }

  toJSON(value: bigint | string) {
    return BigInt(value).toString()
  }
}

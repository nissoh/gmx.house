import { Type } from "@mikro-orm/core"

export class NativeBigIntType extends Type<bigint, string> {
  convertToDatabaseValue(value: bigint): string {
    return value.toString()
  }

  convertToJSValue(value: string): bigint {
    return BigInt(value)
  }

  toJSON(value: bigint | string) {
    return BigInt(value).toString()
  }
}

import { Entity, Index, Property } from '@mikro-orm/core'
import { BaseEntity } from './BaseEntity'
import { NativeBigIntType } from './utils'



export abstract class Position extends BaseEntity {
  @Property() key: string
  @Index() @Property() account: string
  @Property() collateralToken: string
  @Property() indexToken: string
  @Property() isLong: boolean

  constructor(
    key: string,
    account: string,
    isLong: boolean,
    indexToken: string,
    collateralToken: string,
  ) {
    super()
    this.key = key
    this.account = account
    this.isLong = isLong
    this.indexToken = indexToken
    this.collateralToken = collateralToken
  }
}

export abstract class PositionMake extends Position {
  @Property({ type: NativeBigIntType }) collateralDelta: bigint
  @Property({ type: NativeBigIntType }) price: bigint
  @Property({ type: NativeBigIntType }) sizeDelta: bigint

  constructor(price: bigint, collateralDelta: bigint, sizeDelta: bigint, ...pos: ConstructorParameters<typeof Position>) {
    super(...pos)
    this.price = price
    this.collateralDelta = collateralDelta
    this.sizeDelta = sizeDelta
  }
}

export abstract class PositionSettled extends Position {
  @Property({ type: NativeBigIntType }) reserveAmount: bigint
  @Property({ type: NativeBigIntType }) realisedPnl: bigint
  @Property({ type: NativeBigIntType }) collateral: bigint
  @Property({ type: NativeBigIntType }) size: bigint

  constructor(reserveAmount: bigint, realisedPnl: bigint, collateral: bigint, size: bigint, ...pos: ConstructorParameters<typeof Position>) {
    super(...pos)
    this.reserveAmount = reserveAmount
    this.realisedPnl = realisedPnl
    this.collateral = collateral
    this.size = size
  }
}


export abstract class PositionBaseUpdate extends PositionSettled {
  @Property({ type: NativeBigIntType }) averagePrice: bigint
  @Property({ type: NativeBigIntType }) entryFundingRate: bigint

  constructor(averagePrice: bigint, entryFundingRate: bigint, ...pos: ConstructorParameters<typeof PositionSettled>) {
    super(...pos)
    this.averagePrice = averagePrice
    this.entryFundingRate = entryFundingRate
  }
}

@Entity()
export class PositionIncrease extends PositionMake {
}

@Entity()
export class PositionDecrease extends PositionMake {
}

@Entity()
export class PositionUpdate extends PositionBaseUpdate {

}

@Entity()
export class PositionClose extends PositionBaseUpdate {

}

@Entity()
export class PositionLiquidated extends PositionSettled {
  @Property({ type: NativeBigIntType }) markPrice: bigint;

  constructor(markPrice: bigint, ...pos: ConstructorParameters<typeof PositionSettled>) {
    super(...pos)
    this.markPrice = markPrice
  }
}




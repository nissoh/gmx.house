import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { IClaim, IClaimSource } from 'gambit-middleware'

@Entity()
export class Claim implements IClaim {
  
  @Property() name: string
  @Property() sourceType: IClaimSource
  @Property() @Unique() account: string

  @PrimaryKey()
    id!: number

  constructor(account: string, name: string, sourceType: IClaimSource) {
    this.account = account
    this.name = name
    this.sourceType = sourceType
  }

}
import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { IClaim, IClaimSource } from 'gambit-middleware'

@Entity()
export class Claim implements IClaim {
  
  @Property() name: string
  @Property() data: string
  @Property() sourceType: IClaimSource
  @Property() @Unique() account: string

  @PrimaryKey()
    id!: number

  constructor(account: string, name: string, data: string, sourceType: IClaimSource) {
    this.account = account
    this.name = name
    this.data = data
    this.sourceType = sourceType
  }

}
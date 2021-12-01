import { Entity, PrimaryKey, Property, SerializedPrimaryKey, Unique } from '@mikro-orm/core'
import { ObjectId } from '@mikro-orm/mongodb'
import { IClaim, IClaimSource } from '@gambitdao/gmx-middleware'


export abstract class BaseEntity {

  @PrimaryKey() _id!: ObjectId
  @SerializedPrimaryKey() id!: string

  @Property() createdAt = new Date()
  @Property({ onUpdate: () => new Date() }) updatedAt = new Date()

}

@Entity()
export class Claim extends BaseEntity implements IClaim {
  
  @Property() name: string
  @Property() data: string
  @Property() @Unique() account: string
  
  @Property() sourceType: IClaimSource

  constructor(account: string, name: string, data: string, sourceType: IClaimSource) {
    super()
    this.account = account
    this.name = name
    this.data = data
    this.sourceType = sourceType
  }

}
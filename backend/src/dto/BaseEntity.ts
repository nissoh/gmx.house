
import { PrimaryKey, Property, SerializedPrimaryKey } from '@mikro-orm/core'
import { ObjectId } from '@mikro-orm/mongodb'
import { IBaseEntity } from 'gambit-middleware'

export abstract class BaseEntity implements IBaseEntity {

  @PrimaryKey() _id!: ObjectId;
  @SerializedPrimaryKey() id!: string;
  @Property() createdAt = new Date();

  // @Property({ onUpdate: () => new Date() })
  // updatedAt = new Date();

}

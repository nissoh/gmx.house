import { Entity, Property, Unique } from "@mikro-orm/core"
import { BaseEntity } from "./BaseEntity"

@Entity()
export class Claim extends BaseEntity {
  @Unique() @Property() address: string
  @Property() latestClaimBlockNumber: number
  @Property({ length: 140 }) identity: string

  constructor(
    address: string,
    identity: string,
    latestClaimBlockNumber: number,
  ) {
    super()
    this.address = address
    this.identity = identity
    this.latestClaimBlockNumber = latestClaimBlockNumber
  }
}

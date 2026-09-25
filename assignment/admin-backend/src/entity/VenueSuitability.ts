import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Venue } from "./Venue";
@Entity()
export class VenueSuitability {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Venue, venue => venue.venueSuitabilities, {onDelete: "CASCADE"})
  venue: Venue;

  @Column({ length: 50 })
  keyword: string;
}
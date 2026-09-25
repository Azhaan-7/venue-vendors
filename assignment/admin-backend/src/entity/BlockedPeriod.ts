import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Venue } from "./Venue";

@Entity()
export class BlockedPeriod {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Venue, venue => venue.blockedPeriods)
    venue: Venue;
    
    @Column({type: "date"})
    startDate: Date;

    @Column({type: "date"})
    endDate: Date;

    @Column()
    reason: string;
}
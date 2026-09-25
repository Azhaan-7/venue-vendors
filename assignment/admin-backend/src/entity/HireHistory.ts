import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { User } from "./User";
import { Venue } from "./Venue";

@Entity()
export class HireHistory {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.hireHistory)
    hirer: User;

    @ManyToOne(() => Venue, venue => venue.hireHistory)
    venue: Venue;

    @Column()
    eventName: string;

    @Column({type: "date"})
    eventDate: Date;

    @Column({type: "time"})
    eventTime: string;

    @Column()
    durationHours: number;

    @Column()
    rating: number;

    @Column("simple-array")
    documents: string[];
}
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from "typeorm";
import { User } from "./User";
import { Application } from "./Application";
import { ApplicationVenue } from "./ApplicationVenue";
import { VenueSuitability } from "./VenueSuitability";
import { BlockedPeriod } from "./BlockedPeriod";
import { HireHistory } from "./HireHistory";
import { ApplicationDraftVenue } from "./ApplicationDraftVenue";

@Entity()
export class Venue {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.venues)
    vendor: User;

    @Column({ length: 150 })
    name: string;

    @Column()
    location: string;

    @Column()
    capacity: number;

    @Column("decimal", { precision: 10, scale: 2 })
    price: number;

    @Column("text")
    description: string;

    @Column()
    image: string;

    @Column({ default: false })
    isFeatured: boolean;

    @OneToMany(() => Application, application => application.approvedVenue)
    applicationApproved: Application[];

    @OneToMany(() => ApplicationVenue, applicationVenue => applicationVenue.venue)
    applicationVenues: ApplicationVenue[];

    @OneToMany(() => VenueSuitability, suitability => suitability.venue)
    venueSuitabilities: VenueSuitability[];

    @OneToMany(() => BlockedPeriod, blockedPeriod => blockedPeriod.venue)
    blockedPeriods: BlockedPeriod[];

    @OneToMany(() => HireHistory, hireHistory => hireHistory.venue)
    hireHistory: HireHistory[];

    @OneToMany(() => ApplicationDraftVenue, applicationDraftVenue => applicationDraftVenue.venue)
    applicationDraftVenues: ApplicationDraftVenue[];
}

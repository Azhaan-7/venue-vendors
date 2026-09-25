import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from "typeorm";
import { User } from "./User";
import { ApplicationDraftVenue } from "./ApplicationDraftVenue";

@Entity()
export class ApplicationDraft {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.applicationDrafts)
    hirer: User;

    @Column({ length: 150, default: "" })
    eventName: string;

    @Column({ default: 0 })
    guest: number;

    @Column({ type: "date", nullable: true })
    eventDate: Date;

    @Column({ type: "time", nullable: true })
    eventTime: string;

    @Column({ default: 0 })
    durationHours: number;

    @OneToMany(() => ApplicationDraftVenue, applicationDraftVenue => applicationDraftVenue.applicationDraft)
    applicationDraftVenues: ApplicationDraftVenue[];
}
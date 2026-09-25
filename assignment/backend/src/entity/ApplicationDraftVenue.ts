import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Venue } from "./Venue";
import { ApplicationDraft } from "./ApplicationDraft";

@Entity()
export class ApplicationDraftVenue {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Venue, venue => venue.applicationDraftVenues)
    venue: Venue;

    @ManyToOne(() => ApplicationDraft, applicationDraft => applicationDraft.applicationDraftVenues)
    applicationDraft: ApplicationDraft;

    @Column()
    rankOrder: number;
}
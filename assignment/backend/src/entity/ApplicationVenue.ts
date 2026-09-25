import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { Venue } from "./Venue";
import { Application } from "./Application";

@Entity()
export class ApplicationVenue {
    @PrimaryGeneratedColumn()
    id: number;

    //venues.applicationApproved connected ranked venues to approved venues. This is the correct connection(i think)
    @ManyToOne(() => Venue, venue => venue.applicationVenues)
    venue: Venue;

    @ManyToOne(() => Application, application => application.applicationVenues)
    application: Application;

    @Column()
    rankOrder: number; 
}
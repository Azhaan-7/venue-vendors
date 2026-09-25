import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToOne, OneToMany } from "typeorm";
import { User } from "./User";
import { Venue } from "./Venue";
import { ApplicationVenue } from "./ApplicationVenue";
import { Comment } from "./Comment";
import { Review } from "./Review";
import { ApplicationStatus } from "./ApplicationStatus";

@Entity()
export class Application {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.applications)
    hirer: User;

    @Column({ length: 150 })
    eventName: string;

    @Column()
    guest: number;

    @Column({type: "date"})
    eventDate: Date;

    @Column({type: "time"})
    eventTime: string;

    @Column()
    durationHours: number;

    @Column({type: "simple-enum", enum: ApplicationStatus, default: ApplicationStatus.PENDING})
    status: ApplicationStatus;

    @Column({type: "text", nullable: true})
    rejectReason: string;

    @CreateDateColumn()
    dateApplied: Date;

    @Column({ type: "datetime", nullable: true })
    decisionDate: Date;

    @ManyToOne(() => Venue, venue => venue.applicationApproved, { nullable: true })
    approvedVenue: Venue;

    @OneToOne(() => Review, review => review.application)
    review: Review;

    @OneToMany(() => Comment, comment => comment.application)
    comments: Comment[];

    @OneToMany(() => ApplicationVenue, applicationVenue => applicationVenue.application)
    applicationVenues: ApplicationVenue[];
}
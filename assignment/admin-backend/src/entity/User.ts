import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, OneToMany } from "typeorm";
import { Profile } from "./Profile";
import { Venue } from "./Venue";
import { Application } from "./Application";
import { Review } from "./Review";
import { Comment } from "./Comment";
import { UserRole } from "./UserRole";
import { HireHistory } from "./HireHistory";
import { HirerDocument } from "./HirerDocument";
import { ApplicationDraft } from "./ApplicationDraft";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    email: string;

    @Column({ select: false })
    password: string;

    @Column({ type: "simple-enum", enum: UserRole, default: UserRole.HIRER })
    role: UserRole;

    @CreateDateColumn()
    dateJoined: Date;

    @OneToOne(() => Profile, profile => profile.user, { cascade: true })
    profile: Profile;

    @OneToMany(() => Venue, venue => venue.vendor)
    venues: Venue[];

    @OneToMany(() => Application, application => application.hirer)
    applications: Application[];

    @OneToMany(() => Review, review => review.hirer)
    reviewReceived: Review[];

    @OneToMany(() => Review, review => review.vendor)
    reviewProvided: Review[];

    @OneToMany(() => Comment, comment => comment.vendor)
    comments: Comment[];

    @OneToMany(() => HireHistory, hireHistory => hireHistory.hirer)
    hireHistory: HireHistory[];

    @OneToMany(() => HirerDocument, hirerDocument => hirerDocument.hirer)
    hirerDocuments: HirerDocument[];

    @OneToMany(() => ApplicationDraft, applicationDraft => applicationDraft.hirer)
    applicationDrafts: ApplicationDraft[];
}   
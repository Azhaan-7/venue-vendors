import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, JoinColumn } from "typeorm";
import { User } from "./User";
import { Application } from "./Application";

@Entity()
export class Review {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.reviewReceived)
    hirer: User;

    @ManyToOne(() => User, user => user.reviewProvided)
    vendor: User;

    @OneToOne(() => Application, application => application.review, { cascade: true })
    @JoinColumn()
    application: Application;
    
    @Column()
    rating: number;
}
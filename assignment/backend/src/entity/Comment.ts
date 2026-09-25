import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { User } from "./User";
import { Application } from "./Application";

@Entity()
export class Comment {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Application, application => application.comments)
    application: Application;

    @ManyToOne(() => User, user => user.comments)
    vendor: User;

    @Column("text")
    commentText: string;
}
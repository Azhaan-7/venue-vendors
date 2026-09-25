import { Entity, Column, OneToOne, JoinColumn, OneToMany, PrimaryColumn } from "typeorm";
import { User } from "./User";
import { UploadedDocument  } from "./UploadedDocument";

@Entity()
export class Profile {
    @PrimaryColumn()
    userId: number;
  
    @OneToOne(() => User, user => user.profile)
    @JoinColumn({ name: "userId" })
    user: User;

    @Column({ length: 100 })
    name: string;

    @Column({ length: 20 })
    phoneNumber: string;

    @Column({default:false})
    isBusiness: boolean;

    @Column({ length: 20, nullable: true })
    abn: string;

    @Column("decimal", { precision: 2, scale: 1, default: 0 })
    creditabilityScore: number;

    @OneToMany (() => UploadedDocument, document => document.profile)
    documents: UploadedDocument[];
}
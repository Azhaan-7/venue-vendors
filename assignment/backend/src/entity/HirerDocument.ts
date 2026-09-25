import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class HirerDocument {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.hirerDocuments)
    hirer: User;

    @Column({ length: 50 })
    documentType: string;

    @Column({ length: 255 })
    fileName: string;

    @Column({ length: 100 })
    mimeType: string;

    @Column("text")
    fileData: string;

    @CreateDateColumn()
    uploadedAt: Date;
}
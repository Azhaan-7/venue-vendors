import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { Profile } from "./Profile";
import { DocumentUploaded } from "./DocumentUploaded";

@Entity()
export class UploadedDocument {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Profile, profile => profile.documents)
    profile: Profile;

    @Column()
    documentType: string;

    @Column({ length: 100 })
    fileName: string;

    @Column({ length: 20 })
    fileType: string;
    
    @Column({type: "simple-enum", enum: DocumentUploaded})
    fileData: DocumentUploaded;

    @CreateDateColumn()
    timeUploaded: Date;
}
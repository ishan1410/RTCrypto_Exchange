import { Entity, PrimaryGeneratedColumn, Column, Index, Unique, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
@Unique(["userId", "currency"])
export class Wallet {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    userId!: string;

    @Column()
    currency!: string;

    @Column("bigint", { default: 0 }) // Storing as integer (cents/satoshis)
    balance!: string; // TypeORM returns bigint as string in JS

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}

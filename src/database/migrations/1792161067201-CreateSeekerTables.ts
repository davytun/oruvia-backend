import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSeekerTables1792161067201 implements MigrationInterface {
    name = 'CreateSeekerTables1792161067201'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "seeker_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "full_name" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "is_email_verified" boolean NOT NULL DEFAULT false, "email_verified_at" TIMESTAMP WITH TIME ZONE, "token_version" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_60626e6ab2a42bb7859ed3f728d" UNIQUE ("email"), CONSTRAINT "PK_2cd4461ce48a2d9d668fa9c4e9e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_seeker_users_email" ON "seeker_users"  ("email") `);
        await queryRunner.query(`CREATE TABLE "seeker_verification_codes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "seeker_id" uuid NOT NULL, "code_hash" character varying(255) NOT NULL, "purpose" character varying(50) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "max_attempts" integer NOT NULL DEFAULT '5', "used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9ece74cf4498340b40457e16294" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_seeker_codes_seeker_purpose" ON "seeker_verification_codes"  ("seeker_id", "purpose") `);
        await queryRunner.query(`ALTER TABLE "seeker_verification_codes" ADD CONSTRAINT "FK_f27c54813c144a552bc2c8b957e" FOREIGN KEY ("seeker_id") REFERENCES "seeker_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "seeker_verification_codes" DROP CONSTRAINT "FK_f27c54813c144a552bc2c8b957e"`);
        await queryRunner.query(`DROP INDEX "public"."idx_seeker_codes_seeker_purpose"`);
        await queryRunner.query(`DROP TABLE "seeker_verification_codes"`);
        await queryRunner.query(`DROP INDEX "public"."idx_seeker_users_email"`);
        await queryRunner.query(`DROP TABLE "seeker_users"`);
    }

}

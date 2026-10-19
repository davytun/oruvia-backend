import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLandlordTables1792161067202 implements MigrationInterface {
  name = 'CreateLandlordTables1792161067202';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "landlord_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "full_name" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "is_email_verified" boolean NOT NULL DEFAULT false, "email_verified_at" TIMESTAMP WITH TIME ZONE, "token_version" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_landlord_users_email" UNIQUE ("email"), CONSTRAINT "PK_landlord_users_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_landlord_users_email" ON "landlord_users" ("email")`,
    );
    await queryRunner.query(
      `CREATE TABLE "landlord_verification_codes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "landlord_id" uuid NOT NULL, "code_hash" character varying(255) NOT NULL, "purpose" character varying(50) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "max_attempts" integer NOT NULL DEFAULT '5', "used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_landlord_verification_codes_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_landlord_codes_landlord_purpose" ON "landlord_verification_codes" ("landlord_id", "purpose")`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_verification_codes" ADD CONSTRAINT "FK_landlord_codes_landlord_id" FOREIGN KEY ("landlord_id") REFERENCES "landlord_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "landlord_verification_codes" DROP CONSTRAINT "FK_landlord_codes_landlord_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_landlord_codes_landlord_purpose"`,
    );
    await queryRunner.query(`DROP TABLE "landlord_verification_codes"`);
    await queryRunner.query(`DROP INDEX "public"."idx_landlord_users_email"`);
    await queryRunner.query(`DROP TABLE "landlord_users"`);
  }
}

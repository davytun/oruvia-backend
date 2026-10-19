import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminTables1792161067204 implements MigrationInterface {
  name = 'CreateAdminTables1792161067204';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "admin_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "full_name" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "status" character varying(50) NOT NULL DEFAULT 'ACTIVE', "token_version" integer NOT NULL DEFAULT '0', "last_login_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_admin_users_email" UNIQUE ("email"), CONSTRAINT "PK_admin_users_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_admin_users_email" ON "admin_users" ("email")`,
    );
    await queryRunner.query(
      `CREATE TABLE "admin_verification_codes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "admin_id" uuid NOT NULL, "code_hash" character varying(255) NOT NULL, "purpose" character varying(50) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "max_attempts" integer NOT NULL DEFAULT '5', "used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_admin_verification_codes_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_admin_codes_admin_purpose" ON "admin_verification_codes" ("admin_id", "purpose")`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin_verification_codes" ADD CONSTRAINT "FK_admin_codes_admin_id" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "admin_verification_codes" DROP CONSTRAINT "FK_admin_codes_admin_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_admin_codes_admin_purpose"`,
    );
    await queryRunner.query(`DROP TABLE "admin_verification_codes"`);
    await queryRunner.query(`DROP INDEX "public"."idx_admin_users_email"`);
    await queryRunner.query(`DROP TABLE "admin_users"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAgentTables1792161067203 implements MigrationInterface {
  name = 'CreateAgentTables1792161067203';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "agent_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "full_name" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "is_email_verified" boolean NOT NULL DEFAULT false, "email_verified_at" TIMESTAMP WITH TIME ZONE, "token_version" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_agent_users_email" UNIQUE ("email"), CONSTRAINT "PK_agent_users_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_agent_users_email" ON "agent_users" ("email")`,
    );
    await queryRunner.query(
      `CREATE TABLE "agent_verification_codes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "agent_id" uuid NOT NULL, "code_hash" character varying(255) NOT NULL, "purpose" character varying(50) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "max_attempts" integer NOT NULL DEFAULT '5', "used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_agent_verification_codes_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_agent_codes_agent_purpose" ON "agent_verification_codes" ("agent_id", "purpose")`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_verification_codes" ADD CONSTRAINT "FK_agent_codes_agent_id" FOREIGN KEY ("agent_id") REFERENCES "agent_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent_verification_codes" DROP CONSTRAINT "FK_agent_codes_agent_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_agent_codes_agent_purpose"`,
    );
    await queryRunner.query(`DROP TABLE "agent_verification_codes"`);
    await queryRunner.query(`DROP INDEX "public"."idx_agent_users_email"`);
    await queryRunner.query(`DROP TABLE "agent_users"`);
  }
}

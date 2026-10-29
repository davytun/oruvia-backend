import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKycTables1792161067210 implements MigrationInterface {
  name = 'CreateKycTables1792161067210';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Denormalized verification status for the Verified badge (docs/kyc-module.md)
    await queryRunner.query(
      `ALTER TABLE "agent_users" ADD "verification_status" character varying(20) NOT NULL DEFAULT 'unverified'`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_users" ADD "verified_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_users" ADD "verification_status" character varying(20) NOT NULL DEFAULT 'unverified'`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_users" ADD "verified_at" TIMESTAMP WITH TIME ZONE`,
    );

    await queryRunner.query(
      `CREATE TABLE "agent_kyc_submissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "agent_id" uuid NOT NULL, "status" character varying(20) NOT NULL, "document_type" character varying(50) NOT NULL, "document_url" character varying(255) NOT NULL, "attempt" integer NOT NULL DEFAULT '1', "reviewed_by" uuid, "reviewed_at" TIMESTAMP WITH TIME ZONE, "rejection_reason" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_agent_kyc_submissions_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_agent_kyc_agent_status" ON "agent_kyc_submissions" ("agent_id", "status")`,
    );
    // Single active submission per agent, enforced at the database level
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_agent_kyc_pending_per_agent" ON "agent_kyc_submissions" ("agent_id") WHERE "status" = 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_kyc_submissions" ADD CONSTRAINT "FK_agent_kyc_agent_id" FOREIGN KEY ("agent_id") REFERENCES "agent_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_kyc_submissions" ADD CONSTRAINT "FK_agent_kyc_reviewed_by" FOREIGN KEY ("reviewed_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "landlord_kyc_submissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "landlord_id" uuid NOT NULL, "status" character varying(20) NOT NULL, "document_type" character varying(50) NOT NULL, "document_url" character varying(255) NOT NULL, "attempt" integer NOT NULL DEFAULT '1', "reviewed_by" uuid, "reviewed_at" TIMESTAMP WITH TIME ZONE, "rejection_reason" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_landlord_kyc_submissions_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_landlord_kyc_landlord_status" ON "landlord_kyc_submissions" ("landlord_id", "status")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_landlord_kyc_pending_per_landlord" ON "landlord_kyc_submissions" ("landlord_id") WHERE "status" = 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_kyc_submissions" ADD CONSTRAINT "FK_landlord_kyc_landlord_id" FOREIGN KEY ("landlord_id") REFERENCES "landlord_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_kyc_submissions" ADD CONSTRAINT "FK_landlord_kyc_reviewed_by" FOREIGN KEY ("reviewed_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "landlord_kyc_submissions" DROP CONSTRAINT "FK_landlord_kyc_reviewed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_kyc_submissions" DROP CONSTRAINT "FK_landlord_kyc_landlord_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."uq_landlord_kyc_pending_per_landlord"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_landlord_kyc_landlord_status"`,
    );
    await queryRunner.query(`DROP TABLE "landlord_kyc_submissions"`);

    await queryRunner.query(
      `ALTER TABLE "agent_kyc_submissions" DROP CONSTRAINT "FK_agent_kyc_reviewed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_kyc_submissions" DROP CONSTRAINT "FK_agent_kyc_agent_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."uq_agent_kyc_pending_per_agent"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_agent_kyc_agent_status"`,
    );
    await queryRunner.query(`DROP TABLE "agent_kyc_submissions"`);

    await queryRunner.query(
      `ALTER TABLE "landlord_users" DROP COLUMN "verified_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "landlord_users" DROP COLUMN "verification_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_users" DROP COLUMN "verified_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_users" DROP COLUMN "verification_status"`,
    );
  }
}

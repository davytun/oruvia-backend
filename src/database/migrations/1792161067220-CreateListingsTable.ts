import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateListingsTable1792161067220 implements MigrationInterface {
  name = 'CreateListingsTable1792161067220';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    );

    await queryRunner.query(
      `CREATE TABLE "listings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "lister_type" character varying(10) NOT NULL,
        "lister_id" uuid NOT NULL,
        "lister_display_name" character varying(255) NOT NULL,
        "lister_verified" boolean NOT NULL DEFAULT false,
        "title" character varying(120) NOT NULL,
        "listing_type" character varying(10) NOT NULL,
        "price" bigint NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'NGN',
        "state" character varying(60) NOT NULL,
        "city" character varying(60) NOT NULL,
        "address" text,
        "latitude" double precision,
        "longitude" double precision,
        "property_type" character varying(30) NOT NULL,
        "bedrooms" integer NOT NULL DEFAULT 0,
        "bathrooms" integer NOT NULL DEFAULT 0,
        "description" text NOT NULL,
        "amenities" text array NOT NULL DEFAULT '{}',
        "image_urls" text array NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_listings_id" PRIMARY KEY ("id"),
        CONSTRAINT "chk_listings_lister_type" CHECK ("lister_type" IN ('agent', 'landlord')),
        CONSTRAINT "chk_listings_listing_type" CHECK ("listing_type" IN ('rent', 'sale')),
        CONSTRAINT "chk_listings_status" CHECK ("status" IN ('active', 'rented', 'sold'))
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_listings_type_price" ON "listings" ("listing_type", "price")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_listings_location" ON "listings" ("state", "city")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_listings_property_type" ON "listings" ("property_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_listings_lister" ON "listings" ("lister_id")`,
    );
    // Partial index over the browsable set: active and not soft-deleted
    await queryRunner.query(
      `CREATE INDEX "idx_listings_active" ON "listings" ("created_at") WHERE "status" = 'active' AND "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_listings_active"`);
    await queryRunner.query(`DROP INDEX "public"."idx_listings_lister"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_listings_property_type"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_listings_location"`);
    await queryRunner.query(`DROP INDEX "public"."idx_listings_type_price"`);
    await queryRunner.query(`DROP TABLE "listings"`);
  }
}

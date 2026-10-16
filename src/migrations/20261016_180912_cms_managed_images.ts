import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "home" ADD COLUMN "about_image_id" integer;
  ALTER TABLE "_home_v" ADD COLUMN "version_about_image_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "logo_id" integer;
  ALTER TABLE "home" ADD CONSTRAINT "home_about_image_id_media_id_fk" FOREIGN KEY ("about_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_about_image_id_media_id_fk" FOREIGN KEY ("version_about_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "home_about_image_idx" ON "home" USING btree ("about_image_id");
  CREATE INDEX "_home_v_version_version_about_image_idx" ON "_home_v" USING btree ("version_about_image_id");
  CREATE INDEX "site_settings_logo_idx" ON "site_settings" USING btree ("logo_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "home" DROP CONSTRAINT "home_about_image_id_media_id_fk";

  ALTER TABLE "_home_v" DROP CONSTRAINT "_home_v_version_about_image_id_media_id_fk";

  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_logo_id_media_id_fk";

  DROP INDEX "home_about_image_idx";
  DROP INDEX "_home_v_version_version_about_image_idx";
  DROP INDEX "site_settings_logo_idx";
  ALTER TABLE "home" DROP COLUMN "about_image_id";
  ALTER TABLE "_home_v" DROP COLUMN "version_about_image_id";
  ALTER TABLE "site_settings" DROP COLUMN "logo_id";`)
}

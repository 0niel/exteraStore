CREATE TABLE "extera_plugins_category_translation" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"origin" text DEFAULT 'ai' NOT NULL,
	"source_hash" text NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_plugin_translation" (
	"id" serial PRIMARY KEY NOT NULL,
	"plugin_id" integer NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"short_description" text,
	"description" text NOT NULL,
	"requirements" text,
	"changelog" text,
	"tags" text,
	"origin" text DEFAULT 'ai' NOT NULL,
	"source_hash" text NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_plugin_version_translation" (
	"id" serial PRIMARY KEY NOT NULL,
	"version_id" integer NOT NULL,
	"locale" text NOT NULL,
	"changelog" text NOT NULL,
	"origin" text DEFAULT 'ai' NOT NULL,
	"source_hash" text NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_category" ADD COLUMN "content_locale" text DEFAULT 'und' NOT NULL;--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin" ADD COLUMN "content_locale" text DEFAULT 'und' NOT NULL;--> statement-breakpoint
UPDATE "extera_plugins_plugin" SET "content_locale" = CASE WHEN COALESCE("description", '') ~ '[А-Яа-яЁё]' THEN 'ru' ELSE 'en' END WHERE "content_locale" = 'und';--> statement-breakpoint
UPDATE "extera_plugins_plugin_category" SET "content_locale" = CASE WHEN COALESCE("description", "name", '') ~ '[А-Яа-яЁё]' THEN 'ru' ELSE 'en' END WHERE "content_locale" = 'und';--> statement-breakpoint
ALTER TABLE "extera_plugins_category_translation" ADD CONSTRAINT "extera_plugins_category_translation_category_id_extera_plugins_plugin_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."extera_plugins_plugin_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_translation" ADD CONSTRAINT "extera_plugins_plugin_translation_plugin_id_extera_plugins_plugin_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."extera_plugins_plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_version_translation" ADD CONSTRAINT "extera_plugins_plugin_version_translation_version_id_extera_plugins_plugin_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."extera_plugins_plugin_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "category_translation_locale_idx" ON "extera_plugins_category_translation" USING btree ("category_id","locale");--> statement-breakpoint
CREATE INDEX "category_translation_category_idx" ON "extera_plugins_category_translation" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plugin_translation_locale_idx" ON "extera_plugins_plugin_translation" USING btree ("plugin_id","locale");--> statement-breakpoint
CREATE INDEX "plugin_translation_plugin_idx" ON "extera_plugins_plugin_translation" USING btree ("plugin_id");--> statement-breakpoint
CREATE INDEX "plugin_translation_locale_search_idx" ON "extera_plugins_plugin_translation" USING btree ("locale","name");--> statement-breakpoint
CREATE UNIQUE INDEX "plugin_version_translation_locale_idx" ON "extera_plugins_plugin_version_translation" USING btree ("version_id","locale");--> statement-breakpoint
CREATE INDEX "plugin_version_translation_version_idx" ON "extera_plugins_plugin_version_translation" USING btree ("version_id");

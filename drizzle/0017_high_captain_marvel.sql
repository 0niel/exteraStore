CREATE TABLE "extera_plugins_ai_plugin_collection_translation" (
	"id" serial PRIMARY KEY NOT NULL,
	"collection_id" integer NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"origin" varchar(16) DEFAULT 'ai' NOT NULL,
	"source_hash" text NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_content_translation_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(32) NOT NULL,
	"entity_id" integer NOT NULL,
	"target_locale" varchar(8) NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" integer DEFAULT extract(epoch from now()) NOT NULL,
	"started_at" integer,
	"completed_at" integer,
	"error_message" text,
	"requested_by_id" text,
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_plugin_pipeline_check_translation" (
	"id" serial PRIMARY KEY NOT NULL,
	"check_id" integer NOT NULL,
	"locale" varchar(8) NOT NULL,
	"short_description" text,
	"details" text,
	"origin" varchar(16) DEFAULT 'ai' NOT NULL,
	"source_hash" text NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extera_plugins_ai_plugin_collection" ADD COLUMN "content_locale" varchar(8) DEFAULT 'ru' NOT NULL;--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_pipeline_check" ADD COLUMN "content_locale" varchar(8) DEFAULT 'ru' NOT NULL;--> statement-breakpoint
ALTER TABLE "extera_plugins_ai_plugin_collection_translation" ADD CONSTRAINT "extera_plugins_ai_plugin_collection_translation_collection_id_extera_plugins_ai_plugin_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."extera_plugins_ai_plugin_collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_content_translation_queue" ADD CONSTRAINT "extera_plugins_content_translation_queue_requested_by_id_extera_plugins_user_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."extera_plugins_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_pipeline_check_translation" ADD CONSTRAINT "extera_plugins_plugin_pipeline_check_translation_check_id_extera_plugins_plugin_pipeline_check_id_fk" FOREIGN KEY ("check_id") REFERENCES "public"."extera_plugins_plugin_pipeline_check"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_collection_translation_locale_idx" ON "extera_plugins_ai_plugin_collection_translation" USING btree ("collection_id","locale");--> statement-breakpoint
CREATE INDEX "ai_collection_translation_collection_idx" ON "extera_plugins_ai_plugin_collection_translation" USING btree ("collection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_translation_queue_entity_idx" ON "extera_plugins_content_translation_queue" USING btree ("entity_type","entity_id","target_locale");--> statement-breakpoint
CREATE INDEX "content_translation_queue_status_idx" ON "extera_plugins_content_translation_queue" USING btree ("status","available_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_check_translation_locale_idx" ON "extera_plugins_plugin_pipeline_check_translation" USING btree ("check_id","locale");--> statement-breakpoint
CREATE INDEX "pipeline_check_translation_check_idx" ON "extera_plugins_plugin_pipeline_check_translation" USING btree ("check_id");
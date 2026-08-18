CREATE TABLE "extera_plugins_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"actor_id" text,
	"plugin_id" integer,
	"version_id" integer,
	"review_id" integer,
	"rating" integer,
	"message" text,
	"data" text,
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_download" ADD COLUMN "version_id" integer;--> statement-breakpoint
ALTER TABLE "extera_plugins_user" ADD COLUMN "is_banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "extera_plugins_user" ADD COLUMN "banned_at" integer;--> statement-breakpoint
ALTER TABLE "extera_plugins_user" ADD COLUMN "banned_reason" text;--> statement-breakpoint
ALTER TABLE "extera_plugins_user" ADD COLUMN "banned_by" text;--> statement-breakpoint
ALTER TABLE "extera_plugins_activity" ADD CONSTRAINT "extera_plugins_activity_actor_id_extera_plugins_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."extera_plugins_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_activity" ADD CONSTRAINT "extera_plugins_activity_plugin_id_extera_plugins_plugin_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."extera_plugins_plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_activity" ADD CONSTRAINT "extera_plugins_activity_version_id_extera_plugins_plugin_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."extera_plugins_plugin_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_activity" ADD CONSTRAINT "extera_plugins_activity_review_id_extera_plugins_plugin_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."extera_plugins_plugin_review"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_type_idx" ON "extera_plugins_activity" USING btree ("type");--> statement-breakpoint
CREATE INDEX "activity_created_at_idx" ON "extera_plugins_activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "activity_plugin_idx" ON "extera_plugins_activity" USING btree ("plugin_id");--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_download" ADD CONSTRAINT "extera_plugins_plugin_download_version_id_extera_plugins_plugin_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."extera_plugins_plugin_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "download_version_idx" ON "extera_plugins_plugin_download" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "download_unique_user_version_idx" ON "extera_plugins_plugin_download" USING btree ("user_id","version_id");--> statement-breakpoint
CREATE INDEX "is_banned_idx" ON "extera_plugins_user" USING btree ("is_banned");
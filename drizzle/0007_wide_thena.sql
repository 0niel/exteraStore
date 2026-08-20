CREATE TABLE "extera_plugins_ai_artifact" (
	"id" serial PRIMARY KEY NOT NULL,
	"plugin_id" integer,
	"kind" varchar(64) NOT NULL,
	"cache_key" varchar(256) NOT NULL,
	"locale" varchar(8) NOT NULL,
	"content" text NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extera_plugins_ai_artifact" ADD CONSTRAINT "extera_plugins_ai_artifact_plugin_id_extera_plugins_plugin_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."extera_plugins_plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_artifact_cache_key_idx" ON "extera_plugins_ai_artifact" USING btree ("cache_key");--> statement-breakpoint
CREATE INDEX "ai_artifact_plugin_idx" ON "extera_plugins_ai_artifact" USING btree ("plugin_id");--> statement-breakpoint
CREATE INDEX "ai_artifact_kind_idx" ON "extera_plugins_ai_artifact" USING btree ("kind");
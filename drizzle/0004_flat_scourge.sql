CREATE TABLE "extera_plugins_ai_plugin_collection" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"plugin_ids" integer[] NOT NULL,
	"generated_at" integer DEFAULT extract(epoch from now()) NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ai_collection_name_idx" ON "extera_plugins_ai_plugin_collection" USING btree ("name");--> statement-breakpoint
CREATE INDEX "ai_collection_generated_at_idx" ON "extera_plugins_ai_plugin_collection" USING btree ("generated_at");
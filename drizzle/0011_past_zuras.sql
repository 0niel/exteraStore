CREATE TABLE "extera_plugins_plugin_dependency" (
	"id" serial PRIMARY KEY NOT NULL,
	"plugin_id" integer NOT NULL,
	"dependency_plugin_id" integer NOT NULL,
	"dependency_type" text DEFAULT 'required' NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_dependency" ADD CONSTRAINT "extera_plugins_plugin_dependency_plugin_id_extera_plugins_plugin_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."extera_plugins_plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_dependency" ADD CONSTRAINT "extera_plugins_plugin_dependency_dependency_plugin_id_extera_plugins_plugin_id_fk" FOREIGN KEY ("dependency_plugin_id") REFERENCES "public"."extera_plugins_plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "plugin_dependency_unique_idx" ON "extera_plugins_plugin_dependency" USING btree ("plugin_id","dependency_plugin_id");--> statement-breakpoint
CREATE INDEX "plugin_dependency_plugin_idx" ON "extera_plugins_plugin_dependency" USING btree ("plugin_id");--> statement-breakpoint
CREATE INDEX "plugin_dependency_target_idx" ON "extera_plugins_plugin_dependency" USING btree ("dependency_plugin_id");--> statement-breakpoint
CREATE INDEX "plugin_dependency_type_idx" ON "extera_plugins_plugin_dependency" USING btree ("dependency_type");--> statement-breakpoint
CREATE INDEX "pipeline_plugin_type_created_idx" ON "extera_plugins_plugin_pipeline_check" USING btree ("plugin_id","check_type","created_at");--> statement-breakpoint
CREATE INDEX "queue_plugin_status_created_idx" ON "extera_plugins_plugin_pipeline_queue" USING btree ("plugin_id","status","created_at");
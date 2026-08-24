CREATE TABLE "extera_plugins_api_key_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_key_id" integer NOT NULL,
	"method" varchar(12) NOT NULL,
	"path" varchar(256) NOT NULL,
	"status_code" integer NOT NULL,
	"latency_ms" integer NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_api_key" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(80) NOT NULL,
	"prefix" varchar(24) NOT NULL,
	"secret_hash" varchar(64) NOT NULL,
	"scopes" text NOT NULL,
	"expires_at" integer,
	"last_used_at" integer,
	"last_ip_hash" varchar(64),
	"revoked_at" integer,
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_webhook_delivery" (
	"id" serial PRIMARY KEY NOT NULL,
	"webhook_id" integer NOT NULL,
	"event" varchar(80) NOT NULL,
	"payload" text NOT NULL,
	"status" varchar(24) NOT NULL,
	"response_status" integer,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"error_message" text,
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL,
	"delivered_at" integer
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_webhook" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(80) NOT NULL,
	"url" text NOT NULL,
	"events" text NOT NULL,
	"secret_encrypted" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"last_delivery_at" integer,
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL,
	"updated_at" integer
);
--> statement-breakpoint
ALTER TABLE "extera_plugins_api_key_usage" ADD CONSTRAINT "extera_plugins_api_key_usage_api_key_id_extera_plugins_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."extera_plugins_api_key"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_api_key" ADD CONSTRAINT "extera_plugins_api_key_user_id_extera_plugins_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."extera_plugins_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_webhook_delivery" ADD CONSTRAINT "extera_plugins_webhook_delivery_webhook_id_extera_plugins_webhook_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."extera_plugins_webhook"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_webhook" ADD CONSTRAINT "extera_plugins_webhook_user_id_extera_plugins_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."extera_plugins_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_key_usage_key_idx" ON "extera_plugins_api_key_usage" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "api_key_usage_created_idx" ON "extera_plugins_api_key_usage" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "api_key_secret_hash_idx" ON "extera_plugins_api_key" USING btree ("secret_hash");--> statement-breakpoint
CREATE INDEX "api_key_user_idx" ON "extera_plugins_api_key" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_key_prefix_idx" ON "extera_plugins_api_key" USING btree ("prefix");--> statement-breakpoint
CREATE INDEX "api_key_expiry_idx" ON "extera_plugins_api_key" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "webhook_delivery_webhook_idx" ON "extera_plugins_webhook_delivery" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "webhook_delivery_created_idx" ON "extera_plugins_webhook_delivery" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webhook_delivery_status_idx" ON "extera_plugins_webhook_delivery" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webhook_user_idx" ON "extera_plugins_webhook" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "webhook_active_idx" ON "extera_plugins_webhook" USING btree ("is_active");
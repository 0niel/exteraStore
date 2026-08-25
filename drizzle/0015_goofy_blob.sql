CREATE TABLE "extera_plugins_developer_rate_limit" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject_key" varchar(160) NOT NULL,
	"scope" varchar(80) NOT NULL,
	"window_start" integer NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"expires_at" integer NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "developer_rate_limit_window_idx" ON "extera_plugins_developer_rate_limit" USING btree ("subject_key","scope","window_start");--> statement-breakpoint
CREATE INDEX "developer_rate_limit_expiry_idx" ON "extera_plugins_developer_rate_limit" USING btree ("expires_at");
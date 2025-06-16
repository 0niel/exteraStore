CREATE TABLE "extera_plugins_account" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "extera_plugins_account_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_plugin_category" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"icon" text,
	"color" text,
	"created_at" integer DEFAULT (extract(epoch from now())) NOT NULL,
	CONSTRAINT "extera_plugins_plugin_category_name_unique" UNIQUE("name"),
	CONSTRAINT "extera_plugins_plugin_category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_plugin_download" (
	"id" serial PRIMARY KEY NOT NULL,
	"plugin_id" integer NOT NULL,
	"user_id" text,
	"ip_address" text,
	"user_agent" text,
	"downloaded_at" integer DEFAULT (extract(epoch from now())) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_plugin_favorite" (
	"id" serial PRIMARY KEY NOT NULL,
	"plugin_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"created_at" integer DEFAULT (extract(epoch from now())) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_plugin_file" (
	"id" serial PRIMARY KEY NOT NULL,
	"plugin_id" integer NOT NULL,
	"version_id" integer,
	"filename" text NOT NULL,
	"content" text NOT NULL,
	"size" integer NOT NULL,
	"hash" text NOT NULL,
	"mime_type" text DEFAULT 'text/x-python' NOT NULL,
	"git_path" text,
	"created_at" integer DEFAULT (extract(epoch from now())) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_plugin_git_repo" (
	"id" serial PRIMARY KEY NOT NULL,
	"plugin_id" integer NOT NULL,
	"repo_url" text NOT NULL,
	"branch" text DEFAULT 'main' NOT NULL,
	"file_path" text NOT NULL,
	"access_token" text,
	"last_sync_at" integer,
	"last_commit_hash" text,
	"auto_sync" boolean DEFAULT false NOT NULL,
	"sync_interval" integer DEFAULT 3600 NOT NULL,
	"created_at" integer DEFAULT (extract(epoch from now())) NOT NULL,
	"updated_at" integer
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_plugin_review" (
	"id" serial PRIMARY KEY NOT NULL,
	"plugin_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"title" text,
	"comment" text,
	"helpful" integer DEFAULT 0 NOT NULL,
	"created_at" integer DEFAULT (extract(epoch from now())) NOT NULL,
	"updated_at" integer
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_plugin_version" (
	"id" serial PRIMARY KEY NOT NULL,
	"plugin_id" integer NOT NULL,
	"version" text NOT NULL,
	"changelog" text,
	"file_content" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_hash" text NOT NULL,
	"git_commit_hash" text,
	"git_branch" text,
	"git_tag" text,
	"is_stable" boolean DEFAULT true NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"created_at" integer DEFAULT (extract(epoch from now())) NOT NULL,
	"created_by_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_plugin" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"short_description" text,
	"version" text NOT NULL,
	"author" text NOT NULL,
	"author_id" text,
	"category" text NOT NULL,
	"tags" text,
	"download_count" integer DEFAULT 0 NOT NULL,
	"rating" real DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"price" real DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"telegram_bot_deeplink" text,
	"github_url" text,
	"documentation_url" text,
	"screenshots" text,
	"requirements" text,
	"changelog" text,
	"created_at" integer DEFAULT (extract(epoch from now())) NOT NULL,
	"updated_at" integer,
	CONSTRAINT "extera_plugins_plugin_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_post" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"created_by_id" text NOT NULL,
	"created_at" integer DEFAULT (extract(epoch from now())) NOT NULL,
	"updated_at" integer
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_session" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" integer,
	"image" text,
	"telegram_id" text,
	"telegram_username" text,
	"telegram_first_name" text,
	"telegram_last_name" text,
	"github_username" text,
	"bio" text,
	"website" text,
	"links" text,
	"role" text DEFAULT 'user' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" integer DEFAULT (extract(epoch from now())) NOT NULL,
	"updated_at" integer,
	CONSTRAINT "extera_plugins_user_telegram_id_unique" UNIQUE("telegram_id")
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_verification_token" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" integer NOT NULL,
	CONSTRAINT "extera_plugins_verification_token_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_notification" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plugin_id" integer,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"data" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"sent_to_telegram" boolean DEFAULT false NOT NULL,
	"telegram_message_id" text,
	"created_at" integer DEFAULT (extract(epoch from now())) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_plugin_pipeline_check" (
	"id" serial PRIMARY KEY NOT NULL,
	"plugin_id" integer NOT NULL,
	"check_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"score" real,
	"details" text,
	"error_message" text,
	"llm_model" text,
	"llm_prompt" text,
	"llm_response" text,
	"execution_time" integer,
	"created_at" integer DEFAULT (extract(epoch from now())) NOT NULL,
	"completed_at" integer
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_plugin_pipeline_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"plugin_id" integer NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"error_message" text,
	"scheduled_at" integer,
	"started_at" integer,
	"completed_at" integer,
	"created_at" integer DEFAULT (extract(epoch from now())) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_user_notification_setting" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"enable_plugin_updates" boolean DEFAULT true NOT NULL,
	"enable_security_alerts" boolean DEFAULT true NOT NULL,
	"enable_review_notifications" boolean DEFAULT false NOT NULL,
	"enable_telegram_notifications" boolean DEFAULT true NOT NULL,
	"telegram_chat_id" text,
	"created_at" integer DEFAULT (extract(epoch from now())) NOT NULL,
	"updated_at" integer,
	CONSTRAINT "extera_plugins_user_notification_setting_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "extera_plugins_user_plugin_subscription" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plugin_id" integer NOT NULL,
	"subscription_type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"telegram_chat_id" text,
	"created_at" integer DEFAULT (extract(epoch from now())) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extera_plugins_account" ADD CONSTRAINT "extera_plugins_account_user_id_extera_plugins_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."extera_plugins_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_download" ADD CONSTRAINT "extera_plugins_plugin_download_plugin_id_extera_plugins_plugin_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."extera_plugins_plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_download" ADD CONSTRAINT "extera_plugins_plugin_download_user_id_extera_plugins_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."extera_plugins_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_favorite" ADD CONSTRAINT "extera_plugins_plugin_favorite_plugin_id_extera_plugins_plugin_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."extera_plugins_plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_favorite" ADD CONSTRAINT "extera_plugins_plugin_favorite_user_id_extera_plugins_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."extera_plugins_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_file" ADD CONSTRAINT "extera_plugins_plugin_file_plugin_id_extera_plugins_plugin_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."extera_plugins_plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_file" ADD CONSTRAINT "extera_plugins_plugin_file_version_id_extera_plugins_plugin_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."extera_plugins_plugin_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_git_repo" ADD CONSTRAINT "extera_plugins_plugin_git_repo_plugin_id_extera_plugins_plugin_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."extera_plugins_plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_review" ADD CONSTRAINT "extera_plugins_plugin_review_plugin_id_extera_plugins_plugin_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."extera_plugins_plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_review" ADD CONSTRAINT "extera_plugins_plugin_review_user_id_extera_plugins_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."extera_plugins_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_version" ADD CONSTRAINT "extera_plugins_plugin_version_plugin_id_extera_plugins_plugin_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."extera_plugins_plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_version" ADD CONSTRAINT "extera_plugins_plugin_version_created_by_id_extera_plugins_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."extera_plugins_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin" ADD CONSTRAINT "extera_plugins_plugin_author_id_extera_plugins_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."extera_plugins_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_post" ADD CONSTRAINT "extera_plugins_post_created_by_id_extera_plugins_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."extera_plugins_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_session" ADD CONSTRAINT "extera_plugins_session_user_id_extera_plugins_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."extera_plugins_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_notification" ADD CONSTRAINT "extera_plugins_notification_user_id_extera_plugins_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."extera_plugins_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_notification" ADD CONSTRAINT "extera_plugins_notification_plugin_id_extera_plugins_plugin_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."extera_plugins_plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_pipeline_check" ADD CONSTRAINT "extera_plugins_plugin_pipeline_check_plugin_id_extera_plugins_plugin_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."extera_plugins_plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_pipeline_queue" ADD CONSTRAINT "extera_plugins_plugin_pipeline_queue_plugin_id_extera_plugins_plugin_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."extera_plugins_plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_user_notification_setting" ADD CONSTRAINT "extera_plugins_user_notification_setting_user_id_extera_plugins_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."extera_plugins_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_user_plugin_subscription" ADD CONSTRAINT "extera_plugins_user_plugin_subscription_user_id_extera_plugins_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."extera_plugins_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extera_plugins_user_plugin_subscription" ADD CONSTRAINT "extera_plugins_user_plugin_subscription_plugin_id_extera_plugins_plugin_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."extera_plugins_plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "extera_plugins_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "category_slug_idx" ON "extera_plugins_plugin_category" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "download_plugin_idx" ON "extera_plugins_plugin_download" USING btree ("plugin_id");--> statement-breakpoint
CREATE INDEX "download_user_idx" ON "extera_plugins_plugin_download" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "download_date_idx" ON "extera_plugins_plugin_download" USING btree ("downloaded_at");--> statement-breakpoint
CREATE INDEX "favorite_plugin_idx" ON "extera_plugins_plugin_favorite" USING btree ("plugin_id");--> statement-breakpoint
CREATE INDEX "favorite_user_idx" ON "extera_plugins_plugin_favorite" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "favorite_unique_idx" ON "extera_plugins_plugin_favorite" USING btree ("plugin_id","user_id");--> statement-breakpoint
CREATE INDEX "file_plugin_idx" ON "extera_plugins_plugin_file" USING btree ("plugin_id");--> statement-breakpoint
CREATE INDEX "file_version_idx" ON "extera_plugins_plugin_file" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "file_hash_idx" ON "extera_plugins_plugin_file" USING btree ("hash");--> statement-breakpoint
CREATE INDEX "git_repo_plugin_idx" ON "extera_plugins_plugin_git_repo" USING btree ("plugin_id");--> statement-breakpoint
CREATE INDEX "git_repo_sync_idx" ON "extera_plugins_plugin_git_repo" USING btree ("last_sync_at");--> statement-breakpoint
CREATE INDEX "review_plugin_idx" ON "extera_plugins_plugin_review" USING btree ("plugin_id");--> statement-breakpoint
CREATE INDEX "review_user_idx" ON "extera_plugins_plugin_review" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "review_unique_idx" ON "extera_plugins_plugin_review" USING btree ("plugin_id","user_id");--> statement-breakpoint
CREATE INDEX "version_plugin_idx" ON "extera_plugins_plugin_version" USING btree ("plugin_id");--> statement-breakpoint
CREATE INDEX "version_created_idx" ON "extera_plugins_plugin_version" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "version_stable_idx" ON "extera_plugins_plugin_version" USING btree ("is_stable");--> statement-breakpoint
CREATE INDEX "version_unique_idx" ON "extera_plugins_plugin_version" USING btree ("plugin_id","version");--> statement-breakpoint
CREATE INDEX "plugin_slug_idx" ON "extera_plugins_plugin" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "plugin_category_idx" ON "extera_plugins_plugin" USING btree ("category");--> statement-breakpoint
CREATE INDEX "plugin_author_idx" ON "extera_plugins_plugin" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "plugin_status_idx" ON "extera_plugins_plugin" USING btree ("status");--> statement-breakpoint
CREATE INDEX "plugin_featured_idx" ON "extera_plugins_plugin" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "created_by_idx" ON "extera_plugins_post" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "name_idx" ON "extera_plugins_post" USING btree ("name");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "extera_plugins_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "created_at_idx" ON "extera_plugins_user" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "updated_at_idx" ON "extera_plugins_user" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "extera_plugins_notification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_plugin_idx" ON "extera_plugins_notification" USING btree ("plugin_id");--> statement-breakpoint
CREATE INDEX "notification_type_idx" ON "extera_plugins_notification" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notification_read_idx" ON "extera_plugins_notification" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "pipeline_plugin_idx" ON "extera_plugins_plugin_pipeline_check" USING btree ("plugin_id");--> statement-breakpoint
CREATE INDEX "pipeline_status_idx" ON "extera_plugins_plugin_pipeline_check" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pipeline_type_idx" ON "extera_plugins_plugin_pipeline_check" USING btree ("check_type");--> statement-breakpoint
CREATE INDEX "queue_status_idx" ON "extera_plugins_plugin_pipeline_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "queue_priority_idx" ON "extera_plugins_plugin_pipeline_queue" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "queue_scheduled_idx" ON "extera_plugins_plugin_pipeline_queue" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "notification_settings_user_idx" ON "extera_plugins_user_notification_setting" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscription_user_idx" ON "extera_plugins_user_plugin_subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscription_plugin_idx" ON "extera_plugins_user_plugin_subscription" USING btree ("plugin_id");--> statement-breakpoint
CREATE INDEX "subscription_type_idx" ON "extera_plugins_user_plugin_subscription" USING btree ("subscription_type");--> statement-breakpoint
CREATE INDEX "subscription_unique_idx" ON "extera_plugins_user_plugin_subscription" USING btree ("user_id","plugin_id","subscription_type");
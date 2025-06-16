ALTER TABLE "extera_plugins_plugin_category" ALTER COLUMN "created_at" SET DEFAULT extract(epoch from now());--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_download" ALTER COLUMN "downloaded_at" SET DEFAULT extract(epoch from now());--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_favorite" ALTER COLUMN "created_at" SET DEFAULT extract(epoch from now());--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_file" ALTER COLUMN "created_at" SET DEFAULT extract(epoch from now());--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_git_repo" ALTER COLUMN "created_at" SET DEFAULT extract(epoch from now());--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_review" ALTER COLUMN "created_at" SET DEFAULT extract(epoch from now());--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_version" ALTER COLUMN "created_at" SET DEFAULT extract(epoch from now());--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin" ALTER COLUMN "created_at" SET DEFAULT extract(epoch from now());--> statement-breakpoint
ALTER TABLE "extera_plugins_post" ALTER COLUMN "created_at" SET DEFAULT extract(epoch from now());--> statement-breakpoint
ALTER TABLE "extera_plugins_user" ALTER COLUMN "created_at" SET DEFAULT extract(epoch from now());--> statement-breakpoint
ALTER TABLE "extera_plugins_notification" ALTER COLUMN "created_at" SET DEFAULT extract(epoch from now());--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_pipeline_check" ALTER COLUMN "created_at" SET DEFAULT extract(epoch from now());--> statement-breakpoint
ALTER TABLE "extera_plugins_plugin_pipeline_queue" ALTER COLUMN "created_at" SET DEFAULT extract(epoch from now());--> statement-breakpoint
ALTER TABLE "extera_plugins_user_notification_setting" ALTER COLUMN "created_at" SET DEFAULT extract(epoch from now());--> statement-breakpoint
ALTER TABLE "extera_plugins_user_plugin_subscription" ALTER COLUMN "created_at" SET DEFAULT extract(epoch from now());
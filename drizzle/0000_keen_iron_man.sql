CREATE TABLE `extera_plugins_account` (
	`userId` text(255) NOT NULL,
	`type` text(255) NOT NULL,
	`provider` text(255) NOT NULL,
	`providerAccountId` text(255) NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text(255),
	`scope` text(255),
	`id_token` text,
	`session_state` text(255),
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `extera_plugins_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `extera_plugins_account` (`userId`);--> statement-breakpoint
CREATE TABLE `extera_plugins_plugin_category` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(100) NOT NULL,
	`slug` text(100) NOT NULL,
	`description` text,
	`icon` text(100),
	`color` text(50),
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `extera_plugins_plugin_category_name_unique` ON `extera_plugins_plugin_category` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `extera_plugins_plugin_category_slug_unique` ON `extera_plugins_plugin_category` (`slug`);--> statement-breakpoint
CREATE INDEX `category_slug_idx` ON `extera_plugins_plugin_category` (`slug`);--> statement-breakpoint
CREATE TABLE `extera_plugins_plugin_download` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pluginId` integer NOT NULL,
	`userId` text(255),
	`ipAddress` text(45),
	`userAgent` text(500),
	`downloadedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`pluginId`) REFERENCES `extera_plugins_plugin`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `extera_plugins_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `download_plugin_idx` ON `extera_plugins_plugin_download` (`pluginId`);--> statement-breakpoint
CREATE INDEX `download_user_idx` ON `extera_plugins_plugin_download` (`userId`);--> statement-breakpoint
CREATE INDEX `download_date_idx` ON `extera_plugins_plugin_download` (`downloadedAt`);--> statement-breakpoint
CREATE TABLE `extera_plugins_plugin_file` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pluginId` integer NOT NULL,
	`versionId` integer,
	`filename` text(255) NOT NULL,
	`content` text NOT NULL,
	`size` integer NOT NULL,
	`hash` text(64) NOT NULL,
	`mimeType` text(100) DEFAULT 'text/x-python' NOT NULL,
	`gitPath` text(500),
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`pluginId`) REFERENCES `extera_plugins_plugin`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`versionId`) REFERENCES `extera_plugins_plugin_version`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `file_plugin_idx` ON `extera_plugins_plugin_file` (`pluginId`);--> statement-breakpoint
CREATE INDEX `file_version_idx` ON `extera_plugins_plugin_file` (`versionId`);--> statement-breakpoint
CREATE INDEX `file_hash_idx` ON `extera_plugins_plugin_file` (`hash`);--> statement-breakpoint
CREATE TABLE `extera_plugins_plugin_git_repo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pluginId` integer NOT NULL,
	`repoUrl` text(500) NOT NULL,
	`branch` text(100) DEFAULT 'main' NOT NULL,
	`filePath` text(500) NOT NULL,
	`accessToken` text(500),
	`lastSyncAt` integer,
	`lastCommitHash` text(40),
	`autoSync` integer DEFAULT false NOT NULL,
	`syncInterval` integer DEFAULT 3600 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`pluginId`) REFERENCES `extera_plugins_plugin`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `git_repo_plugin_idx` ON `extera_plugins_plugin_git_repo` (`pluginId`);--> statement-breakpoint
CREATE INDEX `git_repo_sync_idx` ON `extera_plugins_plugin_git_repo` (`lastSyncAt`);--> statement-breakpoint
CREATE TABLE `extera_plugins_plugin_review` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pluginId` integer NOT NULL,
	`userId` text(255) NOT NULL,
	`rating` integer NOT NULL,
	`title` text(256),
	`comment` text,
	`helpful` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`pluginId`) REFERENCES `extera_plugins_plugin`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `extera_plugins_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `review_plugin_idx` ON `extera_plugins_plugin_review` (`pluginId`);--> statement-breakpoint
CREATE INDEX `review_user_idx` ON `extera_plugins_plugin_review` (`userId`);--> statement-breakpoint
CREATE INDEX `review_unique_idx` ON `extera_plugins_plugin_review` (`pluginId`,`userId`);--> statement-breakpoint
CREATE TABLE `extera_plugins_plugin_version` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pluginId` integer NOT NULL,
	`version` text(50) NOT NULL,
	`changelog` text,
	`fileContent` text NOT NULL,
	`fileSize` integer NOT NULL,
	`fileHash` text(64) NOT NULL,
	`gitCommitHash` text(40),
	`gitBranch` text(100),
	`gitTag` text(100),
	`isStable` integer DEFAULT true NOT NULL,
	`downloadCount` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`createdById` text(255) NOT NULL,
	FOREIGN KEY (`pluginId`) REFERENCES `extera_plugins_plugin`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdById`) REFERENCES `extera_plugins_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `version_plugin_idx` ON `extera_plugins_plugin_version` (`pluginId`);--> statement-breakpoint
CREATE INDEX `version_created_idx` ON `extera_plugins_plugin_version` (`createdAt`);--> statement-breakpoint
CREATE INDEX `version_stable_idx` ON `extera_plugins_plugin_version` (`isStable`);--> statement-breakpoint
CREATE INDEX `version_unique_idx` ON `extera_plugins_plugin_version` (`pluginId`,`version`);--> statement-breakpoint
CREATE TABLE `extera_plugins_plugin` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(256) NOT NULL,
	`slug` text(256) NOT NULL,
	`description` text NOT NULL,
	`shortDescription` text(500),
	`version` text(50) NOT NULL,
	`author` text(256) NOT NULL,
	`authorId` text(255),
	`category` text(100) NOT NULL,
	`tags` text,
	`downloadCount` integer DEFAULT 0 NOT NULL,
	`rating` real DEFAULT 0 NOT NULL,
	`ratingCount` integer DEFAULT 0 NOT NULL,
	`price` real DEFAULT 0 NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`status` text(50) DEFAULT 'pending' NOT NULL,
	`telegramBotDeeplink` text(500),
	`githubUrl` text(500),
	`documentationUrl` text(500),
	`screenshots` text,
	`requirements` text,
	`changelog` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`authorId`) REFERENCES `extera_plugins_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `extera_plugins_plugin_slug_unique` ON `extera_plugins_plugin` (`slug`);--> statement-breakpoint
CREATE INDEX `plugin_slug_idx` ON `extera_plugins_plugin` (`slug`);--> statement-breakpoint
CREATE INDEX `plugin_category_idx` ON `extera_plugins_plugin` (`category`);--> statement-breakpoint
CREATE INDEX `plugin_author_idx` ON `extera_plugins_plugin` (`authorId`);--> statement-breakpoint
CREATE INDEX `plugin_status_idx` ON `extera_plugins_plugin` (`status`);--> statement-breakpoint
CREATE INDEX `plugin_featured_idx` ON `extera_plugins_plugin` (`featured`);--> statement-breakpoint
CREATE TABLE `extera_plugins_post` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(256),
	`createdById` text(255) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`createdById`) REFERENCES `extera_plugins_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `created_by_idx` ON `extera_plugins_post` (`createdById`);--> statement-breakpoint
CREATE INDEX `name_idx` ON `extera_plugins_post` (`name`);--> statement-breakpoint
CREATE TABLE `extera_plugins_session` (
	`sessionToken` text(255) PRIMARY KEY NOT NULL,
	`userId` text(255) NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `extera_plugins_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `extera_plugins_session` (`userId`);--> statement-breakpoint
CREATE TABLE `extera_plugins_user` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`name` text(255),
	`email` text(255),
	`emailVerified` integer DEFAULT (unixepoch()),
	`image` text(255),
	`telegramId` text(255),
	`telegramUsername` text(255),
	`telegramFirstName` text(255),
	`telegramLastName` text(255),
	`githubUsername` text(255),
	`role` text(50) DEFAULT 'user' NOT NULL,
	`isVerified` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `extera_plugins_user_telegramId_unique` ON `extera_plugins_user` (`telegramId`);--> statement-breakpoint
CREATE TABLE `extera_plugins_verification_token` (
	`identifier` text(255) NOT NULL,
	`token` text(255) NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
--> statement-breakpoint
CREATE TABLE `extera_plugins_notification` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` text(255) NOT NULL,
	`pluginId` integer,
	`type` text(50) NOT NULL,
	`title` text(256) NOT NULL,
	`message` text NOT NULL,
	`data` text,
	`isRead` integer DEFAULT false NOT NULL,
	`sentToTelegram` integer DEFAULT false NOT NULL,
	`telegramMessageId` text(100),
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `extera_plugins_user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pluginId`) REFERENCES `extera_plugins_plugin`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notification_user_idx` ON `extera_plugins_notification` (`userId`);--> statement-breakpoint
CREATE INDEX `notification_plugin_idx` ON `extera_plugins_notification` (`pluginId`);--> statement-breakpoint
CREATE INDEX `notification_type_idx` ON `extera_plugins_notification` (`type`);--> statement-breakpoint
CREATE INDEX `notification_read_idx` ON `extera_plugins_notification` (`isRead`);--> statement-breakpoint
CREATE TABLE `extera_plugins_plugin_pipeline_check` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pluginId` integer NOT NULL,
	`checkType` text(100) NOT NULL,
	`status` text(50) DEFAULT 'pending' NOT NULL,
	`score` real,
	`details` text,
	`errorMessage` text,
	`llmModel` text(100),
	`llmPrompt` text,
	`llmResponse` text,
	`executionTime` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`completedAt` integer,
	FOREIGN KEY (`pluginId`) REFERENCES `extera_plugins_plugin`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pipeline_plugin_idx` ON `extera_plugins_plugin_pipeline_check` (`pluginId`);--> statement-breakpoint
CREATE INDEX `pipeline_status_idx` ON `extera_plugins_plugin_pipeline_check` (`status`);--> statement-breakpoint
CREATE INDEX `pipeline_type_idx` ON `extera_plugins_plugin_pipeline_check` (`checkType`);--> statement-breakpoint
CREATE TABLE `extera_plugins_plugin_pipeline_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pluginId` integer NOT NULL,
	`priority` integer DEFAULT 5 NOT NULL,
	`status` text(50) DEFAULT 'queued' NOT NULL,
	`retryCount` integer DEFAULT 0 NOT NULL,
	`maxRetries` integer DEFAULT 3 NOT NULL,
	`errorMessage` text,
	`scheduledAt` integer,
	`startedAt` integer,
	`completedAt` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`pluginId`) REFERENCES `extera_plugins_plugin`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `queue_status_idx` ON `extera_plugins_plugin_pipeline_queue` (`status`);--> statement-breakpoint
CREATE INDEX `queue_priority_idx` ON `extera_plugins_plugin_pipeline_queue` (`priority`);--> statement-breakpoint
CREATE INDEX `queue_scheduled_idx` ON `extera_plugins_plugin_pipeline_queue` (`scheduledAt`);--> statement-breakpoint
CREATE TABLE `extera_plugins_user_notification_setting` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` text(255) NOT NULL,
	`enablePluginUpdates` integer DEFAULT true NOT NULL,
	`enableSecurityAlerts` integer DEFAULT true NOT NULL,
	`enableReviewNotifications` integer DEFAULT false NOT NULL,
	`enableTelegramNotifications` integer DEFAULT true NOT NULL,
	`telegramChatId` text(255),
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `extera_plugins_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `extera_plugins_user_notification_setting_userId_unique` ON `extera_plugins_user_notification_setting` (`userId`);--> statement-breakpoint
CREATE INDEX `notification_settings_user_idx` ON `extera_plugins_user_notification_setting` (`userId`);--> statement-breakpoint
CREATE TABLE `extera_plugins_user_plugin_subscription` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` text(255) NOT NULL,
	`pluginId` integer NOT NULL,
	`subscriptionType` text(50) NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`telegramChatId` text(255),
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `extera_plugins_user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pluginId`) REFERENCES `extera_plugins_plugin`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `subscription_user_idx` ON `extera_plugins_user_plugin_subscription` (`userId`);--> statement-breakpoint
CREATE INDEX `subscription_plugin_idx` ON `extera_plugins_user_plugin_subscription` (`pluginId`);--> statement-breakpoint
CREATE INDEX `subscription_type_idx` ON `extera_plugins_user_plugin_subscription` (`subscriptionType`);--> statement-breakpoint
CREATE INDEX `subscription_unique_idx` ON `extera_plugins_user_plugin_subscription` (`userId`,`pluginId`,`subscriptionType`);
CREATE TABLE `extera_plugins_plugin_favorite` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pluginId` integer NOT NULL,
	`userId` text(255) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`pluginId`) REFERENCES `extera_plugins_plugin`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `extera_plugins_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `favorite_plugin_idx` ON `extera_plugins_plugin_favorite` (`pluginId`);--> statement-breakpoint
CREATE INDEX `favorite_user_idx` ON `extera_plugins_plugin_favorite` (`userId`);--> statement-breakpoint
CREATE INDEX `favorite_unique_idx` ON `extera_plugins_plugin_favorite` (`pluginId`,`userId`);
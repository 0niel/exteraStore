import { relations, sql } from "drizzle-orm";
import { index, sqliteTableCreator } from "drizzle-orm/sqlite-core";
import { plugins, users } from "./schema";

export const createTable = sqliteTableCreator(
	(name) => `extera_plugins_${name}`,
);

export const pluginPipelineChecks = createTable(
	"plugin_pipeline_check",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		pluginId: d
			.integer()
			.notNull()
			.references(() => plugins.id, { onDelete: "cascade" }),
		checkType: d.text({ length: 100 }).notNull(),
		status: d.text({ length: 50 }).default("pending").notNull(),
		score: d.real(),
		details: d.text(),
		errorMessage: d.text(),
		llmModel: d.text({ length: 100 }),
		llmPrompt: d.text(),
		llmResponse: d.text(),
		executionTime: d.integer(),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		completedAt: d.integer({ mode: "timestamp" }),
	}),
	(t) => [
		index("pipeline_plugin_idx").on(t.pluginId),
		index("pipeline_status_idx").on(t.status),
		index("pipeline_type_idx").on(t.checkType),
	],
);

export const pluginPipelineQueue = createTable(
	"plugin_pipeline_queue",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		pluginId: d
			.integer()
			.notNull()
			.references(() => plugins.id, { onDelete: "cascade" }),
		priority: d.integer().default(5).notNull(),
		status: d.text({ length: 50 }).default("queued").notNull(),
		retryCount: d.integer().default(0).notNull(),
		maxRetries: d.integer().default(3).notNull(),
		errorMessage: d.text(),
		scheduledAt: d.integer({ mode: "timestamp" }),
		startedAt: d.integer({ mode: "timestamp" }),
		completedAt: d.integer({ mode: "timestamp" }),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
	}),
	(t) => [
		index("queue_status_idx").on(t.status),
		index("queue_priority_idx").on(t.priority),
		index("queue_scheduled_idx").on(t.scheduledAt),
	],
);

export const userPluginSubscriptions = createTable(
	"user_plugin_subscription",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		userId: d
			.text({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		pluginId: d
			.integer()
			.notNull()
			.references(() => plugins.id, { onDelete: "cascade" }),
		subscriptionType: d.text({ length: 50 }).notNull(),
		isActive: d.integer({ mode: "boolean" }).default(true).notNull(),
		telegramChatId: d.text({ length: 255 }),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
	}),
	(t) => [
		index("subscription_user_idx").on(t.userId),
		index("subscription_plugin_idx").on(t.pluginId),
		index("subscription_type_idx").on(t.subscriptionType),

		index("subscription_unique_idx").on(
			t.userId,
			t.pluginId,
			t.subscriptionType,
		),
	],
);

export const notifications = createTable(
	"notification",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		userId: d
			.text({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		pluginId: d.integer().references(() => plugins.id, { onDelete: "cascade" }),
		type: d.text({ length: 50 }).notNull(),
		title: d.text({ length: 256 }).notNull(),
		message: d.text().notNull(),
		data: d.text(),
		isRead: d.integer({ mode: "boolean" }).default(false).notNull(),
		sentToTelegram: d.integer({ mode: "boolean" }).default(false).notNull(),
		telegramMessageId: d.text({ length: 100 }),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
	}),
	(t) => [
		index("notification_user_idx").on(t.userId),
		index("notification_plugin_idx").on(t.pluginId),
		index("notification_type_idx").on(t.type),
		index("notification_read_idx").on(t.isRead),
	],
);

export const userNotificationSettings = createTable(
	"user_notification_setting",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		userId: d
			.text({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" })
			.unique(),
		enablePluginUpdates: d.integer({ mode: "boolean" }).default(true).notNull(),
		enableSecurityAlerts: d
			.integer({ mode: "boolean" })
			.default(true)
			.notNull(),
		enableReviewNotifications: d
			.integer({ mode: "boolean" })
			.default(false)
			.notNull(),
		enableTelegramNotifications: d
			.integer({ mode: "boolean" })
			.default(true)
			.notNull(),
		telegramChatId: d.text({ length: 255 }),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
	}),
	(t) => [index("notification_settings_user_idx").on(t.userId)],
);

export const pluginPipelineChecksRelations = relations(
	pluginPipelineChecks,
	({ one }) => ({
		plugin: one(plugins, {
			fields: [pluginPipelineChecks.pluginId],
			references: [plugins.id],
		}),
	}),
);

export const pluginPipelineQueueRelations = relations(
	pluginPipelineQueue,
	({ one }) => ({
		plugin: one(plugins, {
			fields: [pluginPipelineQueue.pluginId],
			references: [plugins.id],
		}),
	}),
);

export const userPluginSubscriptionsRelations = relations(
	userPluginSubscriptions,
	({ one }) => ({
		user: one(users, {
			fields: [userPluginSubscriptions.userId],
			references: [users.id],
		}),
		plugin: one(plugins, {
			fields: [userPluginSubscriptions.pluginId],
			references: [plugins.id],
		}),
	}),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
	user: one(users, { fields: [notifications.userId], references: [users.id] }),
	plugin: one(plugins, {
		fields: [notifications.pluginId],
		references: [plugins.id],
	}),
}));

export const userNotificationSettingsRelations = relations(
	userNotificationSettings,
	({ one }) => ({
		user: one(users, {
			fields: [userNotificationSettings.userId],
			references: [users.id],
		}),
	}),
);

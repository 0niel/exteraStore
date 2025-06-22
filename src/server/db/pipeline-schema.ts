import { relations } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgTable,
	real,
	serial,
	text,
} from "drizzle-orm/pg-core";
import { plugins, users } from "./schema";

export const pluginPipelineChecks = pgTable(
	"extera_plugins_plugin_pipeline_check",
	{
		id: serial("id").primaryKey(),
		pluginId: integer("plugin_id")
			.notNull()
			.references(() => plugins.id, { onDelete: "cascade" }),
		checkType: text("check_type").notNull(),
		status: text("status").default("pending").notNull(),
		score: real("score"),
		details: text("details"),
		errorMessage: text("error_message"),
		classification: text("classification").default("safe"),
		shortDescription: text("short_description"),
		llmModel: text("llm_model"),
		llmPrompt: text("llm_prompt"),
		llmResponse: text("llm_response"),
		executionTime: integer("execution_time"),
		createdAt: integer("created_at")
			.default(sql`extract(epoch from now())`)
			.notNull(),
		completedAt: integer("completed_at"),
	},
	(t) => [
		index("pipeline_plugin_idx").on(t.pluginId),
		index("pipeline_status_idx").on(t.status),
		index("pipeline_type_idx").on(t.checkType),
	],
);

export const pluginPipelineQueue = pgTable(
	"extera_plugins_plugin_pipeline_queue",
	{
		id: serial("id").primaryKey(),
		pluginId: integer("plugin_id")
			.notNull()
			.references(() => plugins.id, { onDelete: "cascade" }),
		priority: integer("priority").default(5).notNull(),
		status: text("status").default("queued").notNull(),
		retryCount: integer("retry_count").default(0).notNull(),
		maxRetries: integer("max_retries").default(3).notNull(),
		errorMessage: text("error_message"),
		scheduledAt: integer("scheduled_at"),
		startedAt: integer("started_at"),
		completedAt: integer("completed_at"),
		createdAt: integer("created_at")
			.default(sql`extract(epoch from now())`)
			.notNull(),
	},
	(t) => [
		index("queue_status_idx").on(t.status),
		index("queue_priority_idx").on(t.priority),
		index("queue_scheduled_idx").on(t.scheduledAt),
	],
);

export const userPluginSubscriptions = pgTable(
	"extera_plugins_user_plugin_subscription",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		pluginId: integer("plugin_id")
			.notNull()
			.references(() => plugins.id, { onDelete: "cascade" }),
		subscriptionType: text("subscription_type").notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		telegramChatId: text("telegram_chat_id"),
		createdAt: integer("created_at")
			.default(sql`extract(epoch from now())`)
			.notNull(),
	},
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

export const notifications = pgTable(
	"extera_plugins_notification",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		pluginId: integer("plugin_id").references(() => plugins.id, {
			onDelete: "cascade",
		}),
		type: text("type").notNull(),
		title: text("title").notNull(),
		message: text("message").notNull(),
		data: text("data"),
		isRead: boolean("is_read").default(false).notNull(),
		sentToTelegram: boolean("sent_to_telegram").default(false).notNull(),
		telegramMessageId: text("telegram_message_id"),
		createdAt: integer("created_at")
			.default(sql`extract(epoch from now())`)
			.notNull(),
	},
	(t) => [
		index("notification_user_idx").on(t.userId),
		index("notification_plugin_idx").on(t.pluginId),
		index("notification_type_idx").on(t.type),
		index("notification_read_idx").on(t.isRead),
	],
);

export const userNotificationSettings = pgTable(
	"extera_plugins_user_notification_setting",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" })
			.unique(),
		enablePluginUpdates: boolean("enable_plugin_updates")
			.default(true)
			.notNull(),
		enableSecurityAlerts: boolean("enable_security_alerts")
			.default(true)
			.notNull(),
		enableReviewNotifications: boolean("enable_review_notifications")
			.default(false)
			.notNull(),
		enableTelegramNotifications: boolean("enable_telegram_notifications")
			.default(true)
			.notNull(),
		telegramChatId: text("telegram_chat_id"),
		createdAt: integer("created_at")
			.default(sql`extract(epoch from now())`)
			.notNull(),
		updatedAt: integer("updated_at"),
	},
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

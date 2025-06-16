import crypto from "node:crypto";
import { relations, sql } from "drizzle-orm";
import { index, primaryKey, sqliteTableCreator } from "drizzle-orm/sqlite-core";
import type { AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https:
 */
export const createTable = sqliteTableCreator(
	(name) => `extera_plugins_${name}`,
);

export const posts = createTable(
	"post",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		name: d.text({ length: 256 }),
		createdById: d
			.text({ length: 255 })
			.notNull()
			.references(() => users.id),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("created_by_idx").on(t.createdById),
		index("name_idx").on(t.name),
	],
);

export const plugins = createTable(
	"plugin",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		name: d.text({ length: 256 }).notNull(),
		slug: d.text({ length: 256 }).notNull().unique(),
		description: d.text().notNull(),
		shortDescription: d.text({ length: 500 }),
		version: d.text({ length: 50 }).notNull(),
		author: d.text({ length: 256 }).notNull(),
		authorId: d.text({ length: 255 }).references(() => users.id),
		category: d.text({ length: 100 }).notNull(),
		tags: d.text(),
		downloadCount: d.integer().default(0).notNull(),
		rating: d.real().default(0).notNull(),
		ratingCount: d.integer().default(0).notNull(),
		price: d.real().default(0).notNull(),
		featured: d.integer({ mode: "boolean" }).default(false).notNull(),
		verified: d.integer({ mode: "boolean" }).default(false).notNull(),
		status: d.text({ length: 50 }).default("pending").notNull(),
		telegramBotDeeplink: d.text({ length: 500 }),
		githubUrl: d.text({ length: 500 }),
		documentationUrl: d.text({ length: 500 }),
		screenshots: d.text(),
		requirements: d.text(),
		changelog: d.text(),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("plugin_slug_idx").on(t.slug),
		index("plugin_category_idx").on(t.category),
		index("plugin_author_idx").on(t.authorId),
		index("plugin_status_idx").on(t.status),
		index("plugin_featured_idx").on(t.featured),
	],
);

export const pluginReviews = createTable(
	"plugin_review",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		pluginId: d
			.integer()
			.notNull()
			.references(() => plugins.id, { onDelete: "cascade" }),
		userId: d
			.text({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		rating: d.integer().notNull(),
		title: d.text({ length: 256 }),
		comment: d.text(),
		helpful: d.integer().default(0).notNull(),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("review_plugin_idx").on(t.pluginId),
		index("review_user_idx").on(t.userId),

		index("review_unique_idx").on(t.pluginId, t.userId),
	],
);

export const pluginCategories = createTable(
	"plugin_category",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		name: d.text({ length: 100 }).notNull().unique(),
		slug: d.text({ length: 100 }).notNull().unique(),
		description: d.text(),
		icon: d.text({ length: 100 }),
		color: d.text({ length: 50 }),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
	}),
	(t) => [index("category_slug_idx").on(t.slug)],
);

export const pluginDownloads = createTable(
	"plugin_download",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		pluginId: d
			.integer()
			.notNull()
			.references(() => plugins.id, { onDelete: "cascade" }),
		userId: d.text({ length: 255 }).references(() => users.id),
		ipAddress: d.text({ length: 45 }),
		userAgent: d.text({ length: 500 }),
		downloadedAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
	}),
	(t) => [
		index("download_plugin_idx").on(t.pluginId),
		index("download_user_idx").on(t.userId),
		index("download_date_idx").on(t.downloadedAt),
	],
);

export const pluginFavorites = createTable(
	"plugin_favorite",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		pluginId: d
			.integer()
			.notNull()
			.references(() => plugins.id, { onDelete: "cascade" }),
		userId: d
			.text({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
	}),
	(t) => [
		index("favorite_plugin_idx").on(t.pluginId),
		index("favorite_user_idx").on(t.userId),

		index("favorite_unique_idx").on(t.pluginId, t.userId),
	],
);

export const pluginVersions = createTable(
	"plugin_version",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		pluginId: d
			.integer()
			.notNull()
			.references(() => plugins.id, { onDelete: "cascade" }),
		version: d.text({ length: 50 }).notNull(),
		changelog: d.text(),
		fileContent: d.text().notNull(),
		fileSize: d.integer().notNull(),
		fileHash: d.text({ length: 64 }).notNull(),
		gitCommitHash: d.text({ length: 40 }),
		gitBranch: d.text({ length: 100 }),
		gitTag: d.text({ length: 100 }),
		isStable: d.integer({ mode: "boolean" }).default(true).notNull(),
		downloadCount: d.integer().default(0).notNull(),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		createdById: d
			.text({ length: 255 })
			.notNull()
			.references(() => users.id),
	}),
	(t) => [
		index("version_plugin_idx").on(t.pluginId),
		index("version_created_idx").on(t.createdAt),
		index("version_stable_idx").on(t.isStable),
		index("version_unique_idx").on(t.pluginId, t.version),
	],
);

export const pluginFiles = createTable(
	"plugin_file",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		pluginId: d
			.integer()
			.notNull()
			.references(() => plugins.id, { onDelete: "cascade" }),
		versionId: d
			.integer()
			.references(() => pluginVersions.id, { onDelete: "cascade" }),
		filename: d.text({ length: 255 }).notNull(),
		content: d.text().notNull(),
		size: d.integer().notNull(),
		hash: d.text({ length: 64 }).notNull(),
		mimeType: d.text({ length: 100 }).default("text/x-python").notNull(),
		gitPath: d.text({ length: 500 }),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
	}),
	(t) => [
		index("file_plugin_idx").on(t.pluginId),
		index("file_version_idx").on(t.versionId),
		index("file_hash_idx").on(t.hash),
	],
);

export const pluginGitRepos = createTable(
	"plugin_git_repo",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		pluginId: d
			.integer()
			.notNull()
			.references(() => plugins.id, { onDelete: "cascade" }),
		repoUrl: d.text({ length: 500 }).notNull(),
		branch: d.text({ length: 100 }).default("main").notNull(),
		filePath: d.text({ length: 500 }).notNull(),
		accessToken: d.text({ length: 500 }),
		lastSyncAt: d.integer({ mode: "timestamp" }),
		lastCommitHash: d.text({ length: 40 }),
		autoSync: d.integer({ mode: "boolean" }).default(false).notNull(),
		syncInterval: d.integer().default(3600).notNull(),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("git_repo_plugin_idx").on(t.pluginId),
		index("git_repo_sync_idx").on(t.lastSyncAt),
	],
);

export const users = createTable("user", (d) => ({
	id: d
		.text({ length: 255 })
		.notNull()
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: d.text({ length: 255 }),
	email: d.text({ length: 255 }),
	emailVerified: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`),
	image: d.text({ length: 255 }),
	telegramId: d.text({ length: 255 }).unique(),
	telegramUsername: d.text({ length: 255 }),
	telegramFirstName: d.text({ length: 255 }),
	telegramLastName: d.text({ length: 255 }),
	githubUsername: d.text({ length: 255 }),
	bio: d.text({ length: 1000 }),
	website: d.text({ length: 500 }),
	links: d.text(),
	role: d.text({ length: 50 }).default("user").notNull(),
	isVerified: d.integer({ mode: "boolean" }).default(false).notNull(),
	createdAt: d
		.integer({ mode: "timestamp" })
		.default(sql`(unixepoch())`)
		.notNull(),
	updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

export const usersRelations = relations(users, ({ many }) => ({
	accounts: many(accounts),
	plugins: many(plugins),
	reviews: many(pluginReviews),
	downloads: many(pluginDownloads),
	createdVersions: many(pluginVersions),
	favorites: many(pluginFavorites),
}));

export const pluginsRelations = relations(plugins, ({ one, many }) => ({
	author: one(users, { fields: [plugins.authorId], references: [users.id] }),
	reviews: many(pluginReviews),
	downloads: many(pluginDownloads),
	versions: many(pluginVersions),
	files: many(pluginFiles),
	gitRepo: one(pluginGitRepos),
	favorites: many(pluginFavorites),
}));

export const pluginVersionsRelations = relations(
	pluginVersions,
	({ one, many }) => ({
		plugin: one(plugins, {
			fields: [pluginVersions.pluginId],
			references: [plugins.id],
		}),
		createdBy: one(users, {
			fields: [pluginVersions.createdById],
			references: [users.id],
		}),
		files: many(pluginFiles),
	}),
);

export const pluginFilesRelations = relations(pluginFiles, ({ one }) => ({
	plugin: one(plugins, {
		fields: [pluginFiles.pluginId],
		references: [plugins.id],
	}),
	version: one(pluginVersions, {
		fields: [pluginFiles.versionId],
		references: [pluginVersions.id],
	}),
}));

export const pluginGitReposRelations = relations(pluginGitRepos, ({ one }) => ({
	plugin: one(plugins, {
		fields: [pluginGitRepos.pluginId],
		references: [plugins.id],
	}),
}));

export const pluginReviewsRelations = relations(pluginReviews, ({ one }) => ({
	plugin: one(plugins, {
		fields: [pluginReviews.pluginId],
		references: [plugins.id],
	}),
	user: one(users, { fields: [pluginReviews.userId], references: [users.id] }),
}));

export const pluginDownloadsRelations = relations(
	pluginDownloads,
	({ one }) => ({
		plugin: one(plugins, {
			fields: [pluginDownloads.pluginId],
			references: [plugins.id],
		}),
		user: one(users, {
			fields: [pluginDownloads.userId],
			references: [users.id],
		}),
	}),
);

export const pluginFavoritesRelations = relations(
	pluginFavorites,
	({ one }) => ({
		plugin: one(plugins, {
			fields: [pluginFavorites.pluginId],
			references: [plugins.id],
		}),
		user: one(users, {
			fields: [pluginFavorites.userId],
			references: [users.id],
		}),
	}),
);

export const accounts = createTable(
	"account",
	(d) => ({
		userId: d
			.text({ length: 255 })
			.notNull()
			.references(() => users.id),
		type: d.text({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
		provider: d.text({ length: 255 }).notNull(),
		providerAccountId: d.text({ length: 255 }).notNull(),
		refresh_token: d.text(),
		access_token: d.text(),
		expires_at: d.integer(),
		token_type: d.text({ length: 255 }),
		scope: d.text({ length: 255 }),
		id_token: d.text(),
		session_state: d.text({ length: 255 }),
	}),
	(t) => [
		primaryKey({
			columns: [t.provider, t.providerAccountId],
		}),
		index("account_user_id_idx").on(t.userId),
	],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
	"session",
	(d) => ({
		sessionToken: d.text({ length: 255 }).notNull().primaryKey(),
		userId: d
			.text({ length: 255 })
			.notNull()
			.references(() => users.id),
		expires: d.integer({ mode: "timestamp" }).notNull(),
	}),
	(t) => [index("session_userId_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
	"verification_token",
	(d) => ({
		identifier: d.text({ length: 255 }).notNull(),
		token: d.text({ length: 255 }).notNull(),
		expires: d.integer({ mode: "timestamp" }).notNull(),
	}),
	(t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export * from "./pipeline-schema";

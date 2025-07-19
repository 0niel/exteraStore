import crypto from "node:crypto";
import { relations, sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgTable,
	primaryKey,
	real,
	serial,
	text,
} from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https:
 */
export const posts = pgTable(
	"extera_plugins_post",
	{
		id: serial("id").primaryKey(),
		name: text("name"),
		createdById: text("created_by_id")
			.notNull()
			.references(() => users.id),
		createdAt: integer("created_at")
			.default(sql`extract(epoch from now())`)
			.notNull(),
		updatedAt: integer("updated_at"),
	},
	(t) => [
		index("created_by_idx").on(t.createdById),
		index("name_idx").on(t.name),
	],
);

export const plugins = pgTable(
	"extera_plugins_plugin",
	{
		id: serial("id").primaryKey(),
		name: text("name").notNull(),
		slug: text("slug").notNull().unique(),
		description: text("description").notNull(),
		shortDescription: text("short_description"),
		version: text("version").notNull(),
		author: text("author").notNull(),
		authorId: text("author_id").references(() => users.id),
		category: text("category").notNull(),
		tags: text("tags"),
		downloadCount: integer("download_count").default(0).notNull(),
		rating: real("rating").default(0).notNull(),
		ratingCount: integer("rating_count").default(0).notNull(),
		price: real("price").default(0).notNull(),
		featured: boolean("featured").default(false).notNull(),
		verified: boolean("verified").default(false).notNull(),
		status: text("status").default("pending").notNull(),
		telegramBotDeeplink: text("telegram_bot_deeplink"),
		githubUrl: text("github_url"),
		documentationUrl: text("documentation_url"),
		screenshots: text("screenshots"),
		requirements: text("requirements"),
		changelog: text("changelog"),
		createdAt: integer("created_at")
			.default(sql`extract(epoch from now())`)
			.notNull(),
		updatedAt: integer("updated_at"),
	},
	(t) => [
		index("plugin_slug_idx").on(t.slug),
		index("plugin_category_idx").on(t.category),
		index("plugin_author_idx").on(t.authorId),
		index("plugin_status_idx").on(t.status),
		index("plugin_featured_idx").on(t.featured),
	],
);

export const pluginReviews = pgTable(
	"extera_plugins_plugin_review",
	{
		id: serial("id").primaryKey(),
		pluginId: integer("plugin_id")
			.notNull()
			.references(() => plugins.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		rating: integer("rating").notNull(),
		title: text("title"),
		comment: text("comment"),
		helpful: integer("helpful").default(0).notNull(),
		createdAt: integer("created_at")
			.default(sql`extract(epoch from now())`)
			.notNull(),
		updatedAt: integer("updated_at"),
	},
	(t) => [
		index("review_plugin_idx").on(t.pluginId),
		index("review_user_idx").on(t.userId),
		index("review_unique_idx").on(t.pluginId, t.userId),
	],
);

export const pluginCategories = pgTable(
	"extera_plugins_plugin_category",
	{
		id: serial("id").primaryKey(),
		name: text("name").notNull().unique(),
		slug: text("slug").notNull().unique(),
		description: text("description"),
		icon: text("icon"),
		color: text("color"),
		createdAt: integer("created_at")
			.default(sql`extract(epoch from now())`)
			.notNull(),
	},
	(t) => [index("category_slug_idx").on(t.slug)],
);

export const pluginDownloads = pgTable(
	"extera_plugins_plugin_download",
	{
		id: serial("id").primaryKey(),
		pluginId: integer("plugin_id")
			.notNull()
			.references(() => plugins.id, { onDelete: "cascade" }),
		userId: text("user_id").references(() => users.id),
		ipHash: text("ip_hash"),
		userAgent: text("user_agent"),
		downloadedAt: integer("downloaded_at")
			.default(sql`extract(epoch from now())`)
			.notNull(),
	},
	(t) => [
		index("download_plugin_idx").on(t.pluginId),
		index("download_user_idx").on(t.userId),
		index("download_date_idx").on(t.downloadedAt),
		index("download_ip_hash_idx").on(t.ipHash),
	],
);

export const pluginFavorites = pgTable(
	"extera_plugins_plugin_favorite",
	{
		id: serial("id").primaryKey(),
		pluginId: integer("plugin_id")
			.notNull()
			.references(() => plugins.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: integer("created_at")
			.default(sql`extract(epoch from now())`)
			.notNull(),
	},
	(t) => [
		index("favorite_plugin_idx").on(t.pluginId),
		index("favorite_user_idx").on(t.userId),
		index("favorite_unique_idx").on(t.pluginId, t.userId),
	],
);

export const pluginVersions = pgTable(
	"extera_plugins_plugin_version",
	{
		id: serial("id").primaryKey(),
		pluginId: integer("plugin_id")
			.notNull()
			.references(() => plugins.id, { onDelete: "cascade" }),
		version: text("version").notNull(),
		changelog: text("changelog"),
		fileContent: text("file_content").notNull(),
		fileSize: integer("file_size").notNull(),
		fileHash: text("file_hash").notNull(),
		gitCommitHash: text("git_commit_hash"),
		gitBranch: text("git_branch"),
		gitTag: text("git_tag"),
		isStable: boolean("is_stable").default(true).notNull(),
		downloadCount: integer("download_count").default(0).notNull(),
		createdAt: integer("created_at")
			.default(sql`extract(epoch from now())`)
			.notNull(),
		createdById: text("created_by_id")
			.notNull()
			.references(() => users.id),
	},
	(t) => [
		index("version_plugin_idx").on(t.pluginId),
		index("version_created_idx").on(t.createdAt),
		index("version_stable_idx").on(t.isStable),
		index("version_unique_idx").on(t.pluginId, t.version),
	],
);

export const pluginFiles = pgTable(
	"extera_plugins_plugin_file",
	{
		id: serial("id").primaryKey(),
		pluginId: integer("plugin_id")
			.notNull()
			.references(() => plugins.id, { onDelete: "cascade" }),
		versionId: integer("version_id").references(() => pluginVersions.id, {
			onDelete: "cascade",
		}),
		filename: text("filename").notNull(),
		content: text("content").notNull(),
		size: integer("size").notNull(),
		hash: text("hash").notNull(),
		mimeType: text("mime_type").default("text/x-python").notNull(),
		gitPath: text("git_path"),
		createdAt: integer("created_at")
			.default(sql`extract(epoch from now())`)
			.notNull(),
	},
	(t) => [
		index("file_plugin_idx").on(t.pluginId),
		index("file_version_idx").on(t.versionId),
		index("file_hash_idx").on(t.hash),
	],
);

export const pluginGitRepos = pgTable(
	"extera_plugins_plugin_git_repo",
	{
		id: serial("id").primaryKey(),
		pluginId: integer("plugin_id")
			.notNull()
			.references(() => plugins.id, { onDelete: "cascade" }),
		repoUrl: text("repo_url").notNull(),
		branch: text("branch").default("main").notNull(),
		filePath: text("file_path").notNull(),
		accessToken: text("access_token"),
		lastSyncAt: integer("last_sync_at"),
		lastCommitHash: text("last_commit_hash"),
		autoSync: boolean("auto_sync").default(false).notNull(),
		syncInterval: integer("sync_interval").default(3600).notNull(),
		createdAt: integer("created_at")
			.default(sql`extract(epoch from now())`)
			.notNull(),
		updatedAt: integer("updated_at"),
	},
	(t) => [
		index("git_repo_plugin_idx").on(t.pluginId),
		index("git_repo_sync_idx").on(t.lastSyncAt),
	],
);

export const users = pgTable(
	"extera_plugins_user",
	{
		id: text("id").notNull().primaryKey(),
		name: text("name"),
		email: text("email"),
		emailVerified: integer("email_verified"),
		image: text("image"),
		telegramId: text("telegram_id").unique(),
		telegramUsername: text("telegram_username"),
		telegramFirstName: text("telegram_first_name"),
		telegramLastName: text("telegram_last_name"),
		githubUsername: text("github_username"),
		bio: text("bio"),
		website: text("website"),
		links: text("links"),
		role: text("role").default("user").notNull(),
		isVerified: boolean("is_verified").default(false).notNull(),
		createdAt: integer("created_at")
			.default(sql`extract(epoch from now())`)
			.notNull(),
		updatedAt: integer("updated_at"),
	},
	(t) => [
		index("created_at_idx").on(t.createdAt),
		index("updated_at_idx").on(t.updatedAt),
	],
);

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

export const accounts = pgTable(
	"extera_plugins_account",
	{
		userId: text("user_id")
			.notNull()
			.references(() => users.id),
		type: text("type").notNull(),
		provider: text("provider").notNull(),
		providerAccountId: text("provider_account_id").notNull(),
		refresh_token: text("refresh_token"),
		access_token: text("access_token"),
		expires_at: integer("expires_at"),
		token_type: text("token_type"),
		scope: text("scope"),
		id_token: text("id_token"),
		session_state: text("session_state"),
	},
	(t) => [
		primaryKey(t.provider, t.providerAccountId),
		index("account_user_id_idx").on(t.userId),
	],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = pgTable(
	"extera_plugins_session",
	{
		sessionToken: text("session_token").notNull().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id),
		expires: integer("expires").notNull(),
	},
	(t) => [index("session_user_id_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = pgTable(
	"extera_plugins_verification_token",
	{
		identifier: text("identifier").notNull(),
		token: text("token").notNull(),
		expires: integer("expires").notNull(),
	},
	(t) => [primaryKey(t.identifier, t.token)],
);

export * from "./pipeline-schema";

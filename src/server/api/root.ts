import { adminPluginsRouter } from "~/server/api/routers/admin-plugins";
import { adminStatsRouter } from "~/server/api/routers/admin-stats";
import { adminUsersRouter } from "~/server/api/routers/admin-users";
import { aiRouter } from "~/server/api/routers/ai";
import { categoriesRouter } from "~/server/api/routers/categories";
import { developerPlatformRouter } from "~/server/api/routers/developer-platform";
import { developersRouter } from "~/server/api/routers/developers";
import { favoritesRouter } from "~/server/api/routers/favorites";
import {
	aiCollectionsRouter,
	pluginPipelineRouter,
} from "~/server/api/routers/plugin-pipeline";
import { pluginUploadRouter } from "~/server/api/routers/plugin-upload";
import { pluginVersionsRouter } from "~/server/api/routers/plugin-versions";
import { pluginsRouter } from "~/server/api/routers/plugins";
import { postRouter } from "~/server/api/routers/post";
import { pulseRouter } from "~/server/api/routers/pulse";
import { telegramBotRouter } from "~/server/api/routers/telegram-bot";
import { telegramNotificationsRouter } from "~/server/api/routers/telegram-notifications";
import { usersRouter } from "~/server/api/routers/users";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
	post: postRouter,
	plugins: pluginsRouter,
	telegramBot: telegramBotRouter,
	pluginUpload: pluginUploadRouter,
	categories: categoriesRouter,
	pluginPipeline: pluginPipelineRouter,
	pluginVersions: pluginVersionsRouter,
	telegramNotifications: telegramNotificationsRouter,
	favorites: favoritesRouter,
	developers: developersRouter,
	developerPlatform: developerPlatformRouter,
	users: usersRouter,
	adminPlugins: adminPluginsRouter,
	adminStats: adminStatsRouter,
	adminUsers: adminUsersRouter,
	aiCollections: aiCollectionsRouter,
	ai: aiRouter,
	pulse: pulseRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);

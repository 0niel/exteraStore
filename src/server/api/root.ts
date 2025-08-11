import { adminPluginsRouter } from "~/server/api/routers/admin-plugins";
import { categoriesRouter } from "~/server/api/routers/categories";
import { developersRouter } from "~/server/api/routers/developers";
import { favoritesRouter } from "~/server/api/routers/favorites";
import {
	pluginPipelineRouter,
	aiCollectionsRouter,
} from "~/server/api/routers/plugin-pipeline";
import { pluginUploadRouter } from "~/server/api/routers/plugin-upload";
import { pluginVersionsRouter } from "~/server/api/routers/plugin-versions";
import { pluginsRouter } from "~/server/api/routers/plugins";
import { postRouter } from "~/server/api/routers/post";
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
	users: usersRouter,
	adminPlugins: adminPluginsRouter,
	aiCollections: aiCollectionsRouter,
});

export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);

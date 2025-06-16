import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { pluginDownloads, plugins } from "~/server/db/schema";


const botUserSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
});

const botMessageSchema = z.object({
  message_id: z.number(),
  from: botUserSchema,
  chat: z.object({
    id: z.number(),
    type: z.string(),
  }),
  date: z.number(),
  text: z.string().optional(),
});

export const telegramBotRouter = createTRPCRouter({
  
  handleStart: publicProcedure
    .input(
      z.object({
        chatId: z.number(),
        userId: z.number(),
        username: z.string().optional(),
        firstName: z.string(),
        lastName: z.string().optional(),
        languageCode: z.string().optional(),
        startParam: z.string().optional(), 
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let pluginId: number | null = null;
      let plugin = null;

      
      if (input.startParam) {
        if (input.startParam.startsWith("plugin_")) {
          const pluginIdentifier = input.startParam.replace("plugin_", "");
          
          
          if (!Number.isNaN(Number(pluginIdentifier))) {
            pluginId = Number(pluginIdentifier);
            const result = await ctx.db
              .select()
              .from(plugins)
              .where(eq(plugins.id, pluginId))
              .limit(1);
            plugin = result[0];
          } else {
            
            const result = await ctx.db
              .select()
              .from(plugins)
              .where(eq(plugins.slug, pluginIdentifier))
              .limit(1);
            plugin = result[0];
            pluginId = plugin?.id || null;
          }
        }
      }

      if (plugin && pluginId) {
        
        await ctx.db.insert(pluginDownloads).values({
          pluginId: pluginId,
          userId: null, 
          ipAddress: null,
          userAgent: `Telegram Bot User ${input.userId}`,
        });

        
        await ctx.db
          .update(plugins)
          .set({
            downloadCount: sql`${plugins.downloadCount} + 1`,
          })
          .where(eq(plugins.id, pluginId));

        return {
          success: true,
          plugin: {
            id: plugin.id,
            name: plugin.name,
            version: plugin.version,
            description: plugin.description,
            author: plugin.author,
            price: plugin.price,
            downloadCount: plugin.downloadCount + 1,
          },
          message: {
            text: `🔌 *${plugin.name}* v${plugin.version}\n\n${plugin.description}\n\n👨‍💻 Автор: ${plugin.author}\n💰 Цена: ${plugin.price > 0 ? `$${plugin.price}` : 'Бесплатно'}\n📥 Скачиваний: ${plugin.downloadCount + 1}`,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "📥 Скачать плагин",
                    callback_data: `download_${plugin.id}`,
                  },
                ],
                [
                  {
                    text: "📖 Подробнее",
                    url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/plugins/${plugin.slug}`,
                  },
                  {
                    text: "🌐 Каталог",
                    url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/plugins`,
                  },
                ],
              ],
            },
          },
        };
      }

      
      return {
        success: true,
        plugin: null,
        message: {
          text: "🎉 Добро пожаловать в exteraGram Plugins!\n\n🔌 Здесь вы можете скачать плагины для exteraGram\n\n📱 Используйте команды:\n/plugins - Показать популярные плагины\n/search <название> - Поиск плагинов\n/help - Помощь",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🌐 Открыть каталог",
                  url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/plugins`,
                },
              ],
              [
                {
                  text: "🔥 Популярные",
                  callback_data: "popular_plugins",
                },
                {
                  text: "⭐ Рекомендуемые",
                  callback_data: "featured_plugins",
                },
              ],
            ],
          },
        },
      };
    }),

  
  handleCallback: publicProcedure
    .input(
      z.object({
        callbackQueryId: z.string(),
        chatId: z.number(),
        userId: z.number(),
        data: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data } = input;

      if (data.startsWith("download_")) {
        const pluginId = Number(data.replace("download_", ""));
        
        const result = await ctx.db
          .select()
          .from(plugins)
          .where(eq(plugins.id, pluginId))
          .limit(1);
        
        const plugin = result[0];
        
        if (plugin) {
          return {
            success: true,
            answerCallbackQuery: {
              callback_query_id: input.callbackQueryId,
              text: "🎉 Плагин готов к установке!",
              show_alert: false,
            },
            message: {
              text: `📦 *Установка плагина ${plugin.name}*\n\n🔧 Инструкция по установке:\n\n1️⃣ Скачайте файл плагина\n2️⃣ Откройте exteraGram\n3️⃣ Перейдите в Настройки → Плагины\n4️⃣ Нажмите "Установить плагин"\n5️⃣ Выберите скачанный файл\n\n✅ Готово! Плагин установлен.`,
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "📥 Скачать файл",
                      url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/download/${plugin.slug}`,
                    },
                  ],
                  [
                    {
                      text: "📖 Документация",
                      url: plugin.documentationUrl || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/docs`,
                    },
                  ],
                  [
                    {
                      text: "🔙 Назад к плагину",
                      callback_data: `plugin_${plugin.id}`,
                    },
                  ],
                ],
              },
            },
          };
        }
      }

      if (data === "popular_plugins") {
        const popularPlugins = await ctx.db
          .select({
            id: plugins.id,
            name: plugins.name,
            downloadCount: plugins.downloadCount,
            rating: plugins.rating,
          })
          .from(plugins)
          .where(eq(plugins.status, "approved"))
          .orderBy(sql`${plugins.downloadCount} DESC`)
          .limit(5);

        const pluginsList = popularPlugins
          .map((p: typeof popularPlugins[0], i: number) => `${i + 1}. ${p.name} (⭐ ${p.rating.toFixed(1)}, 📥 ${p.downloadCount})`)
          .join("\n");

        return {
          success: true,
          answerCallbackQuery: {
            callback_query_id: input.callbackQueryId,
            text: "📊 Популярные плагины",
            show_alert: false,
          },
          message: {
            text: `🔥 *Популярные плагины:*\n\n${pluginsList}\n\n💡 Используйте /plugin <номер> для подробностей`,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🌐 Все плагины",
                    url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/plugins`,
                  },
                ],
              ],
            },
          },
        };
      }

      if (data === "featured_plugins") {
        const featuredPlugins = await ctx.db
          .select({
            id: plugins.id,
            name: plugins.name,
            rating: plugins.rating,
            author: plugins.author,
          })
          .from(plugins)
          .where(sql`${plugins.featured} = 1 AND ${plugins.status} = 'approved'`)
          .orderBy(sql`${plugins.rating} DESC`)
          .limit(5);

        const pluginsList = featuredPlugins
          .map((p: typeof featuredPlugins[0], i: number) => `${i + 1}. ${p.name} by ${p.author} (⭐ ${p.rating.toFixed(1)})`)
          .join("\n");

        return {
          success: true,
          answerCallbackQuery: {
            callback_query_id: input.callbackQueryId,
            text: "⭐ Рекомендуемые плагины",
            show_alert: false,
          },
          message: {
            text: `⭐ *Рекомендуемые плагины:*\n\n${pluginsList}\n\n💡 Используйте /plugin <номер> для подробностей`,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🌐 Все плагины",
                    url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/plugins`,
                  },
                ],
              ],
            },
          },
        };
      }

      return {
        success: false,
        answerCallbackQuery: {
          callback_query_id: input.callbackQueryId,
          text: "❌ Неизвестная команда",
          show_alert: true,
        },
      };
    }),

  
  searchPlugins: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(10).default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      const searchResults = await ctx.db
        .select({
          id: plugins.id,
          name: plugins.name,
          slug: plugins.slug,
          shortDescription: plugins.shortDescription,
          rating: plugins.rating,
          downloadCount: plugins.downloadCount,
          price: plugins.price,
        })
        .from(plugins)
        .where(
          sql`${plugins.status} = 'approved' AND (${plugins.name} LIKE ${`%${input.query}%`} OR ${plugins.description} LIKE ${`%${input.query}%`})`
        )
        .orderBy(sql`${plugins.downloadCount} DESC`)
        .limit(input.limit);

      return searchResults;
    }),

  
  getPluginForBot: publicProcedure
    .input(z.object({ pluginId: z.number() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select()
        .from(plugins)
        .where(eq(plugins.id, input.pluginId))
        .limit(1);

      return result[0] || null;
    }),

  
  getBotStats: protectedProcedure
    .query(async ({ ctx }) => {
      const [totalPlugins] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(plugins)
        .where(eq(plugins.status, "approved"));

      const [totalDownloads] = await ctx.db
        .select({ total: sql<number>`sum(${plugins.downloadCount})` })
        .from(plugins)
        .where(eq(plugins.status, "approved"));

      const [botDownloads] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(pluginDownloads)
        .where(sql`${pluginDownloads.userAgent} LIKE 'Telegram Bot User%'`);

      return {
        totalPlugins: totalPlugins?.count || 0,
        totalDownloads: totalDownloads?.total || 0,
        botDownloads: botDownloads?.count || 0,
      };
    }),
});
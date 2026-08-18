import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { generateSlug } from "../src/lib/utils";
import { plugins } from "../src/server/db/schema";

config();

async function fixPluginSlugs() {
	console.log("🔧 Starting plugin slug fix...\n");

	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		console.error("DATABASE_URL environment variable is not set");
		process.exit(1);
	}

	const client = postgres(connectionString);
	const db = drizzle(client);

	try {
		const allPlugins = await db.select().from(plugins);

		console.log(`📦 Found ${allPlugins.length} plugins to check\n`);

		let fixedCount = 0;
		let skippedCount = 0;

		for (const plugin of allPlugins) {
			const hasIdInSlug = plugin.slug.includes(`.${plugin.id}`);

			if (!hasIdInSlug) {
				const baseSlug = generateSlug(plugin.name);
				const correctSlug = `${baseSlug}.${plugin.id}`;

				console.log(`❌ Plugin "${plugin.name}" (ID: ${plugin.id})`);
				console.log(`   Old slug: ${plugin.slug}`);
				console.log(`   New slug: ${correctSlug}`);

				await db
					.update(plugins)
					.set({ slug: correctSlug })
					.where(eq(plugins.id, plugin.id));

				fixedCount++;
				console.log(`   ✅ Fixed!\n`);
			} else {
				skippedCount++;
				console.log(
					`✓ Plugin "${plugin.name}" already has correct slug: ${plugin.slug}`,
				);
			}
		}

		console.log("\n📊 Summary:");
		console.log(`   ✅ Fixed: ${fixedCount} plugins`);
		console.log(`   ⏭️  Skipped: ${skippedCount} plugins (already correct)`);
		console.log(`   📦 Total: ${allPlugins.length} plugins`);
	} catch (error) {
		console.error("❌ Error fixing plugin slugs:", error);
		process.exit(1);
	} finally {
		await client.end();
	}
}

fixPluginSlugs()
	.then(() => {
		console.log("\n✨ Plugin slug fix completed successfully!");
		process.exit(0);
	})
	.catch((error) => {
		console.error("❌ Fatal error:", error);
		process.exit(1);
	});

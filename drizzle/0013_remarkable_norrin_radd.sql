DROP INDEX "review_unique_idx";--> statement-breakpoint
DELETE FROM "extera_plugins_plugin_review" AS older
USING "extera_plugins_plugin_review" AS newer
WHERE older."plugin_id" = newer."plugin_id"
	AND older."user_id" = newer."user_id"
	AND older."id" < newer."id";--> statement-breakpoint
CREATE UNIQUE INDEX "review_unique_idx" ON "extera_plugins_plugin_review" USING btree ("plugin_id","user_id");
--> statement-breakpoint
UPDATE "extera_plugins_plugin" AS plugin
SET
	"rating" = recalculated."average_rating",
	"rating_count" = recalculated."rating_count"
FROM (
	SELECT
		catalog_plugin."id",
		COALESCE(AVG(review."rating"), 0)::real AS "average_rating",
		COUNT(review."id")::integer AS "rating_count"
	FROM "extera_plugins_plugin" AS catalog_plugin
	LEFT JOIN "extera_plugins_plugin_review" AS review
		ON review."plugin_id" = catalog_plugin."id"
	GROUP BY catalog_plugin."id"
) AS recalculated
WHERE plugin."id" = recalculated."id";

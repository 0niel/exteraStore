-- Проверка битых foreign key записей (без удаления)

WITH orphaned_counts AS (
    SELECT 
        CASE 
            WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'extera_plugins_user_plugin_subscription')
            THEN (SELECT COUNT(*) FROM extera_plugins_user_plugin_subscription WHERE plugin_id NOT IN (SELECT id FROM extera_plugins_plugin))
            ELSE 0
        END AS subscriptions,
        CASE 
            WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'extera_plugins_user_favorite')
            THEN (SELECT COUNT(*) FROM extera_plugins_user_favorite WHERE plugin_id NOT IN (SELECT id FROM extera_plugins_plugin))
            ELSE 0
        END AS favorites,
        CASE 
            WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'extera_plugins_plugin_review')
            THEN (SELECT COUNT(*) FROM extera_plugins_plugin_review WHERE plugin_id NOT IN (SELECT id FROM extera_plugins_plugin))
            ELSE 0
        END AS reviews,
        CASE 
            WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'extera_plugins_plugin_download')
            THEN (SELECT COUNT(*) FROM extera_plugins_plugin_download WHERE plugin_id NOT IN (SELECT id FROM extera_plugins_plugin))
            ELSE 0
        END AS downloads,
        CASE 
            WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'extera_plugins_plugin_version')
            THEN (SELECT COUNT(*) FROM extera_plugins_plugin_version WHERE plugin_id NOT IN (SELECT id FROM extera_plugins_plugin))
            ELSE 0
        END AS versions
)
SELECT 'Subscriptions with orphaned plugin_id' AS table_name, subscriptions AS orphaned_count FROM orphaned_counts
UNION ALL
SELECT 'Favorites with orphaned plugin_id', favorites FROM orphaned_counts
UNION ALL
SELECT 'Reviews with orphaned plugin_id', reviews FROM orphaned_counts
UNION ALL
SELECT 'Downloads with orphaned plugin_id', downloads FROM orphaned_counts
UNION ALL
SELECT 'Versions with orphaned plugin_id', versions FROM orphaned_counts;


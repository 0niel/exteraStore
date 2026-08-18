-- Очистка битых foreign key записей

DO $$ 
BEGIN
    -- Удаление подписок на несуществующие плагины
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'extera_plugins_user_plugin_subscription') THEN
        DELETE FROM extera_plugins_user_plugin_subscription
        WHERE plugin_id NOT IN (SELECT id FROM extera_plugins_plugin);
    END IF;

    -- Удаление избранного на несуществующие плагины
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'extera_plugins_user_favorite') THEN
        DELETE FROM extera_plugins_user_favorite
        WHERE plugin_id NOT IN (SELECT id FROM extera_plugins_plugin);
    END IF;

    -- Удаление отзывов на несуществующие плагины
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'extera_plugins_plugin_review') THEN
        DELETE FROM extera_plugins_plugin_review
        WHERE plugin_id NOT IN (SELECT id FROM extera_plugins_plugin);
    END IF;

    -- Удаление скачиваний несуществующих плагинов
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'extera_plugins_plugin_download') THEN
        DELETE FROM extera_plugins_plugin_download
        WHERE plugin_id NOT IN (SELECT id FROM extera_plugins_plugin);
    END IF;

    -- Удаление версий несуществующих плагинов
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'extera_plugins_plugin_version') THEN
        DELETE FROM extera_plugins_plugin_version
        WHERE plugin_id NOT IN (SELECT id FROM extera_plugins_plugin);
    END IF;

    -- Удаление pipeline checks несуществующих плагинов
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'extera_plugins_plugin_pipeline_check') THEN
        DELETE FROM extera_plugins_plugin_pipeline_check
        WHERE plugin_id NOT IN (SELECT id FROM extera_plugins_plugin);
    END IF;
END $$;

SELECT 'Orphaned records cleanup completed' AS status;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'extera_plugins_plugin_pipeline_check'
        AND column_name = 'classification'
    ) THEN
        ALTER TABLE "extera_plugins_plugin_pipeline_check" ADD COLUMN "classification" text DEFAULT 'safe';
    END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'extera_plugins_plugin_pipeline_check'
        AND column_name = 'short_description'
    ) THEN
        ALTER TABLE "extera_plugins_plugin_pipeline_check" ADD COLUMN "short_description" text;
    END IF;
END $$;
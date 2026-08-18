DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'extera_plugins_plugin_download'
        AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE "extera_plugins_plugin_download" RENAME COLUMN "ip_address" TO "ip_hash";
    END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "download_ip_hash_idx" ON "extera_plugins_plugin_download" USING btree ("ip_hash");
ALTER TABLE `share_links` ADD `view_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `share_links` ADD `last_viewed_at` integer;
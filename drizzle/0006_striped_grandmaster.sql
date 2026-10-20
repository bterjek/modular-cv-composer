CREATE TABLE `compositions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`source_document_id` text,
	`design_key` text NOT NULL,
	`style` text DEFAULT '{}' NOT NULL,
	`document` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_document_id`) REFERENCES `source_documents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `compositions_owner` ON `compositions` (`owner_id`);--> statement-breakpoint
CREATE TABLE `source_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`filename` text NOT NULL,
	`media_type` text NOT NULL,
	`sha256` text NOT NULL,
	`extracted_text` text,
	`targeting` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `source_documents_owner` ON `source_documents` (`owner_id`);--> statement-breakpoint
CREATE TABLE `source_references` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`source_document_id` text NOT NULL,
	`entry_id` text,
	`item_id` text,
	`variant_id` text,
	`location` text DEFAULT '' NOT NULL,
	`excerpt` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_document_id`) REFERENCES `source_documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "source_references_one_target" CHECK((("source_references"."entry_id" IS NOT NULL) + ("source_references"."item_id" IS NOT NULL) + ("source_references"."variant_id" IS NOT NULL)) = 1)
);
--> statement-breakpoint
CREATE INDEX `source_references_owner` ON `source_references` (`owner_id`);--> statement-breakpoint
ALTER TABLE `items` ADD `facts` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `variants` ADD `targeting` text DEFAULT '{"roleFamilies":[],"competencies":[],"keywords":[],"basis":"unspecified","notes":""}' NOT NULL;
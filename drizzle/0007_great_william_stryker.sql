CREATE TABLE `cv_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`source_document_id` text NOT NULL,
	`draft` text NOT NULL,
	`composition_id` text,
	`accepted_at` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_document_id`) REFERENCES `source_documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`composition_id`) REFERENCES `compositions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cv_imports_source_document_id_unique` ON `cv_imports` (`source_document_id`);--> statement-breakpoint
CREATE INDEX `cv_imports_owner` ON `cv_imports` (`owner_id`);--> statement-breakpoint
CREATE TABLE `source_files` (
	`source_document_id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`bytes` blob NOT NULL,
	FOREIGN KEY (`source_document_id`) REFERENCES `source_documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);

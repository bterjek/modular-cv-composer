CREATE TABLE `term_status` (
	`owner_id` text NOT NULL,
	`term_key` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	PRIMARY KEY(`owner_id`, `term_key`),
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);

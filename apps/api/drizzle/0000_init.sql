CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`headword` text NOT NULL,
	`hint` text NOT NULL,
	`created_at` text NOT NULL,
	`connections_meaning` text,
	`connections_generated_at` text
);
--> statement-breakpoint
CREATE TABLE `entry_connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` text NOT NULL,
	`word` text NOT NULL,
	`relation` text NOT NULL,
	`related_entry_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`related_entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action
);

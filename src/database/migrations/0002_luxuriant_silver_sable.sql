CREATE TABLE `admin_verification_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`purpose` text NOT NULL,
	`expires_at` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 5 NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_admin_codes_admin_purpose` ON `admin_verification_codes` (`admin_id`,`purpose`);--> statement-breakpoint
ALTER TABLE `admin_users` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `admin_users` ADD `avatar_url` text;--> statement-breakpoint
ALTER TABLE `admin_users` ADD `is_suspended` integer DEFAULT false NOT NULL;
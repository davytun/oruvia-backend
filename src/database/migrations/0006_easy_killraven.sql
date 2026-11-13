CREATE TABLE `seeker_favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`seeker_id` text NOT NULL,
	`listing_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`seeker_id`) REFERENCES `seeker_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`listing_id`) REFERENCES `property_listings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_seeker_favorites_unique` ON `seeker_favorites` (`seeker_id`,`listing_id`);--> statement-breakpoint
CREATE INDEX `idx_seeker_favorites_seeker_created` ON `seeker_favorites` (`seeker_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_seeker_favorites_listing` ON `seeker_favorites` (`listing_id`);
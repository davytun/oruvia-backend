CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`seeker_id` text NOT NULL,
	`target_type` text NOT NULL,
	`listing_id` text,
	`lister_type` text,
	`lister_id` text,
	`rating` integer NOT NULL,
	`comment` text,
	`is_verified_inspection` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`reply_text` text,
	`replied_at` text,
	`hidden_reason` text,
	`moderated_by` text,
	`moderated_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`seeker_id`) REFERENCES `seeker_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`listing_id`) REFERENCES `property_listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`moderated_by`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_reviews_seeker_listing` ON `reviews` (`seeker_id`,`listing_id`) WHERE "reviews"."target_type" = 'listing';--> statement-breakpoint
CREATE UNIQUE INDEX `uq_reviews_seeker_lister` ON `reviews` (`seeker_id`,`lister_type`,`lister_id`) WHERE "reviews"."target_type" = 'lister';--> statement-breakpoint
CREATE INDEX `idx_reviews_listing_status` ON `reviews` (`listing_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_reviews_lister_status` ON `reviews` (`lister_type`,`lister_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_reviews_seeker` ON `reviews` (`seeker_id`);--> statement-breakpoint
ALTER TABLE `agent_users` ADD `average_rating` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `agent_users` ADD `review_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `landlord_users` ADD `average_rating` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `landlord_users` ADD `review_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `property_listings` ADD `average_rating` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `property_listings` ADD `review_count` integer DEFAULT 0 NOT NULL;
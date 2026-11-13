CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_role` text NOT NULL,
	`reporter_id` text NOT NULL,
	`target_type` text NOT NULL,
	`listing_id` text,
	`target_user_role` text,
	`target_user_id` text,
	`reason` text NOT NULL,
	`description` text,
	`evidence_urls` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`action_taken` text,
	`admin_notes` text,
	`reviewed_by_admin_id` text,
	`reviewed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `property_listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by_admin_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_reports_reporter` ON `reports` (`reporter_role`,`reporter_id`);--> statement-breakpoint
CREATE INDEX `idx_reports_status` ON `reports` (`status`);--> statement-breakpoint
CREATE INDEX `idx_reports_listing` ON `reports` (`listing_id`);--> statement-breakpoint
CREATE INDEX `idx_reports_target_user` ON `reports` (`target_user_role`,`target_user_id`);
CREATE TABLE `property_verification_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`lister_role` text NOT NULL,
	`lister_id` text NOT NULL,
	`verification_method` text NOT NULL,
	`document_type` text,
	`document_urls` text DEFAULT '[]' NOT NULL,
	`site_contact_name` text,
	`site_contact_phone` text,
	`preferred_inspection_date` text,
	`notes` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`qualified_badge` text,
	`rejection_reason` text,
	`admin_notes` text,
	`reviewed_by_admin_id` text,
	`submitted_at` text NOT NULL,
	`reviewed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `property_listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by_admin_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_prop_verif_listing` ON `property_verification_submissions` (`listing_id`);--> statement-breakpoint
CREATE INDEX `idx_prop_verif_status` ON `property_verification_submissions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_prop_verif_lister` ON `property_verification_submissions` (`lister_role`,`lister_id`);--> statement-breakpoint
ALTER TABLE `property_listings` ADD `is_property_verified` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `property_listings` ADD `property_verification_status` text DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE `property_listings` ADD `property_verification_badge` text;--> statement-breakpoint
ALTER TABLE `property_listings` ADD `property_verified_at` text;--> statement-breakpoint
CREATE INDEX `idx_listings_property_verified` ON `property_listings` (`is_property_verified`);
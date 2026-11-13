CREATE TABLE `inquiry_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`inquiry_id` text NOT NULL,
	`sender_role` text NOT NULL,
	`sender_id` text NOT NULL,
	`body` text NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`read_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`inquiry_id`) REFERENCES `property_inquiries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_inquiry_messages_inquiry_created` ON `inquiry_messages` (`inquiry_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `property_inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`listing_id` text NOT NULL,
	`seeker_id` text NOT NULL,
	`lister_role` text NOT NULL,
	`lister_id` text NOT NULL,
	`subject` text,
	`status` text DEFAULT 'open' NOT NULL,
	`last_message_preview` text,
	`last_message_at` text NOT NULL,
	`last_sender_role` text NOT NULL,
	`seeker_unread_count` integer DEFAULT 0 NOT NULL,
	`lister_unread_count` integer DEFAULT 0 NOT NULL,
	`closed_by` text,
	`closed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `property_listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`seeker_id`) REFERENCES `seeker_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `property_inquiries_reference_unique` ON `property_inquiries` (`reference`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_inquiries_seeker_listing` ON `property_inquiries` (`seeker_id`,`listing_id`);--> statement-breakpoint
CREATE INDEX `idx_inquiries_seeker_last` ON `property_inquiries` (`seeker_id`,`last_message_at`);--> statement-breakpoint
CREATE INDEX `idx_inquiries_lister_last` ON `property_inquiries` (`lister_role`,`lister_id`,`last_message_at`);--> statement-breakpoint
CREATE INDEX `idx_inquiries_status` ON `property_inquiries` (`status`);
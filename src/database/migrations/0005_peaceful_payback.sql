CREATE TABLE `inspection_booking_events` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`from_status` text,
	`to_status` text,
	`note` text,
	`metadata` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `inspection_bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_inspection_events_booking_created` ON `inspection_booking_events` (`booking_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `inspection_bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`listing_id` text NOT NULL,
	`seeker_id` text NOT NULL,
	`lister_role` text NOT NULL,
	`lister_id` text NOT NULL,
	`mode` text DEFAULT 'physical' NOT NULL,
	`virtual_method` text,
	`meeting_link` text,
	`recorded_video_url` text,
	`scheduled_at` text NOT NULL,
	`duration_minutes` integer DEFAULT 30 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`status_before_reschedule` text,
	`proposed_at` text,
	`proposed_by` text,
	`reschedule_reason` text,
	`seeker_note` text,
	`lister_note` text,
	`decline_reason` text,
	`cancel_reason` text,
	`cancelled_by` text,
	`inspection_fee` integer DEFAULT 0 NOT NULL,
	`fee_status` text DEFAULT 'not_required' NOT NULL,
	`reminder_sent_at` text,
	`confirmed_at` text,
	`completed_at` text,
	`cancelled_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `property_listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`seeker_id`) REFERENCES `seeker_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inspection_bookings_reference_unique` ON `inspection_bookings` (`reference`);--> statement-breakpoint
CREATE INDEX `idx_inspections_seeker_status` ON `inspection_bookings` (`seeker_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_inspections_lister_status` ON `inspection_bookings` (`lister_role`,`lister_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_inspections_listing_id` ON `inspection_bookings` (`listing_id`);--> statement-breakpoint
CREATE INDEX `idx_inspections_status_scheduled` ON `inspection_bookings` (`status`,`scheduled_at`);--> statement-breakpoint
CREATE TABLE `inspection_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`lister_role` text DEFAULT 'agent' NOT NULL,
	`lister_id` text NOT NULL,
	`slot_duration_minutes` integer DEFAULT 30 NOT NULL,
	`max_bookings_per_slot` integer DEFAULT 1 NOT NULL,
	`min_notice_hours` integer DEFAULT 0 NOT NULL,
	`accepts_virtual` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_inspection_settings_lister` ON `inspection_settings` (`lister_role`,`lister_id`);--> statement-breakpoint
CREATE TABLE `lister_availability_windows` (
	`id` text PRIMARY KEY NOT NULL,
	`lister_role` text NOT NULL,
	`lister_id` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_lister_windows_lister_day` ON `lister_availability_windows` (`lister_role`,`lister_id`,`day_of_week`);--> statement-breakpoint
CREATE TABLE `lister_blocked_dates` (
	`id` text PRIMARY KEY NOT NULL,
	`lister_role` text NOT NULL,
	`lister_id` text NOT NULL,
	`date` text NOT NULL,
	`reason` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lister_blocked_dates_lister_date` ON `lister_blocked_dates` (`lister_role`,`lister_id`,`date`);--> statement-breakpoint
ALTER TABLE `property_listings` ADD `inspection_fee` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `property_listings` ADD `allows_physical_inspection` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `property_listings` ADD `allows_virtual_inspection` integer DEFAULT true NOT NULL;
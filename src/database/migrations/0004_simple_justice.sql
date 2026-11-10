CREATE TABLE `cities` (
	`id` text PRIMARY KEY NOT NULL,
	`state_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`state_id`) REFERENCES `states`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_cities_state_id` ON `cities` (`state_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_cities_state_slug` ON `cities` (`state_id`,`slug`);--> statement-breakpoint
CREATE TABLE `property_listings` (
	`id` text PRIMARY KEY NOT NULL,
	`lister_role` text DEFAULT 'agent' NOT NULL,
	`agent_id` text,
	`landlord_id` text,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text NOT NULL,
	`classification` text DEFAULT 'rent' NOT NULL,
	`property_type_id` text NOT NULL,
	`state_id` text NOT NULL,
	`city_id` text NOT NULL,
	`area` text NOT NULL,
	`address` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`base_price` integer NOT NULL,
	`payment_frequency` text DEFAULT 'yearly' NOT NULL,
	`agency_fee` integer DEFAULT 0 NOT NULL,
	`legal_fee` integer DEFAULT 0 NOT NULL,
	`caution_fee` integer DEFAULT 0 NOT NULL,
	`service_charge` integer DEFAULT 0 NOT NULL,
	`total_initial_package` integer NOT NULL,
	`bedrooms` integer DEFAULT 1 NOT NULL,
	`bathrooms` integer DEFAULT 1 NOT NULL,
	`toilets` integer DEFAULT 1 NOT NULL,
	`amenities` text NOT NULL,
	`images` text NOT NULL,
	`video_tour_url` text,
	`availability_status` text DEFAULT 'available' NOT NULL,
	`moderation_status` text DEFAULT 'pending_review' NOT NULL,
	`rejection_reason` text,
	`reviewed_by_admin_id` text,
	`reviewed_at` text,
	`published_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agent_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`landlord_id`) REFERENCES `landlord_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_type_id`) REFERENCES `property_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`state_id`) REFERENCES `states`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by_admin_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `property_listings_slug_unique` ON `property_listings` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_listings_agent_id` ON `property_listings` (`agent_id`);--> statement-breakpoint
CREATE INDEX `idx_listings_landlord_id` ON `property_listings` (`landlord_id`);--> statement-breakpoint
CREATE INDEX `idx_listings_state_city` ON `property_listings` (`state_id`,`city_id`);--> statement-breakpoint
CREATE INDEX `idx_listings_type` ON `property_listings` (`property_type_id`);--> statement-breakpoint
CREATE INDEX `idx_listings_moderation_avail` ON `property_listings` (`moderation_status`,`availability_status`);--> statement-breakpoint
CREATE INDEX `idx_listings_base_price` ON `property_listings` (`base_price`);--> statement-breakpoint
CREATE TABLE `property_types` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'residential' NOT NULL,
	`description` text,
	`default_bedrooms` integer,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `property_types_slug_unique` ON `property_types` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_property_types_category` ON `property_types` (`category`);--> statement-breakpoint
CREATE INDEX `idx_property_types_order` ON `property_types` (`display_order`);--> statement-breakpoint
CREATE TABLE `states` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `states_name_unique` ON `states` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `states_slug_unique` ON `states` (`slug`);
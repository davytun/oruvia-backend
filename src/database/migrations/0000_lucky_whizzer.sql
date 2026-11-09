CREATE TABLE `admin_users` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`token_version` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_email_unique` ON `admin_users` (`email`);--> statement-breakpoint
CREATE TABLE `agent_users` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`whatsapp_number` text,
	`agency_name` text,
	`license_number` text,
	`bio` text,
	`avatar_url` text,
	`password_hash` text NOT NULL,
	`is_email_verified` integer DEFAULT false NOT NULL,
	`email_verified_at` text,
	`is_verified` integer DEFAULT false NOT NULL,
	`verification_status` text DEFAULT 'unverified' NOT NULL,
	`token_version` integer DEFAULT 0 NOT NULL,
	`is_suspended` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_users_email_unique` ON `agent_users` (`email`);--> statement-breakpoint
CREATE TABLE `agent_verification_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`purpose` text NOT NULL,
	`expires_at` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 5 NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agent_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_agent_codes_agent_purpose` ON `agent_verification_codes` (`agent_id`,`purpose`);--> statement-breakpoint
CREATE TABLE `landlord_users` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`whatsapp_number` text,
	`company_name` text,
	`bio` text,
	`avatar_url` text,
	`password_hash` text NOT NULL,
	`is_email_verified` integer DEFAULT false NOT NULL,
	`email_verified_at` text,
	`is_verified` integer DEFAULT false NOT NULL,
	`verification_status` text DEFAULT 'unverified' NOT NULL,
	`token_version` integer DEFAULT 0 NOT NULL,
	`is_suspended` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `landlord_users_email_unique` ON `landlord_users` (`email`);--> statement-breakpoint
CREATE TABLE `landlord_verification_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`landlord_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`purpose` text NOT NULL,
	`expires_at` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 5 NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`landlord_id`) REFERENCES `landlord_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_landlord_codes_landlord_purpose` ON `landlord_verification_codes` (`landlord_id`,`purpose`);--> statement-breakpoint
CREATE TABLE `seeker_users` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`password_hash` text NOT NULL,
	`avatar_url` text,
	`preferred_location` text,
	`is_email_verified` integer DEFAULT false NOT NULL,
	`email_verified_at` text,
	`token_version` integer DEFAULT 0 NOT NULL,
	`is_suspended` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seeker_users_email_unique` ON `seeker_users` (`email`);--> statement-breakpoint
CREATE TABLE `seeker_verification_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`seeker_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`purpose` text NOT NULL,
	`expires_at` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 5 NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`seeker_id`) REFERENCES `seeker_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_seeker_codes_seeker_purpose` ON `seeker_verification_codes` (`seeker_id`,`purpose`);
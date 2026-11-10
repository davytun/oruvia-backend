CREATE TABLE `agent_kyc_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`id_type` text NOT NULL,
	`id_number` text NOT NULL,
	`id_document_url` text NOT NULL,
	`selfie_url` text NOT NULL,
	`agency_name` text,
	`license_number` text,
	`license_document_url` text,
	`office_address` text NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`qualified_badge` text NOT NULL,
	`rejection_reason` text,
	`submitted_at` text NOT NULL,
	`reviewed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agent_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_kyc_submissions_agent_id_unique` ON `agent_kyc_submissions` (`agent_id`);--> statement-breakpoint
CREATE INDEX `idx_agent_kyc_status` ON `agent_kyc_submissions` (`status`);--> statement-breakpoint
CREATE TABLE `landlord_kyc_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`landlord_id` text NOT NULL,
	`id_type` text NOT NULL,
	`id_number` text NOT NULL,
	`id_document_url` text NOT NULL,
	`selfie_url` text NOT NULL,
	`proof_type` text NOT NULL,
	`proof_document_url` text NOT NULL,
	`residential_address` text NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`qualified_badge` text NOT NULL,
	`rejection_reason` text,
	`submitted_at` text NOT NULL,
	`reviewed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`landlord_id`) REFERENCES `landlord_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `landlord_kyc_submissions_landlord_id_unique` ON `landlord_kyc_submissions` (`landlord_id`);--> statement-breakpoint
CREATE INDEX `idx_landlord_kyc_status` ON `landlord_kyc_submissions` (`status`);--> statement-breakpoint
ALTER TABLE `agent_users` ADD `verification_badge` text;--> statement-breakpoint
ALTER TABLE `landlord_users` ADD `verification_badge` text;
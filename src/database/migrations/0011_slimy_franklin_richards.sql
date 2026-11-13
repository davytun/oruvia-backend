CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient_role` text NOT NULL,
	`recipient_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`metadata` text,
	`is_read` integer DEFAULT false NOT NULL,
	`read_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_recipient_created` ON `notifications` (`recipient_role`,`recipient_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_notifications_recipient_unread` ON `notifications` (`recipient_role`,`recipient_id`,`is_read`);
CREATE TABLE `password_change_reminder_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`isActive` boolean NOT NULL DEFAULT true,
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `password_change_reminder_schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_change_reminder_schedules_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
ALTER TABLE `account_activation_certificate_exports` ADD `status` enum('valid','revoked','expired') DEFAULT 'valid' NOT NULL;--> statement-breakpoint
ALTER TABLE `account_activation_certificate_exports` ADD `statusChangedAt` timestamp;--> statement-breakpoint
ALTER TABLE `account_activation_certificate_exports` ADD `statusChangedById` int;--> statement-breakpoint
ALTER TABLE `account_activation_certificate_exports` ADD `statusReason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordChangedAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordReminderSentAt` timestamp;--> statement-breakpoint
CREATE INDEX `password_change_reminder_schedule_task_index` ON `password_change_reminder_schedules` (`scheduleCronTaskUid`);--> statement-breakpoint
ALTER TABLE `account_activation_certificate_exports` ADD CONSTRAINT `act_cert_export_status_by_fk` FOREIGN KEY (`statusChangedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `activation_certificate_exports_status_created_index` ON `account_activation_certificate_exports` (`status`,`createdAt`);

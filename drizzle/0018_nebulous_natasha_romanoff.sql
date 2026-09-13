CREATE TABLE `account_deduplication_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int,
	`duplicateGroupCount` int NOT NULL DEFAULT 0,
	`reportJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `account_deduplication_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `account_deduplication_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`isActive` boolean NOT NULL DEFAULT true,
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `account_deduplication_schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_deduplication_schedules_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
CREATE TABLE `login_device_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`deviceId` varchar(128) NOT NULL,
	`status` enum('pending','confirmed','revoked') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`confirmedAt` timestamp,
	CONSTRAINT `login_device_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `account_deduplication_reports` ADD CONSTRAINT `dedup_reports_schedule_fk` FOREIGN KEY (`scheduleId`) REFERENCES `account_deduplication_schedules`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `login_device_alerts` ADD CONSTRAINT `device_alerts_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `login_device_alerts` ADD CONSTRAINT `device_alerts_device_fk` FOREIGN KEY (`deviceId`) REFERENCES `login_devices`(`deviceId`) ON DELETE cascade ON UPDATE no action;

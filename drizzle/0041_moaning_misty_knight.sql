CREATE TABLE `borrow_return_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`borrowRecordId` int NOT NULL,
	`borrowerId` int NOT NULL,
	`reminderType` enum('due_soon','overdue') NOT NULL,
	`reminderDate` varchar(10) NOT NULL,
	`emailStatus` enum('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
	`emailSentAt` timestamp,
	`emailError` text,
	`inAppReadAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `borrow_return_reminders_id` PRIMARY KEY(`id`),
	CONSTRAINT `borrow_return_reminders_once_per_day_index` UNIQUE(`borrowRecordId`,`reminderType`,`reminderDate`)
);
--> statement-breakpoint
CREATE TABLE `overdue_borrow_reminder_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`isActive` boolean NOT NULL DEFAULT true,
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `overdue_borrow_reminder_schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `overdue_borrow_reminder_schedules_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
ALTER TABLE `borrow_return_reminders` ADD CONSTRAINT `borrow_return_reminders_borrowRecordId_borrow_records_id_fk` FOREIGN KEY (`borrowRecordId`) REFERENCES `borrow_records`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `borrow_return_reminders` ADD CONSTRAINT `borrow_return_reminders_borrowerId_users_id_fk` FOREIGN KEY (`borrowerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `borrow_return_reminders_borrower_read_index` ON `borrow_return_reminders` (`borrowerId`,`inAppReadAt`);--> statement-breakpoint
CREATE INDEX `overdue_borrow_reminder_schedule_task_index` ON `overdue_borrow_reminder_schedules` (`scheduleCronTaskUid`);
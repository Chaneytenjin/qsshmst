CREATE TABLE `operation_log_retention_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`cutoffAt` timestamp NOT NULL,
	`deletedCount` int NOT NULL,
	`ranAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operation_log_retention_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operation_log_retention_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`retentionDays` int NOT NULL DEFAULT 365,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operation_log_retention_schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `operation_log_retention_schedules_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
ALTER TABLE `operation_log_retention_runs` ADD CONSTRAINT `op_log_retention_run_schedule_fk` FOREIGN KEY (`scheduleId`) REFERENCES `operation_log_retention_schedules`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `operation_log_retention_runs_schedule_index` ON `operation_log_retention_runs` (`scheduleId`,`ranAt`);

CREATE TABLE `attendance_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('unmarked','present','late','absent','excused') NOT NULL DEFAULT 'unmarked',
	`note` varchar(500),
	`markedById` int,
	`markedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_records_session_user_unique` UNIQUE(`sessionId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `attendance_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(160) NOT NULL,
	`attendanceAt` timestamp NOT NULL,
	`location` varchar(160),
	`note` text,
	`createdById` int,
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_sessionId_attendance_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `attendance_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_markedById_users_id_fk` FOREIGN KEY (`markedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_sessions` ADD CONSTRAINT `attendance_sessions_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `attendance_records_session_status_index` ON `attendance_records` (`sessionId`,`status`);--> statement-breakpoint
CREATE INDEX `attendance_records_user_updated_index` ON `attendance_records` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `attendance_sessions_attendance_at_index` ON `attendance_sessions` (`attendanceAt`);--> statement-breakpoint
CREATE INDEX `attendance_sessions_created_by_index` ON `attendance_sessions` (`createdById`);
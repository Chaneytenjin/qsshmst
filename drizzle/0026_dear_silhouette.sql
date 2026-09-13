CREATE TABLE `system_report_reads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`userId` int NOT NULL,
	`readAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `system_report_reads_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_report_reads_report_user_unique` UNIQUE(`reportId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `system_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(160) NOT NULL,
	`content` text NOT NULL,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`authorId` int NOT NULL,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `system_report_reads` ADD CONSTRAINT `system_report_reads_reportId_system_reports_id_fk` FOREIGN KEY (`reportId`) REFERENCES `system_reports`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `system_report_reads` ADD CONSTRAINT `system_report_reads_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `system_reports` ADD CONSTRAINT `system_reports_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
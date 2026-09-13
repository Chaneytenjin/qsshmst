CREATE TABLE `system_report_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`assetKind` enum('image','attachment') NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`mimeType` varchar(127) NOT NULL,
	`sizeBytes` int NOT NULL,
	`uploadedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `system_report_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `system_reports` ADD `expiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `system_report_assets` ADD CONSTRAINT `system_report_assets_reportId_system_reports_id_fk` FOREIGN KEY (`reportId`) REFERENCES `system_reports`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `system_report_assets` ADD CONSTRAINT `system_report_assets_uploadedById_users_id_fk` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `system_report_assets_report_index` ON `system_report_assets` (`reportId`);
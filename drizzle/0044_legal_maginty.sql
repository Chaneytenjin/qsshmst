CREATE TABLE `equipment_location_movement_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipmentId` int NOT NULL,
	`month` varchar(7) NOT NULL,
	`thresholdCount` int NOT NULL,
	`actualCount` int NOT NULL,
	`notificationStatus` enum('pending','sent','failed','suppressed') NOT NULL DEFAULT 'pending',
	`notificationError` text,
	`triggeredById` int NOT NULL,
	`alertedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipment_location_movement_alerts_id` PRIMARY KEY(`id`),
	CONSTRAINT `equipment_location_movement_alerts_once_per_month_index` UNIQUE(`equipmentId`,`month`)
);
--> statement-breakpoint
ALTER TABLE `borrow_return_reminders` ADD `resendCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `borrow_return_reminders` ADD `lastResentAt` timestamp;--> statement-breakpoint
ALTER TABLE `borrow_return_reminders` ADD `lastResentById` int;--> statement-breakpoint
ALTER TABLE `equipment_location_movement_alerts` ADD CONSTRAINT `equipment_location_movement_alerts_equipmentId_equipment_id_fk` FOREIGN KEY (`equipmentId`) REFERENCES `equipment`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment_location_movement_alerts` ADD CONSTRAINT `equipment_location_movement_alerts_triggeredById_users_id_fk` FOREIGN KEY (`triggeredById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `equipment_location_movement_alerts_month_status_index` ON `equipment_location_movement_alerts` (`month`,`notificationStatus`);--> statement-breakpoint
ALTER TABLE `borrow_return_reminders` ADD CONSTRAINT `borrow_return_reminders_lastResentById_users_id_fk` FOREIGN KEY (`lastResentById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
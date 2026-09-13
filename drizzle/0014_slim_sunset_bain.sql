CREATE TABLE `equipment_location_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipmentId` int NOT NULL,
	`previousLocation` varchar(256),
	`newLocation` varchar(256),
	`changedById` int NOT NULL,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	`note` text,
	CONSTRAINT `equipment_location_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `equipment_location_history` ADD CONSTRAINT `equipment_location_history_equipmentId_equipment_id_fk` FOREIGN KEY (`equipmentId`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment_location_history` ADD CONSTRAINT `equipment_location_history_changedById_users_id_fk` FOREIGN KEY (`changedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
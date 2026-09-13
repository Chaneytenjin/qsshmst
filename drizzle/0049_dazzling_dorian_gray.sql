CREATE TABLE `system_maintenance_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`maintenanceMode` boolean NOT NULL DEFAULT false,
	`updatedById` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_maintenance_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `system_maintenance_settings` ADD CONSTRAINT `system_maintenance_settings_updatedById_users_id_fk` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
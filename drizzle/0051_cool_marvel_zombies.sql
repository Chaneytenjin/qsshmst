ALTER TABLE `system_maintenance_settings` ADD `scheduledMode` enum('maintenance','offline');--> statement-breakpoint
ALTER TABLE `system_maintenance_settings` ADD `scheduledFor` timestamp;--> statement-breakpoint
ALTER TABLE `system_maintenance_settings` ADD `scheduledById` int;--> statement-breakpoint
ALTER TABLE `system_maintenance_settings` ADD `announcement` text;--> statement-breakpoint
ALTER TABLE `system_maintenance_settings` ADD `estimatedRestoredAt` timestamp;--> statement-breakpoint
ALTER TABLE `system_maintenance_settings` ADD CONSTRAINT `system_maintenance_settings_scheduledById_users_id_fk` FOREIGN KEY (`scheduledById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
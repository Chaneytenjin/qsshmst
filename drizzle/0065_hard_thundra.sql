ALTER TABLE `equipment` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `equipment` ADD `deletedById` int;--> statement-breakpoint
ALTER TABLE `equipment` ADD CONSTRAINT `equipment_deletedById_users_id_fk` FOREIGN KEY (`deletedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
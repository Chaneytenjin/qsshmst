ALTER TABLE `audit_event_resolutions` DROP FOREIGN KEY `audit_event_resolutions_handledById_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `brand_logo_load_failures` DROP FOREIGN KEY `brand_logo_load_failures_reporterUserId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `equipment_location_history` DROP FOREIGN KEY `equipment_location_history_changedById_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `equipment_location_history` DROP FOREIGN KEY `equipment_location_history_reviewedById_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `equipment_location_history` DROP FOREIGN KEY `equipment_location_history_signedById_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `equipment_location_movement_alerts` DROP FOREIGN KEY `equipment_location_movement_alerts_triggeredById_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `operation_logs` DROP FOREIGN KEY `operation_logs_userId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `qr_print_history` DROP FOREIGN KEY `qr_print_history_printedById_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `audit_event_resolutions` MODIFY COLUMN `handledById` int;--> statement-breakpoint
ALTER TABLE `equipment_location_history` MODIFY COLUMN `changedById` int;--> statement-breakpoint
ALTER TABLE `equipment_location_movement_alerts` MODIFY COLUMN `triggeredById` int;--> statement-breakpoint
ALTER TABLE `operation_logs` MODIFY COLUMN `userId` int;--> statement-breakpoint
ALTER TABLE `qr_print_history` MODIFY COLUMN `printedById` int;--> statement-breakpoint
UPDATE `login_audit_logs` AS log LEFT JOIN `users` AS linked_user ON log.`userId` = linked_user.`id` SET log.`userId` = NULL WHERE log.`userId` IS NOT NULL AND linked_user.`id` IS NULL;--> statement-breakpoint
UPDATE `operation_logs` AS log LEFT JOIN `users` AS linked_user ON log.`userId` = linked_user.`id` SET log.`userId` = NULL WHERE log.`userId` IS NOT NULL AND linked_user.`id` IS NULL;--> statement-breakpoint
UPDATE `qr_print_history` AS history LEFT JOIN `users` AS linked_user ON history.`printedById` = linked_user.`id` SET history.`printedById` = NULL WHERE history.`printedById` IS NOT NULL AND linked_user.`id` IS NULL;--> statement-breakpoint
ALTER TABLE `audit_event_resolutions` ADD CONSTRAINT `audit_event_resolutions_handledById_users_id_fk` FOREIGN KEY (`handledById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `brand_logo_load_failures` ADD CONSTRAINT `brand_logo_load_failures_reporterUserId_users_id_fk` FOREIGN KEY (`reporterUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment_location_history` ADD CONSTRAINT `equipment_location_history_changedById_users_id_fk` FOREIGN KEY (`changedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment_location_history` ADD CONSTRAINT `equipment_location_history_reviewedById_users_id_fk` FOREIGN KEY (`reviewedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment_location_history` ADD CONSTRAINT `equipment_location_history_signedById_users_id_fk` FOREIGN KEY (`signedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment_location_movement_alerts` ADD CONSTRAINT `equipment_location_movement_alerts_triggeredById_users_id_fk` FOREIGN KEY (`triggeredById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `login_audit_logs` ADD CONSTRAINT `login_audit_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operation_logs` ADD CONSTRAINT `operation_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `qr_print_history` ADD CONSTRAINT `qr_print_history_printedById_users_id_fk` FOREIGN KEY (`printedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;

ALTER TABLE `equipment_location_history` ADD `reviewStatus` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `equipment_location_history` ADD `reviewNote` text;--> statement-breakpoint
ALTER TABLE `equipment_location_history` ADD `reviewedById` int;--> statement-breakpoint
ALTER TABLE `equipment_location_history` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `equipment_location_history` ADD `signatureStatus` enum('unsigned','signed') DEFAULT 'unsigned' NOT NULL;--> statement-breakpoint
ALTER TABLE `equipment_location_history` ADD `signedById` int;--> statement-breakpoint
ALTER TABLE `equipment_location_history` ADD `signedAt` timestamp;--> statement-breakpoint
ALTER TABLE `equipment_location_history` ADD `signatureMethod` varchar(64);--> statement-breakpoint
ALTER TABLE `equipment_location_history` ADD CONSTRAINT `equipment_location_history_reviewedById_users_id_fk` FOREIGN KEY (`reviewedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment_location_history` ADD CONSTRAINT `equipment_location_history_signedById_users_id_fk` FOREIGN KEY (`signedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `equipment_location_history_review_status_idx` ON `equipment_location_history` (`reviewStatus`,`changedAt`);--> statement-breakpoint
CREATE INDEX `equipment_location_history_signature_status_idx` ON `equipment_location_history` (`signatureStatus`,`signedAt`);
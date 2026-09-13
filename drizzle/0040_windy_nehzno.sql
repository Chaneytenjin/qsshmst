CREATE TABLE `brand_logo_alert_thresholds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`thresholdCount` int NOT NULL DEFAULT 3,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`createdById` int NOT NULL,
	`updatedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brand_logo_alert_thresholds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `two_factor_recovery_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`codeHash` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`usedAt` timestamp,
	`revokedAt` timestamp,
	CONSTRAINT `two_factor_recovery_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `brand_logo_alert_thresholds` ADD CONSTRAINT `brand_logo_alert_thresholds_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `brand_logo_alert_thresholds` ADD CONSTRAINT `brand_logo_alert_thresholds_updatedById_users_id_fk` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `two_factor_recovery_codes` ADD CONSTRAINT `two_factor_recovery_codes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `brand_logo_alert_thresholds_updated_index` ON `brand_logo_alert_thresholds` (`updatedAt`);--> statement-breakpoint
CREATE INDEX `two_factor_recovery_codes_user_status_index` ON `two_factor_recovery_codes` (`userId`,`usedAt`,`revokedAt`);
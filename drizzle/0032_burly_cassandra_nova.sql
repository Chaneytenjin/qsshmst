CREATE TABLE `account_activation_certificate_exports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`generatedById` int NOT NULL,
	`certificateNumber` varchar(128) NOT NULL,
	`verificationToken` varchar(96) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`source` enum('email_attachment','preview','manual_download') NOT NULL,
	`downloadCount` int NOT NULL DEFAULT 0,
	`firstDownloadedAt` timestamp,
	`lastDownloadedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `account_activation_certificate_exports_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_activation_certificate_exports_verificationToken_unique` UNIQUE(`verificationToken`)
);
--> statement-breakpoint
ALTER TABLE `account_activation_certificate_exports` ADD CONSTRAINT `account_activation_certificate_exports_accountId_users_id_fk` FOREIGN KEY (`accountId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `account_activation_certificate_exports` ADD CONSTRAINT `account_activation_certificate_exports_generatedById_users_id_fk` FOREIGN KEY (`generatedById`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `activation_certificate_exports_account_created_index` ON `account_activation_certificate_exports` (`accountId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `activation_certificate_exports_number_created_index` ON `account_activation_certificate_exports` (`certificateNumber`,`createdAt`);
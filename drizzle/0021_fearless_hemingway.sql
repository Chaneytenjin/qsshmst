CREATE TABLE `account_activation_certificate_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`sentById` int NOT NULL,
	`recipientEmailMasked` varchar(320) NOT NULL,
	`certificateNumber` varchar(128) NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `account_activation_certificate_deliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `two_factor_login_challenges` ADD `secondFactorVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `account_activation_certificate_deliveries` ADD CONSTRAINT `account_activation_certificate_deliveries_accountId_users_id_fk` FOREIGN KEY (`accountId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `account_activation_certificate_deliveries` ADD CONSTRAINT `account_activation_certificate_deliveries_sentById_users_id_fk` FOREIGN KEY (`sentById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
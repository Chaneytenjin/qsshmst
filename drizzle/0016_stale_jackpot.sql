CREATE TABLE `system_alert_email_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientId` int,
	`recipientEmail` varchar(320) NOT NULL,
	`eventKey` varchar(191) NOT NULL,
	`source` varchar(128) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`status` enum('sent','failed','suppressed') NOT NULL,
	`errorDetail` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `system_alert_email_deliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_alert_email_recipients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`label` varchar(128),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_alert_email_recipients_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_alert_email_recipients_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `system_alert_email_deliveries` ADD CONSTRAINT `alert_delivery_recipient_fk` FOREIGN KEY (`recipientId`) REFERENCES `system_alert_email_recipients`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `system_alert_email_recipients` ADD CONSTRAINT `alert_recipient_creator_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

CREATE TABLE `email_offline_command_authorized_senders` (
  `id` int AUTO_INCREMENT NOT NULL,
  `settingsId` int NOT NULL,
  `senderEmail` varchar(320) NOT NULL,
  `label` varchar(128),
  `isActive` boolean NOT NULL DEFAULT true,
  `createdById` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `email_offline_command_authorized_senders_id` PRIMARY KEY(`id`),
  CONSTRAINT `email_offline_command_sender_unique` UNIQUE(`settingsId`,`senderEmail`)
);
--> statement-breakpoint
CREATE TABLE `email_offline_command_receipts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `settingsId` int,
  `mailgunTokenHash` varchar(64) NOT NULL,
  `senderEmail` varchar(320),
  `recipientEmail` varchar(320),
  `subject` varchar(255),
  `status` enum('processing','accepted','rejected') NOT NULL,
  `rejectionCode` varchar(64),
  `resultingMode` enum('offline','already_offline'),
  `receivedAt` timestamp NOT NULL DEFAULT (now()),
  `processedAt` timestamp,
  CONSTRAINT `email_offline_command_receipts_id` PRIMARY KEY(`id`),
  CONSTRAINT `email_offline_command_receipts_mailgunTokenHash_unique` UNIQUE(`mailgunTokenHash`)
);
--> statement-breakpoint
CREATE TABLE `email_offline_command_settings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `recipientEmail` varchar(320) NOT NULL,
  `encryptedCommandSecret` varchar(1024),
  `isEnabled` boolean NOT NULL DEFAULT false,
  `authorizedById` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `email_offline_command_settings_id` PRIMARY KEY(`id`),
  CONSTRAINT `email_offline_command_settings_recipientEmail_unique` UNIQUE(`recipientEmail`)
);
--> statement-breakpoint
ALTER TABLE `email_offline_command_authorized_senders` ADD CONSTRAINT `eoc_sender_settings_fk` FOREIGN KEY (`settingsId`) REFERENCES `email_offline_command_settings`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `email_offline_command_authorized_senders` ADD CONSTRAINT `eoc_sender_created_by_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `email_offline_command_receipts` ADD CONSTRAINT `eoc_receipt_settings_fk` FOREIGN KEY (`settingsId`) REFERENCES `email_offline_command_settings`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `email_offline_command_settings` ADD CONSTRAINT `eoc_settings_authorized_by_fk` FOREIGN KEY (`authorizedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `email_offline_command_sender_active_index` ON `email_offline_command_authorized_senders` (`settingsId`,`isActive`);
--> statement-breakpoint
CREATE INDEX `email_offline_command_receipts_received_index` ON `email_offline_command_receipts` (`receivedAt`);
--> statement-breakpoint
CREATE INDEX `email_offline_command_receipts_status_index` ON `email_offline_command_receipts` (`status`,`receivedAt`);

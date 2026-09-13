ALTER TABLE `email_offline_command_receipts` ADD `replyStatus` enum('sent','failed');--> statement-breakpoint
ALTER TABLE `email_offline_command_receipts` ADD `replySentAt` timestamp;--> statement-breakpoint
ALTER TABLE `email_offline_command_receipts` ADD `replyError` text;
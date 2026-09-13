ALTER TABLE `email_offline_command_settings` ADD `gmailPollScheduleTaskUid` varchar(65);--> statement-breakpoint
ALTER TABLE `email_offline_command_settings` ADD `gmailLastPolledAt` timestamp;--> statement-breakpoint
ALTER TABLE `email_offline_command_settings` ADD `gmailLastPollError` varchar(512);--> statement-breakpoint
ALTER TABLE `email_offline_command_settings` ADD CONSTRAINT `email_offline_command_settings_gmailPollScheduleTaskUid_unique` UNIQUE(`gmailPollScheduleTaskUid`);--> statement-breakpoint
CREATE INDEX `eoc_gmail_poll_schedule_index` ON `email_offline_command_settings` (`gmailPollScheduleTaskUid`);
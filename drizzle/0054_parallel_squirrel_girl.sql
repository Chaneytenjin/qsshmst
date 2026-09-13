CREATE TABLE `media_calendar_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(160) NOT NULL,
	`category` enum('activity','duty','equipment','meeting','other') NOT NULL DEFAULT 'activity',
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp,
	`allDay` boolean NOT NULL DEFAULT false,
	`location` varchar(160),
	`description` text,
	`createdById` int NOT NULL,
	`updatedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_calendar_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `media_calendar_events` ADD CONSTRAINT `media_calendar_events_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_calendar_events` ADD CONSTRAINT `media_calendar_events_updatedById_users_id_fk` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `media_calendar_events_starts_at_index` ON `media_calendar_events` (`startsAt`);--> statement-breakpoint
CREATE INDEX `media_calendar_events_category_starts_at_index` ON `media_calendar_events` (`category`,`startsAt`);--> statement-breakpoint
CREATE INDEX `media_calendar_events_created_by_index` ON `media_calendar_events` (`createdById`);
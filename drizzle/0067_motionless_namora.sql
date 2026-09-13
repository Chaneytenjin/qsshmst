ALTER TABLE `media_calendar_events` ADD `googleEventId` varchar(255);--> statement-breakpoint
ALTER TABLE `media_calendar_events` ADD `googleCalendarUpdatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `media_calendar_events` ADD `googleSyncStatus` enum('pending','synced','error','disabled') DEFAULT 'disabled' NOT NULL;--> statement-breakpoint
ALTER TABLE `media_calendar_events` ADD `googleSyncError` text;--> statement-breakpoint
ALTER TABLE `media_calendar_events` ADD CONSTRAINT `media_calendar_events_google_event_unique` UNIQUE(`googleEventId`);
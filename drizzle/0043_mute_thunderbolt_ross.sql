CREATE TABLE `audit_event_resolutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceType` enum('loginAudit','operationLog') NOT NULL,
	`sourceEventId` int NOT NULL,
	`status` enum('in_progress','closed') NOT NULL DEFAULT 'in_progress',
	`handlingNote` text NOT NULL,
	`handledById` int NOT NULL,
	`handledAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `audit_event_resolutions_id` PRIMARY KEY(`id`),
	CONSTRAINT `audit_event_resolutions_source_unique` UNIQUE(`sourceType`,`sourceEventId`)
);
--> statement-breakpoint
ALTER TABLE `audit_event_resolutions` ADD CONSTRAINT `audit_event_resolutions_handledById_users_id_fk` FOREIGN KEY (`handledById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_event_resolutions_status_handled_at_index` ON `audit_event_resolutions` (`status`,`handledAt`);
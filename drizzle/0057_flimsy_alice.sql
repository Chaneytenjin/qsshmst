CREATE TABLE `podcast_distribution_targets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`showId` int NOT NULL,
	`platform` enum('spotify','apple_podcasts','amazon_music','youtube','other') NOT NULL,
	`status` enum('not_submitted','submitted','active','attention') NOT NULL DEFAULT 'not_submitted',
	`directoryUrl` text,
	`note` text,
	`submittedAt` timestamp,
	`lastConfirmedAt` timestamp,
	`updatedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `podcast_distribution_targets_id` PRIMARY KEY(`id`),
	CONSTRAINT `podcast_distribution_targets_show_platform_unique` UNIQUE(`showId`,`platform`)
);
--> statement-breakpoint
ALTER TABLE `podcast_shows` ADD `slug` varchar(180);--> statement-breakpoint
ALTER TABLE `podcast_shows` ADD `authorName` varchar(160);--> statement-breakpoint
ALTER TABLE `podcast_shows` ADD `ownerEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `podcast_shows` ADD `language` varchar(16) DEFAULT 'zh-TW' NOT NULL;--> statement-breakpoint
ALTER TABLE `podcast_shows` ADD `artworkUrl` text;--> statement-breakpoint
ALTER TABLE `podcast_shows` ADD `isExplicit` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `podcast_shows` ADD `rssEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `podcast_shows` ADD CONSTRAINT `podcast_shows_slug_unique` UNIQUE(`slug`);--> statement-breakpoint
ALTER TABLE `podcast_distribution_targets` ADD CONSTRAINT `podcast_distribution_targets_showId_podcast_shows_id_fk` FOREIGN KEY (`showId`) REFERENCES `podcast_shows`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `podcast_distribution_targets` ADD CONSTRAINT `podcast_distribution_targets_updatedById_users_id_fk` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `podcast_distribution_targets_show_status_index` ON `podcast_distribution_targets` (`showId`,`status`);
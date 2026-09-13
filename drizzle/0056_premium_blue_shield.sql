CREATE TABLE `podcast_episodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`showId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` text,
	`episodeNumber` int NOT NULL,
	`audioFileName` varchar(255) NOT NULL,
	`audioStorageKey` varchar(1024) NOT NULL,
	`audioUrl` text NOT NULL,
	`audioMimeType` varchar(96) NOT NULL,
	`audioSizeBytes` int NOT NULL,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`createdById` int NOT NULL,
	`updatedById` int,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `podcast_episodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `podcast_episodes_show_episode_number_unique` UNIQUE(`showId`,`episodeNumber`)
);
--> statement-breakpoint
CREATE TABLE `podcast_shows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` text,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`createdById` int NOT NULL,
	`updatedById` int,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `podcast_shows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `podcast_episodes` ADD CONSTRAINT `podcast_episodes_showId_podcast_shows_id_fk` FOREIGN KEY (`showId`) REFERENCES `podcast_shows`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `podcast_episodes` ADD CONSTRAINT `podcast_episodes_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `podcast_episodes` ADD CONSTRAINT `podcast_episodes_updatedById_users_id_fk` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `podcast_shows` ADD CONSTRAINT `podcast_shows_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `podcast_shows` ADD CONSTRAINT `podcast_shows_updatedById_users_id_fk` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `podcast_episodes_show_status_number_index` ON `podcast_episodes` (`showId`,`status`,`episodeNumber`);--> statement-breakpoint
CREATE INDEX `podcast_episodes_created_by_index` ON `podcast_episodes` (`createdById`);--> statement-breakpoint
CREATE INDEX `podcast_shows_status_published_at_index` ON `podcast_shows` (`status`,`publishedAt`);--> statement-breakpoint
CREATE INDEX `podcast_shows_created_by_index` ON `podcast_shows` (`createdById`);
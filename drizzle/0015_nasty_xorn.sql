CREATE TABLE `brand_logo_load_failures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pagePath` varchar(512) NOT NULL,
	`failedSrc` varchar(1024) NOT NULL,
	`deviceClass` enum('mobile','tablet','desktop','unknown') NOT NULL DEFAULT 'unknown',
	`viewportWidth` int,
	`failureStage` enum('initial','retry','fallback') NOT NULL,
	`userAgent` text,
	`reporterUserId` int,
	`reportedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `brand_logo_load_failures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `brand_logo_load_failures` ADD CONSTRAINT `brand_logo_load_failures_reporterUserId_users_id_fk` FOREIGN KEY (`reporterUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
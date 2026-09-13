CREATE TABLE `pin_failure_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`attemptCount` int NOT NULL DEFAULT 0,
	`lastAttemptAt` timestamp NOT NULL DEFAULT (now()),
	`lockedUntil` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pin_failure_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pin_failure_attempts` ADD CONSTRAINT `pin_failure_attempts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
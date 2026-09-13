CREATE TABLE `login_pin_failure_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`attemptCount` int NOT NULL DEFAULT 0,
	`lastAttemptAt` timestamp NOT NULL DEFAULT (now()),
	`lockedUntil` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `login_pin_failure_attempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `login_pin_failure_attempts_user_id_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `loginPinHash` varchar(255);--> statement-breakpoint
ALTER TABLE `login_pin_failure_attempts` ADD CONSTRAINT `login_pin_failure_attempts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
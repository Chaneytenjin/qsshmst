CREATE TABLE `first_login_setup_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challengeToken` varchar(128) NOT NULL,
	`userId` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `first_login_setup_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `first_login_setup_challenges_challengeToken_unique` UNIQUE(`challengeToken`)
);
--> statement-breakpoint
ALTER TABLE `first_login_setup_challenges` ADD CONSTRAINT `first_login_setup_challenges_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `first_login_setup_challenge_user_index` ON `first_login_setup_challenges` (`userId`);
CREATE TABLE `email_verifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`verificationCode` varchar(6) NOT NULL,
	`isVerified` boolean NOT NULL DEFAULT false,
	`attemptCount` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `phone_verifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`phone` varchar(20) NOT NULL,
	`verificationCode` varchar(6) NOT NULL,
	`isVerified` boolean NOT NULL DEFAULT false,
	`attemptCount` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `phone_verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `email_verifications` ADD CONSTRAINT `email_verifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `phone_verifications` ADD CONSTRAINT `phone_verifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
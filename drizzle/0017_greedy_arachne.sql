CREATE TABLE `ip_blacklist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ipAddress` varchar(45) NOT NULL,
	`note` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ip_blacklist_id` PRIMARY KEY(`id`),
	CONSTRAINT `ip_blacklist_ipAddress_unique` UNIQUE(`ipAddress`)
);
--> statement-breakpoint
CREATE TABLE `login_devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` varchar(128) NOT NULL,
	`userId` int NOT NULL,
	`deviceName` varchar(255) NOT NULL,
	`ipAddress` varchar(45),
	`userAgent` text,
	`firstSeenAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `login_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `login_devices_deviceId_unique` UNIQUE(`deviceId`)
);
--> statement-breakpoint
CREATE TABLE `two_factor_authenticators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`encryptedSecret` varchar(512) NOT NULL,
	`isEnabled` boolean NOT NULL DEFAULT false,
	`enabledAt` timestamp,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `two_factor_authenticators_id` PRIMARY KEY(`id`),
	CONSTRAINT `two_factor_authenticators_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `two_factor_login_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challengeToken` varchar(128) NOT NULL,
	`userId` int NOT NULL,
	`ipAddress` varchar(45),
	`userAgent` text,
	`attemptCount` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `two_factor_login_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `two_factor_login_challenges_challengeToken_unique` UNIQUE(`challengeToken`)
);
--> statement-breakpoint
ALTER TABLE `ip_blacklist` ADD CONSTRAINT `ip_blacklist_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `login_devices` ADD CONSTRAINT `login_devices_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `two_factor_authenticators` ADD CONSTRAINT `two_factor_authenticators_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `two_factor_login_challenges` ADD CONSTRAINT `two_factor_login_challenges_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
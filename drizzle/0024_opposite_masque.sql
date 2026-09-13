CREATE TABLE `passkey_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challenge` varchar(512) NOT NULL,
	`type` enum('registration','authentication') NOT NULL,
	`userId` int,
	`passkeyName` varchar(128),
	`rpId` varchar(255) NOT NULL,
	`origin` varchar(512) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `passkey_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `passkey_challenges_challenge_unique` UNIQUE(`challenge`)
);
--> statement-breakpoint
CREATE TABLE `passkey_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`credentialId` varchar(512) NOT NULL,
	`webauthnUserId` varchar(128) NOT NULL,
	`publicKey` text NOT NULL,
	`counter` int NOT NULL DEFAULT 0,
	`deviceType` varchar(32) NOT NULL DEFAULT 'multiDevice',
	`backedUp` boolean NOT NULL DEFAULT false,
	`transports` text,
	`name` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastUsedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `passkey_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `passkey_credentials_credentialId_unique` UNIQUE(`credentialId`)
);
--> statement-breakpoint
ALTER TABLE `passkey_challenges` ADD CONSTRAINT `passkey_challenges_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `passkey_credentials` ADD CONSTRAINT `passkey_credentials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
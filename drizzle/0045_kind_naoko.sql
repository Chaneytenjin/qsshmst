CREATE TABLE `reimbursement_claims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`claimNumber` varchar(32) NOT NULL,
	`requesterId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`purpose` text,
	`status` enum('draft','submitted','approved','rejected','paid') NOT NULL DEFAULT 'draft',
	`totalAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`submittedAt` timestamp,
	`reviewedById` int,
	`reviewedAt` timestamp,
	`reviewNote` text,
	`paidById` int,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reimbursement_claims_id` PRIMARY KEY(`id`),
	CONSTRAINT `reimbursement_claims_claimNumber_unique` UNIQUE(`claimNumber`)
);
--> statement-breakpoint
CREATE TABLE `reimbursement_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`claimId` int NOT NULL,
	`expenseDate` timestamp NOT NULL,
	`category` varchar(64) NOT NULL,
	`merchant` varchar(160),
	`description` varchar(500) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reimbursement_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reimbursement_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`claimId` int NOT NULL,
	`itemId` int,
	`fileName` varchar(255) NOT NULL,
	`storageKey` text NOT NULL,
	`url` text NOT NULL,
	`mimeType` varchar(127) NOT NULL,
	`sizeBytes` int NOT NULL,
	`uploadedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reimbursement_receipts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `reimbursement_claims` ADD CONSTRAINT `reimbursement_claims_requesterId_users_id_fk` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reimbursement_claims` ADD CONSTRAINT `reimbursement_claims_reviewedById_users_id_fk` FOREIGN KEY (`reviewedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reimbursement_claims` ADD CONSTRAINT `reimbursement_claims_paidById_users_id_fk` FOREIGN KEY (`paidById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reimbursement_items` ADD CONSTRAINT `reimbursement_items_claimId_reimbursement_claims_id_fk` FOREIGN KEY (`claimId`) REFERENCES `reimbursement_claims`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reimbursement_receipts` ADD CONSTRAINT `reimbursement_receipts_claimId_reimbursement_claims_id_fk` FOREIGN KEY (`claimId`) REFERENCES `reimbursement_claims`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reimbursement_receipts` ADD CONSTRAINT `reimbursement_receipts_itemId_reimbursement_items_id_fk` FOREIGN KEY (`itemId`) REFERENCES `reimbursement_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reimbursement_receipts` ADD CONSTRAINT `reimbursement_receipts_uploadedById_users_id_fk` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `reimbursement_claims_requester_status_index` ON `reimbursement_claims` (`requesterId`,`status`);--> statement-breakpoint
CREATE INDEX `reimbursement_claims_status_created_index` ON `reimbursement_claims` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `reimbursement_items_claim_index` ON `reimbursement_items` (`claimId`);--> statement-breakpoint
CREATE INDEX `reimbursement_receipts_claim_index` ON `reimbursement_receipts` (`claimId`);
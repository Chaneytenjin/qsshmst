CREATE TABLE `reimbursement_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`claimId` int NOT NULL,
	`recipientId` int NOT NULL,
	`notificationType` enum('approved','rejected') NOT NULL,
	`message` varchar(500) NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reimbursement_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `reimbursement_notifications` ADD CONSTRAINT `reimbursement_notifications_claimId_reimbursement_claims_id_fk` FOREIGN KEY (`claimId`) REFERENCES `reimbursement_claims`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reimbursement_notifications` ADD CONSTRAINT `reimbursement_notifications_recipientId_users_id_fk` FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `reimbursement_notifications_recipient_read_index` ON `reimbursement_notifications` (`recipientId`,`isRead`,`createdAt`);--> statement-breakpoint
CREATE INDEX `reimbursement_notifications_claim_index` ON `reimbursement_notifications` (`claimId`);
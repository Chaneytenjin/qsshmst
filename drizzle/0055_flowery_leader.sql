CREATE TABLE `media_project_proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(160) NOT NULL,
	`summary` varchar(320),
	`content` text NOT NULL,
	`proposedStartAt` timestamp,
	`proposedEndAt` timestamp,
	`requestedBudget` decimal(12,2),
	`status` enum('draft','submitted','approved','returned','rejected') NOT NULL DEFAULT 'draft',
	`applicantId` int NOT NULL,
	`reviewerId` int,
	`reviewNote` text,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_project_proposals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `media_project_proposals` ADD CONSTRAINT `media_project_proposals_applicantId_users_id_fk` FOREIGN KEY (`applicantId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media_project_proposals` ADD CONSTRAINT `media_project_proposals_reviewerId_users_id_fk` FOREIGN KEY (`reviewerId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `media_project_proposals_applicant_status_index` ON `media_project_proposals` (`applicantId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `media_project_proposals_status_created_at_index` ON `media_project_proposals` (`status`,`createdAt`);
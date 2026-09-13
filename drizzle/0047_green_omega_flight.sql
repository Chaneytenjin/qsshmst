CREATE TABLE `reimbursement_annual_budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`setById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reimbursement_annual_budgets_id` PRIMARY KEY(`id`),
	CONSTRAINT `reimbursement_annual_budgets_year_unique` UNIQUE(`year`)
);
--> statement-breakpoint
ALTER TABLE `reimbursement_annual_budgets` ADD CONSTRAINT `reimbursement_annual_budgets_setById_users_id_fk` FOREIGN KEY (`setById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
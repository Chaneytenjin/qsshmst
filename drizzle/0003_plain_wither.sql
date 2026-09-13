CREATE TABLE `login_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(64) NOT NULL,
	`userId` int,
	`ipAddress` varchar(45),
	`userAgent` text,
	`status` enum('success','failed') NOT NULL,
	`failureReason` varchar(255),
	`loginAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `login_audit_logs` ADD CONSTRAINT `login_audit_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
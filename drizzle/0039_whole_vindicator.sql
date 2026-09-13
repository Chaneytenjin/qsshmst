CREATE TABLE `qr_print_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`printedById` int NOT NULL,
	`equipmentIds` text NOT NULL,
	`equipmentCount` int NOT NULL,
	`locationFilter` varchar(256),
	`labelPaperSize` varchar(64) NOT NULL,
	`printedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `qr_print_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `qr_print_history` ADD CONSTRAINT `qr_print_history_printedById_users_id_fk` FOREIGN KEY (`printedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `qr_print_history_printed_by_idx` ON `qr_print_history` (`printedById`);--> statement-breakpoint
CREATE INDEX `qr_print_history_printed_at_idx` ON `qr_print_history` (`printedAt`);
CREATE TABLE `borrow_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`equipmentId` int NOT NULL,
	`borrowerId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`borrowedAt` timestamp NOT NULL,
	`expectedReturnAt` timestamp NOT NULL,
	`actualReturnAt` timestamp,
	`status` enum('active','returned','overdue') NOT NULL DEFAULT 'active',
	`returnNote` text,
	`handledById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `borrow_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `borrow_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipmentId` int NOT NULL,
	`requesterId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`borrowDate` timestamp NOT NULL,
	`returnDate` timestamp NOT NULL,
	`purpose` text,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`reviewerId` int,
	`reviewNote` text,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `borrow_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`categoryId` int,
	`description` text,
	`totalQuantity` int NOT NULL DEFAULT 1,
	`availableQuantity` int NOT NULL DEFAULT 1,
	`status` enum('available','maintenance','retired') NOT NULL DEFAULT 'available',
	`imageUrl` text,
	`serialNumber` varchar(128),
	`location` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equipment_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `equipment_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','teacher','student') NOT NULL DEFAULT 'student';--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `studentId` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `department` varchar(128);--> statement-breakpoint
ALTER TABLE `borrow_records` ADD CONSTRAINT `borrow_records_requestId_borrow_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `borrow_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `borrow_records` ADD CONSTRAINT `borrow_records_equipmentId_equipment_id_fk` FOREIGN KEY (`equipmentId`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `borrow_records` ADD CONSTRAINT `borrow_records_borrowerId_users_id_fk` FOREIGN KEY (`borrowerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `borrow_records` ADD CONSTRAINT `borrow_records_handledById_users_id_fk` FOREIGN KEY (`handledById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `borrow_requests` ADD CONSTRAINT `borrow_requests_equipmentId_equipment_id_fk` FOREIGN KEY (`equipmentId`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `borrow_requests` ADD CONSTRAINT `borrow_requests_requesterId_users_id_fk` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `borrow_requests` ADD CONSTRAINT `borrow_requests_reviewerId_users_id_fk` FOREIGN KEY (`reviewerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment` ADD CONSTRAINT `equipment_categoryId_equipment_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `equipment_categories`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `equipment` ADD `qrCodeId` varchar(128);--> statement-breakpoint
ALTER TABLE `equipment` ADD CONSTRAINT `equipment_qrCodeId_unique` UNIQUE(`qrCodeId`);
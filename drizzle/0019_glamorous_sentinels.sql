ALTER TABLE `login_devices` ADD `geoCountry` varchar(128);--> statement-breakpoint
ALTER TABLE `login_devices` ADD `geoRegion` varchar(128);--> statement-breakpoint
ALTER TABLE `login_devices` ADD `geoCity` varchar(128);--> statement-breakpoint
ALTER TABLE `login_devices` ADD `geoTimezone` varchar(64);--> statement-breakpoint
ALTER TABLE `login_devices` ADD `geoSource` varchar(64);--> statement-breakpoint
ALTER TABLE `login_devices` ADD `geoResolvedAt` timestamp;
ALTER TABLE `system_report_assets` ADD `downloadCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `system_reports` ADD `isPinned` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `system_reports` ADD `priority` enum('normal','important','urgent') DEFAULT 'normal' NOT NULL;--> statement-breakpoint
CREATE INDEX `system_reports_pinned_published_index` ON `system_reports` (`isPinned`,`publishedAt`);
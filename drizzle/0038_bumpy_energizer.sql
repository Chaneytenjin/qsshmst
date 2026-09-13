ALTER TABLE `brand_logo_load_failures` ADD `fallbackSrc` varchar(1024);--> statement-breakpoint
ALTER TABLE `brand_logo_load_failures` ADD `recoveryOutcome` enum('switched','text_fallback');
ALTER TABLE `financialProfiles` ADD `scheduleCronTaskUid` varchar(65);--> statement-breakpoint
ALTER TABLE `financialProfiles` ADD `scheduleCronTaskUid` varchar(65);--> statement-breakpoint
ALTER TABLE `financialProfiles` ADD `lastMarketRefreshAt` timestamp;--> statement-breakpoint
ALTER TABLE `financialProfiles` ADD `lastMarketRefreshStatus` varchar(24);--> statement-breakpoint
ALTER TABLE `financialProfiles` ADD `lastMarketRefreshMessage` text;--> statement-breakpoint
ALTER TABLE `financialProfiles` ADD CONSTRAINT `financialProfiles_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`);

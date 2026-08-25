CREATE TABLE `financialProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`payload` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financialProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `financialProfiles_userId_unique` UNIQUE(`userId`)
);

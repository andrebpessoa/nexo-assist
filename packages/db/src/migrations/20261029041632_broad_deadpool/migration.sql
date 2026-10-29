CREATE TABLE `usage_counter` (
	`key` text PRIMARY KEY,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);

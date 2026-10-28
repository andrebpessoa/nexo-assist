ALTER TABLE `conversation` ADD `assignee_id` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `conversation` ADD `read_seq` integer DEFAULT 0 NOT NULL;
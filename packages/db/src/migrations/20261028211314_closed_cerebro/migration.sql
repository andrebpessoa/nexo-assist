CREATE TABLE `conversation` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`state` text NOT NULL,
	`pending` text,
	`summary` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_conversation_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `conversation_message` (
	`id` text PRIMARY KEY,
	`conversation_id` text NOT NULL,
	`seq` integer NOT NULL,
	`role` text NOT NULL,
	`text` text NOT NULL,
	`blocks` text NOT NULL,
	`decision` text,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_conversation_message_conversation_id_conversation_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversation`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `conversation_user_idx` ON `conversation` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_message_seq_idx` ON `conversation_message` (`conversation_id`,`seq`);
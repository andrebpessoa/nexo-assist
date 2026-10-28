CREATE TABLE `kb_article` (
	`slug` text PRIMARY KEY,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`applies_when` text NOT NULL,
	`keywords` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`user_id` text PRIMARY KEY,
	`role` text NOT NULL,
	`department` text,
	`os` text,
	`team` text,
	`password_changed_at` integer,
	CONSTRAINT `fk_profile_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `ticket` (
	`id` text PRIMARY KEY,
	`number` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`item` text,
	`priority` text NOT NULL,
	`affected` text NOT NULL,
	`status` text NOT NULL,
	`requester_id` text NOT NULL,
	`assignee_id` text,
	`opened_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`sla_anchor_at` integer NOT NULL,
	`resolved_at` integer,
	`idempotency_key` text,
	CONSTRAINT `fk_ticket_requester_id_user_id_fk` FOREIGN KEY (`requester_id`) REFERENCES `user`(`id`),
	CONSTRAINT `fk_ticket_assignee_id_user_id_fk` FOREIGN KEY (`assignee_id`) REFERENCES `user`(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_counter` (
	`type` text PRIMARY KEY,
	`value` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ticket_event` (
	`id` text PRIMARY KEY,
	`ticket_id` text NOT NULL,
	`kind` text NOT NULL,
	`actor_id` text NOT NULL,
	`summary` text,
	`team` text,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_ticket_event_ticket_id_ticket_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `ticket`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_ticket_event_actor_id_user_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_note` (
	`id` text PRIMARY KEY,
	`ticket_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_ticket_note_ticket_id_ticket_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `ticket`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_ticket_note_author_id_user_id_fk` FOREIGN KEY (`author_id`) REFERENCES `user`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_number_unique` ON `ticket` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_idempotency_key_unique` ON `ticket` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `ticket_requester_updated_idx` ON `ticket` (`requester_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `ticket_event_ticket_idx` ON `ticket_event` (`ticket_id`);--> statement-breakpoint
CREATE INDEX `ticket_note_ticket_idx` ON `ticket_note` (`ticket_id`);
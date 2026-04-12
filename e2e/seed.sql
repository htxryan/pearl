CREATE DATABASE IF NOT EXISTS `sample_project`; USE `sample_project`; 
SET FOREIGN_KEY_CHECKS=0;
SET UNIQUE_CHECKS=0;
DROP TABLE IF EXISTS `child_counters`;
CREATE TABLE `child_counters` (
  `parent_id` varchar(255) NOT NULL,
  `last_child` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`parent_id`),
  CONSTRAINT `fk_counter_parent` FOREIGN KEY (`parent_id`) REFERENCES `issues` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
DROP TABLE IF EXISTS `comments`;
CREATE TABLE `comments` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `issue_id` varchar(255) NOT NULL,
  `author` varchar(255) NOT NULL,
  `text` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_comments_created_at` (`created_at`),
  KEY `idx_comments_issue` (`issue_id`),
  CONSTRAINT `fk_comments_issue` FOREIGN KEY (`issue_id`) REFERENCES `issues` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
INSERT INTO `comments` (`id`,`issue_id`,`author`,`text`,`created_at`) VALUES ('019d7e37-8b93-718e-8ad0-22da1497697b','sample-project-6rs','Ryan Henderson','Reproduced: submitting with empty email throws TypeError at auth.validate(). Need null check.','2026-04-11 20:24:23'), ('019d7e37-94ca-7259-8521-f2aac306ca51','sample-project-6rs','Ryan Henderson','Fix is simple - add early return if email is empty. PR incoming.','2026-04-11 20:24:25'), ('019d7e37-9efb-74d2-a950-b5678d2a3584','sample-project-oqb','Ryan Henderson','Initial research: SSE is simpler but doesn\'t support binary data. WebSocket has better browser support than expected.','2026-04-11 20:24:28');
DROP TABLE IF EXISTS `compaction_snapshots`;
CREATE TABLE `compaction_snapshots` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `issue_id` varchar(255) NOT NULL,
  `compaction_level` int NOT NULL,
  `snapshot_json` blob NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_comp_snap_issue` (`issue_id`,`compaction_level`,`created_at`),
  CONSTRAINT `fk_comp_snap_issue` FOREIGN KEY (`issue_id`) REFERENCES `issues` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
DROP TABLE IF EXISTS `config`;
CREATE TABLE `config` (
  `key` varchar(255) NOT NULL,
  `value` text NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
INSERT INTO `config` (`key`,`value`) VALUES ('auto_compact_enabled','false'), ('compact_batch_size','50'), ('compact_parallel_workers','5'), ('compact_tier1_days','30'), ('compact_tier1_dep_levels','2'), ('compact_tier2_commits','100'), ('compact_tier2_days','90'), ('compact_tier2_dep_levels','5'), ('compaction_enabled','false'), ('issue_prefix','sample-project');
DROP TABLE IF EXISTS `dependencies`;
CREATE TABLE `dependencies` (
  `issue_id` varchar(255) NOT NULL,
  `depends_on_id` varchar(255) NOT NULL,
  `type` varchar(32) NOT NULL DEFAULT 'blocks',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(255) NOT NULL,
  `metadata` json DEFAULT (json_object()),
  `thread_id` varchar(255) DEFAULT '',
  PRIMARY KEY (`issue_id`,`depends_on_id`),
  KEY `idx_dependencies_depends_on` (`depends_on_id`),
  KEY `idx_dependencies_depends_on_type` (`depends_on_id`,`type`),
  KEY `idx_dependencies_issue` (`issue_id`),
  KEY `idx_dependencies_thread` (`thread_id`),
  CONSTRAINT `fk_dep_issue` FOREIGN KEY (`issue_id`) REFERENCES `issues` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
INSERT INTO `dependencies` (`issue_id`,`depends_on_id`,`type`,`created_at`,`created_by`,`metadata`,`thread_id`) VALUES ('sample-project-0gd','sample-project-6kq','parent-child','2026-04-11 15:23:10','Ryan Henderson','{}',''), ('sample-project-0gd','sample-project-elb','parent-child','2026-04-11 15:23:06','Ryan Henderson','{}',''), ('sample-project-0gd','sample-project-v0r','parent-child','2026-04-11 15:23:15','Ryan Henderson','{}',''), ('sample-project-0gd','sample-project-z4g','parent-child','2026-04-11 15:23:12','Ryan Henderson','{}',''), ('sample-project-3gr','sample-project-uo7','blocks','2026-04-11 15:23:46','Ryan Henderson','{}',''), ('sample-project-6kq','sample-project-elb','blocks','2026-04-11 15:23:34','Ryan Henderson','{}',''), ('sample-project-9o3','sample-project-dzp','parent-child','2026-04-11 15:23:26','Ryan Henderson','{}',''), ('sample-project-9o3','sample-project-gqu','parent-child','2026-04-11 15:23:32','Ryan Henderson','{}',''), ('sample-project-9o3','sample-project-xwm','parent-child','2026-04-11 15:23:29','Ryan Henderson','{}',''), ('sample-project-gqu','sample-project-dzp','blocks','2026-04-11 15:23:52','Ryan Henderson','{}',''), ('sample-project-irr','sample-project-3gr','parent-child','2026-04-11 15:23:24','Ryan Henderson','{}',''), ('sample-project-irr','sample-project-lcg','parent-child','2026-04-11 15:23:18','Ryan Henderson','{}',''), ('sample-project-irr','sample-project-uo7','parent-child','2026-04-11 15:23:20','Ryan Henderson','{}',''), ('sample-project-uo7','sample-project-lcg','blocks','2026-04-11 15:23:43','Ryan Henderson','{}',''), ('sample-project-v0r','sample-project-6kq','blocks','2026-04-11 15:23:41','Ryan Henderson','{}',''), ('sample-project-xwm','sample-project-dzp','blocks','2026-04-11 15:23:49','Ryan Henderson','{}',''), ('sample-project-z4g','sample-project-6kq','blocks','2026-04-11 15:23:38','Ryan Henderson','{}','');
DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `issue_id` varchar(255) NOT NULL,
  `event_type` varchar(32) NOT NULL,
  `actor` varchar(255) NOT NULL,
  `old_value` text,
  `new_value` text,
  `comment` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_events_created_at` (`created_at`),
  KEY `idx_events_issue` (`issue_id`),
  CONSTRAINT `fk_events_issue` FOREIGN KEY (`issue_id`) REFERENCES `issues` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
INSERT INTO `events` (`id`,`issue_id`,`event_type`,`actor`,`old_value`,`new_value`,`comment`,`created_at`) VALUES ('0bc9fdd0-24d7-4632-9fd3-68c0dcb307b6','sample-project-oqb','created','Ryan Henderson','','',NULL,'2026-04-11 15:22:48'), ('0d377153-e39e-47ef-9d95-fbff82eef527','sample-project-6rs','label_added','Ryan Henderson',NULL,NULL,'Added label: frontend','2026-04-11 15:24:05'), ('15ecf92a-a424-4d16-8a55-eadcefa4656c','sample-project-6kq','created','Ryan Henderson','','',NULL,'2026-04-11 15:22:10'), ('1bafd57b-20f6-4096-b5d4-1f3341a04d43','sample-project-elb','closed','Ryan Henderson','','OAuth2 integration complete with Google and GitHub providers',NULL,'2026-04-11 15:24:02'), ('2dc7aafc-35ae-4621-99eb-292f8eb390f4','sample-project-uo7','created','Ryan Henderson','','',NULL,'2026-04-11 15:22:22'), ('302f8077-9642-4eea-9eec-3bace60735b1','sample-project-vfl','created','Ryan Henderson','','',NULL,'2026-04-11 15:22:39'), ('30c88d6a-99ec-4666-93ef-a003c87ec45e','sample-project-3gr','created','Ryan Henderson','','',NULL,'2026-04-11 15:22:25'), ('39fde310-3ea1-4c4c-8806-3f5aba6837ba','sample-project-9o3','created','Ryan Henderson','','',NULL,'2026-04-11 15:21:48'), ('402322f7-e7cc-4719-9fd0-f717b74a522c','sample-project-0gd','created','Ryan Henderson','','',NULL,'2026-04-11 15:21:38'), ('52a33550-3032-4eff-9144-e1ece15d6b6e','sample-project-xwm','created','Ryan Henderson','','',NULL,'2026-04-11 15:22:30'), ('589a57f7-af33-4266-8bd3-d2a8fc063c71','sample-project-elb','created','Ryan Henderson','','',NULL,'2026-04-11 15:22:07'), ('6a7313cd-3f32-4b3a-a156-714ebaa0a485','sample-project-7v4','created','Ryan Henderson','','',NULL,'2026-04-11 15:22:46'), ('7909353b-8d50-44bc-9d67-838345696aad','sample-project-z4g','created','Ryan Henderson','','',NULL,'2026-04-11 15:22:13'), ('9197199e-d5c0-49e5-820f-8e8bc30b7154','sample-project-6rs','created','Ryan Henderson','','',NULL,'2026-04-11 15:22:36'), ('93f71176-886f-4eba-8909-16c1fc070548','sample-project-lcg','claimed','Ryan Henderson','{\"id\":\"sample-project-lcg\",\"title\":\"Design dashboard layout\",\"description\":\"Create wireframes and component hierarchy for the analytics dashboard.\",\"status\":\"open\",\"priority\":2,\"issue_type\":\"task\",\"owner\":\"htxryan@gmail.com\",\"created_at\":\"2026-04-11T20:22:19Z\",\"created_by\":\"Ryan Henderson\",\"updated_at\":\"2026-04-11T20:22:19Z\"}','{\"assignee\":\"Ryan Henderson\",\"status\":\"in_progress\"}',NULL,'2026-04-11 15:24:00'), ('95c5cd46-3602-40fb-a47b-d4d43f462cef','sample-project-lcg','created','Ryan Henderson','','',NULL,'2026-04-11 15:22:19'), ('97e1e5c5-6c1c-4729-b63b-940fa2574d71','sample-project-vfl','label_added','Ryan Henderson',NULL,NULL,'Added label: frontend','2026-04-11 15:24:10'), ('a547124b-811e-4c37-8dc9-2f30334c99ab','sample-project-gqu','created','Ryan Henderson','','',NULL,'2026-04-11 15:22:33'), ('a88f98e4-18d3-46dd-99e0-818e65691d62','sample-project-oqb','label_added','Ryan Henderson',NULL,NULL,'Added label: research','2026-04-11 15:24:20'), ('adb6c47d-258f-4e7b-a58c-f759b98a0172','sample-project-v0r','created','Ryan Henderson','','',NULL,'2026-04-11 15:22:15'), ('afd7d61d-0bad-43b0-a943-9c1af840dab7','sample-project-b8n','created','Ryan Henderson','','',NULL,'2026-04-11 15:22:41'), ('b04ddc3a-4ae3-4b95-89d1-59f3be53f782','sample-project-irr','created','Ryan Henderson','','',NULL,'2026-04-11 15:21:45'), ('b81d9b89-82a9-421a-85d7-7d5c4d8f7acd','sample-project-b8n','label_added','Ryan Henderson',NULL,NULL,'Added label: backend','2026-04-11 15:24:13'), ('b91807fa-de7f-4605-bf42-e19ec544f2a2','sample-project-elb','claimed','Ryan Henderson','{\"id\":\"sample-project-elb\",\"title\":\"Set up OAuth2 provider integration\",\"description\":\"Integrate with Google and GitHub OAuth providers. Set up callback URLs and token exchange.\",\"status\":\"open\",\"priority\":1,\"issue_type\":\"task\",\"owner\":\"htxryan@gmail.com\",\"created_at\":\"2026-04-11T20:22:08Z\",\"created_by\":\"Ryan Henderson\",\"updated_at\":\"2026-04-11T20:22:08Z\"}','{\"assignee\":\"Ryan Henderson\",\"status\":\"in_progress\"}',NULL,'2026-04-11 15:23:55'), ('c0a7f8c1-5306-49b3-9ec8-e37ae3725472','sample-project-dzp','claimed','Ryan Henderson','{\"id\":\"sample-project-dzp\",\"title\":\"Implement token bucket algorithm\",\"description\":\"Core rate limiting logic using token bucket with configurable thresholds.\",\"status\":\"open\",\"priority\":1,\"issue_type\":\"task\",\"owner\":\"htxryan@gmail.com\",\"created_at\":\"2026-04-11T20:22:28Z\",\"created_by\":\"Ryan Henderson\",\"updated_at\":\"2026-04-11T20:22:28Z\"}','{\"assignee\":\"Ryan Henderson\",\"status\":\"in_progress\"}',NULL,'2026-04-11 15:23:58'), ('c45aa29c-5d99-4c5c-9766-a769cd761b16','sample-project-7v4','label_added','Ryan Henderson',NULL,NULL,'Added label: frontend','2026-04-11 15:24:15'), ('dc072dc7-b029-460e-ab5a-7fe47742406e','sample-project-7v4','label_added','Ryan Henderson',NULL,NULL,'Added label: ux','2026-04-11 15:24:17'), ('f5111bd2-9001-488c-bf2f-9391c13066c3','sample-project-dzp','created','Ryan Henderson','','',NULL,'2026-04-11 15:22:27'), ('ffbff0fb-46a7-4fcc-93bc-c9e878ad0522','sample-project-6rs','label_added','Ryan Henderson',NULL,NULL,'Added label: critical','2026-04-11 15:24:08');
DROP TABLE IF EXISTS `federation_peers`;
CREATE TABLE `federation_peers` (
  `name` varchar(255) NOT NULL,
  `remote_url` varchar(1024) NOT NULL,
  `username` varchar(255),
  `password_encrypted` blob,
  `sovereignty` varchar(8) DEFAULT '',
  `last_sync` datetime,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`name`),
  KEY `idx_federation_peers_sovereignty` (`sovereignty`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
DROP TABLE IF EXISTS `interactions`;
CREATE TABLE `interactions` (
  `id` varchar(32) NOT NULL,
  `kind` varchar(64) NOT NULL,
  `created_at` datetime NOT NULL,
  `actor` varchar(255),
  `issue_id` varchar(255),
  `model` varchar(255),
  `prompt` text,
  `response` text,
  `error` text,
  `tool_name` varchar(255),
  `exit_code` int,
  `parent_id` varchar(32),
  `label` varchar(64),
  `reason` text,
  `extra` json,
  PRIMARY KEY (`id`),
  KEY `idx_interactions_created_at` (`created_at`),
  KEY `idx_interactions_issue_id` (`issue_id`),
  KEY `idx_interactions_kind` (`kind`),
  KEY `idx_interactions_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
DROP TABLE IF EXISTS `issue_counter`;
CREATE TABLE `issue_counter` (
  `prefix` varchar(255) NOT NULL,
  `last_id` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`prefix`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
DROP TABLE IF EXISTS `issue_snapshots`;
CREATE TABLE `issue_snapshots` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `issue_id` varchar(255) NOT NULL,
  `snapshot_time` datetime NOT NULL,
  `compaction_level` int NOT NULL,
  `original_size` int NOT NULL,
  `compressed_size` int NOT NULL,
  `original_content` text NOT NULL,
  `archived_events` text,
  PRIMARY KEY (`id`),
  KEY `idx_snapshots_issue` (`issue_id`),
  KEY `idx_snapshots_level` (`compaction_level`),
  CONSTRAINT `fk_snapshots_issue` FOREIGN KEY (`issue_id`) REFERENCES `issues` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
DROP TABLE IF EXISTS `issues`;
CREATE TABLE `issues` (
  `id` varchar(255) NOT NULL,
  `content_hash` varchar(64),
  `title` varchar(500) NOT NULL,
  `description` text NOT NULL,
  `design` text NOT NULL,
  `acceptance_criteria` text NOT NULL,
  `notes` text NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'open',
  `priority` int NOT NULL DEFAULT '2',
  `issue_type` varchar(32) NOT NULL DEFAULT 'task',
  `assignee` varchar(255),
  `estimated_minutes` int,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(255) DEFAULT '',
  `owner` varchar(255) DEFAULT '',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `closed_at` datetime,
  `closed_by_session` varchar(255) DEFAULT '',
  `external_ref` varchar(255),
  `spec_id` varchar(1024),
  `compaction_level` int DEFAULT '0',
  `compacted_at` datetime,
  `compacted_at_commit` varchar(64),
  `original_size` int,
  `sender` varchar(255) DEFAULT '',
  `ephemeral` tinyint(1) DEFAULT '0',
  `wisp_type` varchar(32) DEFAULT '',
  `pinned` tinyint(1) DEFAULT '0',
  `is_template` tinyint(1) DEFAULT '0',
  `mol_type` varchar(32) DEFAULT '',
  `work_type` varchar(32) DEFAULT 'mutex',
  `source_system` varchar(255) DEFAULT '',
  `metadata` json DEFAULT (json_object()),
  `source_repo` varchar(512) DEFAULT '',
  `close_reason` text DEFAULT '',
  `event_kind` varchar(32) DEFAULT '',
  `actor` varchar(255) DEFAULT '',
  `target` varchar(255) DEFAULT '',
  `payload` text DEFAULT '',
  `await_type` varchar(32) DEFAULT '',
  `await_id` varchar(255) DEFAULT '',
  `timeout_ns` bigint DEFAULT '0',
  `waiters` text DEFAULT '',
  `hook_bead` varchar(255) DEFAULT '',
  `role_bead` varchar(255) DEFAULT '',
  `agent_state` varchar(32) DEFAULT '',
  `last_activity` datetime,
  `role_type` varchar(32) DEFAULT '',
  `rig` varchar(255) DEFAULT '',
  `due_at` datetime,
  `defer_until` datetime,
  `no_history` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_issues_assignee` (`assignee`),
  KEY `idx_issues_created_at` (`created_at`),
  KEY `idx_issues_external_ref` (`external_ref`),
  KEY `idx_issues_issue_type` (`issue_type`),
  KEY `idx_issues_priority` (`priority`),
  KEY `idx_issues_spec_id` (`spec_id`),
  KEY `idx_issues_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
INSERT INTO `issues` (`id`,`content_hash`,`title`,`description`,`design`,`acceptance_criteria`,`notes`,`status`,`priority`,`issue_type`,`assignee`,`estimated_minutes`,`created_at`,`created_by`,`owner`,`updated_at`,`closed_at`,`closed_by_session`,`external_ref`,`spec_id`,`compaction_level`,`compacted_at`,`compacted_at_commit`,`original_size`,`sender`,`ephemeral`,`wisp_type`,`pinned`,`is_template`,`mol_type`,`work_type`,`source_system`,`metadata`,`source_repo`,`close_reason`,`event_kind`,`actor`,`target`,`payload`,`await_type`,`await_id`,`timeout_ns`,`waiters`,`hook_bead`,`role_bead`,`agent_state`,`last_activity`,`role_type`,`rig`,`due_at`,`defer_until`,`no_history`) VALUES ('sample-project-0gd','815cb8d7e37a625655ea8b88487895cbbeefbf165f0f2378262d14b175978b2b','User Authentication System','Implement complete user authentication with OAuth, session management, and role-based access control.','','','','open',1,'epic',NULL,NULL,'2026-04-11 20:21:38','Ryan Henderson','htxryan@gmail.com','2026-04-11 20:21:38',NULL,'',NULL,'',0,NULL,NULL,NULL,'',0,'',0,0,'','','','{}','','','','','','','','',0,'','','','',NULL,'','',NULL,NULL,0), ('sample-project-3gr','b857b47eb960850bb1576e9f359dd7735dbae38bcc0774af7400e5f9ed2f171c','Add data export feature','Allow users to export dashboard data as CSV or PDF.','','','','open',3,'task',NULL,NULL,'2026-04-11 20:22:25','Ryan Henderson','htxryan@gmail.com','2026-04-11 20:22:25',NULL,'',NULL,'',0,NULL,NULL,NULL,'',0,'',0,0,'','','','{}','','','','','','','','',0,'','','','',NULL,'','',NULL,NULL,0), ('sample-project-6kq','054f71a8a36d7425f07372c80e1196ccb9d60ac347c336faa518c3c20eb8b2f1','Implement session management','Create session store, JWT tokens, and refresh token rotation.','','','','open',1,'task',NULL,NULL,'2026-04-11 20:22:10','Ryan Henderson','htxryan@gmail.com','2026-04-11 20:22:10',NULL,'',NULL,'',0,NULL,NULL,NULL,'',0,'',0,0,'','','','{}','','','','','','','','',0,'','','','',NULL,'','',NULL,NULL,0), ('sample-project-6rs','226e96d43179aeeaa06cd4d2214475c962bce87347081884504c6175d7e07d11','Login form crashes on empty email','The login form throws an unhandled exception when submitting with an empty email field. Stack trace in console.','','','','open',0,'bug',NULL,NULL,'2026-04-11 20:22:36','Ryan Henderson','htxryan@gmail.com','2026-04-11 20:22:36',NULL,'',NULL,'',0,NULL,NULL,NULL,'',0,'',0,0,'','','','{}','','','','','','','','',0,'','','','',NULL,'','',NULL,NULL,0), ('sample-project-7v4','d8209203b57335d60af238d9739c558a921372ccb0c640050c0b4bbf3e4735d0','Dark mode support','Add dark mode toggle with system preference detection and manual override.','','','','open',3,'feature',NULL,NULL,'2026-04-11 20:22:46','Ryan Henderson','htxryan@gmail.com','2026-04-11 20:22:46',NULL,'',NULL,'',0,NULL,NULL,NULL,'',0,'',0,0,'','','','{}','','','','','','','','',0,'','','','',NULL,'','',NULL,NULL,0), ('sample-project-9o3','32c31163a41b73f7af8c2c188f9c3e8ec0d23973ea156517da529f921a826535','API Rate Limiting','Implement rate limiting middleware to protect API endpoints from abuse.','','','','open',1,'epic',NULL,NULL,'2026-04-11 20:21:48','Ryan Henderson','htxryan@gmail.com','2026-04-11 20:21:48',NULL,'',NULL,'',0,NULL,NULL,NULL,'',0,'',0,0,'','','','{}','','','','','','','','',0,'','','','',NULL,'','',NULL,NULL,0), ('sample-project-b8n','8ae3d087cfc80a4879f97e6cf34ee5bee73b909babd452d6e6fdfda187186f23','Rate limiter doesn\'t reset after window expires','Token bucket not replenishing after the rate window passes. Users stay rate-limited permanently.','','','','open',1,'bug',NULL,NULL,'2026-04-11 20:22:42','Ryan Henderson','htxryan@gmail.com','2026-04-11 20:22:42',NULL,'',NULL,'',0,NULL,NULL,NULL,'',0,'',0,0,'','','','{}','','','','','','','','',0,'','','','',NULL,'','',NULL,NULL,0), ('sample-project-dzp','28a9f3223f6c998021d5416a9523dc41c79d555a7821406c6df1ac2348d6e141','Implement token bucket algorithm','Core rate limiting logic using token bucket with configurable thresholds.','','','','in_progress',1,'task','Ryan Henderson',NULL,'2026-04-11 20:22:28','Ryan Henderson','htxryan@gmail.com','2026-04-11 20:23:58',NULL,'',NULL,'',0,NULL,NULL,NULL,'',0,'',0,0,'','','','{}','','','','','','','','',0,'','','','',NULL,'','',NULL,NULL,0), ('sample-project-elb','aa9ecf30f2435140cfdc5a59e08afb9b82ebd47a57261ce28a0cb1a0144a8291','Set up OAuth2 provider integration','Integrate with Google and GitHub OAuth providers. Set up callback URLs and token exchange.','','','','closed',1,'task','Ryan Henderson',NULL,'2026-04-11 20:22:08','Ryan Henderson','htxryan@gmail.com','2026-04-11 20:24:03','2026-04-11 20:24:03','',NULL,'',0,NULL,NULL,NULL,'',0,'',0,0,'','','','{}','','OAuth2 integration complete with Google and GitHub providers','','','','','','',0,'','','','',NULL,'','',NULL,NULL,0), ('sample-project-gqu','59f7a89720690a0b6f034e350bbb36340f4fb1b7b0ba03aaa7992c963f679670','Create rate limit response headers','Add X-RateLimit-Limit, X-RateLimit-Remaining, and Retry-After headers.','','','','open',3,'task',NULL,NULL,'2026-04-11 20:22:33','Ryan Henderson','htxryan@gmail.com','2026-04-11 20:22:33',NULL,'',NULL,'',0,NULL,NULL,NULL,'',0,'',0,0,'','','','{}','','','','','','','','',0,'','','','',NULL,'','',NULL,NULL,0), ('sample-project-irr','cbe617dd130e8d2974d4a3268af66d63e4a6d0b713cc312f0fd87b63c15adb59','Dashboard Analytics','Build real-time analytics dashboard with charts, KPIs, and data export.','','','','open',2,'epic',NULL,NULL,'2026-04-11 20:21:46','Ryan Henderson','htxryan@gmail.com','2026-04-11 20:21:46',NULL,'',NULL,'',0,NULL,NULL,NULL,'',0,'',0,0,'','','','{}','','','','','','','','',0,'','','','',NULL,'','',NULL,NULL,0), ('sample-project-lcg','03021a6192e25ecbc33cc6166f36d5f4260bd743265738ca80290ab6300dc1f0','Design dashboard layout','Create wireframes and component hierarchy for the analytics dashboard.','','','','in_progress',2,'task','Ryan Henderson',NULL,'2026-04-11 20:22:19','Ryan Henderson','htxryan@gmail.com','2026-04-11 20:24:00',NULL,'',NULL,'',0,NULL,NULL,NULL,'',0,'',0,0,'','','','{}','','','','','','','','',0,'','','','',NULL,'','',NULL,NULL,0), ('sample-project-oqb','772b995a2b27af8feb33c6cc8f77708740cfced23f484f9b718ec136db2fd88a','Evaluate WebSocket vs SSE for real-time updates','Compare WebSocket and Server-Sent Events for pushing real-time analytics updates. Consider connection overhead, browser support, and proxy compatibility.','','','','open',2,'spike',NULL,NULL,'2026-04-11 20:22:49','Ryan Henderson','htxryan@gmail.com','2026-04-11 20:22:49',NULL,'',NULL,'',0,NULL,NULL,NULL,'',0,'',0,0,'','','','{}','','','','','','','','',0,'','','','',NULL,'','',NULL,NULL,0), ('sample-project-uo7','865ab94b06b858990b47398bc560df0c1c7c2a5d5c3788530c40c7c85995eaa2','Implement chart components','Build reusable chart components using D3 or Recharts for line, bar, and pie charts.','','','','open',2,'task',NULL,NULL,'2026-04-11 20:22:22','Ryan Henderson','htxryan@gmail.com','2026-04-11 20:22:22',NULL,'',NULL,'',0,NULL,NULL,NULL,'',0,'',0,0,'','','','{}','','','','','','','','',0,'','','','',NULL,'','',NULL,NULL,0), ('sample-project-v0r','5892587e7a9b37badf1a604ca1e651f5466608221c40b26110ae7deb2723e297','Add role-based access control','Implement RBAC with admin, editor, and viewer roles.','','','','open',2,'task',NULL,NULL,'2026-04-11 20:22:16','Ryan Henderson','htxryan@gmail.com','2026-04-11 20:22:16',NULL,'',NULL,'',0,NULL,NULL,NULL,'',0,'',0,0,'','','','{}','','','','','','','','',0,'','','','',NULL,'','',NULL,NULL,0), ('sample-project-vfl','bfbd35cd17099b0336423f789a6d8265b6fdda3a9818d86a247078ed748719c3','Dashboard charts flicker on data refresh','Charts briefly show loading state during 2s polling refresh even when data hasn\'t changed.','','','','open',2,'bug',NULL,NULL,'2026-04-11 20:22:39','Ryan Henderson','htxryan@gmail.com','2026-04-11 20:22:39',NULL,'',NULL,'',0,NULL,NULL,NULL,'',0,'',0,0,'','','','{}','','','','','','','','',0,'','','','',NULL,'','',NULL,NULL,0), ('sample-project-xwm','ac19ca25d5834857d1cefe5d5ef41417327dbf7de465a2ed660a77af155ca997','Add Redis-backed rate store','Persist rate limit counters in Redis for distributed deployment.','','','','open',1,'task',NULL,NULL,'2026-04-11 20:22:30','Ryan Henderson','htxryan@gmail.com','2026-04-11 20:22:30',NULL,'',NULL,'',0,NULL,NULL,NULL,'',0,'',0,0,'','','','{}','','','','','','','','',0,'','','','',NULL,'','',NULL,NULL,0), ('sample-project-z4g','54a660fb3a2d32c98cbe9a26f5d70b02719c901bfd758c1c5f413efbb310adc3','Build login/signup UI','Create login form, signup flow, password reset, and social login buttons.','','','','open',2,'task',NULL,NULL,'2026-04-11 20:22:13','Ryan Henderson','htxryan@gmail.com','2026-04-11 20:22:13',NULL,'',NULL,'',0,NULL,NULL,NULL,'',0,'',0,0,'','','','{}','','','','','','','','',0,'','','','',NULL,'','',NULL,NULL,0);
DROP TABLE IF EXISTS `labels`;
CREATE TABLE `labels` (
  `issue_id` varchar(255) NOT NULL,
  `label` varchar(255) NOT NULL,
  PRIMARY KEY (`issue_id`,`label`),
  KEY `idx_labels_label` (`label`),
  CONSTRAINT `fk_labels_issue` FOREIGN KEY (`issue_id`) REFERENCES `issues` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
INSERT INTO `labels` (`issue_id`,`label`) VALUES ('sample-project-6rs','critical'), ('sample-project-6rs','frontend'), ('sample-project-7v4','frontend'), ('sample-project-7v4','ux'), ('sample-project-b8n','backend'), ('sample-project-oqb','research'), ('sample-project-vfl','frontend');
DROP TABLE IF EXISTS `metadata`;
CREATE TABLE `metadata` (
  `key` varchar(255) NOT NULL,
  `value` text NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
INSERT INTO `metadata` (`key`,`value`) VALUES ('_project_id','e82b7dc4-8dae-4bad-bfde-eb23a8166837'), ('bd_version','1.0.0'), ('clone_id','ae84dcca60c46c5e'), ('last_import_time','2026-04-11T15:21:30-05:00'), ('repo_id','ded34051f34fe9dfac2c0b71b7c7fe57'), ('tip_claude_setup_last_shown','2026-04-11T15:21:38-05:00');
DROP TABLE IF EXISTS `repo_mtimes`;
CREATE TABLE `repo_mtimes` (
  `repo_path` varchar(512) NOT NULL,
  `jsonl_path` varchar(512) NOT NULL,
  `mtime_ns` bigint NOT NULL,
  `last_checked` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`repo_path`),
  KEY `idx_repo_mtimes_checked` (`last_checked`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
DROP TABLE IF EXISTS `routes`;
CREATE TABLE `routes` (
  `prefix` varchar(32) NOT NULL,
  `path` varchar(512) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`prefix`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
DROP TABLE IF EXISTS `schema_migrations`;
CREATE TABLE `schema_migrations` (
  `version` int NOT NULL,
  `applied_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
INSERT INTO `schema_migrations` (`version`,`applied_at`) VALUES (1,'2026-04-11 15:21:30'), (2,'2026-04-11 15:21:30'), (3,'2026-04-11 15:21:30'), (4,'2026-04-11 15:21:30'), (5,'2026-04-11 15:21:30'), (6,'2026-04-11 15:21:30'), (7,'2026-04-11 15:21:30'), (8,'2026-04-11 15:21:30'), (9,'2026-04-11 15:21:30'), (10,'2026-04-11 15:21:30'), (11,'2026-04-11 15:21:30'), (12,'2026-04-11 15:21:30'), (13,'2026-04-11 15:21:30'), (14,'2026-04-11 15:21:30'), (15,'2026-04-11 15:21:30'), (16,'2026-04-11 15:21:30'), (17,'2026-04-11 15:21:30'), (18,'2026-04-11 15:21:30'), (19,'2026-04-11 15:21:30'), (20,'2026-04-11 15:21:30'), (21,'2026-04-11 15:21:30'), (22,'2026-04-11 15:21:30'), (23,'2026-04-11 15:21:30');
DROP TABLE IF EXISTS `wisp_comments`;
CREATE TABLE `wisp_comments` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `issue_id` varchar(255) NOT NULL,
  `author` varchar(255) DEFAULT '',
  `text` text NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wisp_comments_issue` (`issue_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
DROP TABLE IF EXISTS `wisp_dependencies`;
CREATE TABLE `wisp_dependencies` (
  `issue_id` varchar(255) NOT NULL,
  `depends_on_id` varchar(255) NOT NULL,
  `type` varchar(32) NOT NULL DEFAULT 'blocks',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(255) DEFAULT '',
  `metadata` json DEFAULT (json_object()),
  `thread_id` varchar(255) DEFAULT '',
  PRIMARY KEY (`issue_id`,`depends_on_id`),
  KEY `idx_wisp_dep_depends` (`depends_on_id`),
  KEY `idx_wisp_dep_type` (`type`),
  KEY `idx_wisp_dep_type_depends` (`type`,`depends_on_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
DROP TABLE IF EXISTS `wisp_events`;
CREATE TABLE `wisp_events` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `issue_id` varchar(255) NOT NULL,
  `event_type` varchar(32) NOT NULL,
  `actor` varchar(255) DEFAULT '',
  `old_value` text DEFAULT '',
  `new_value` text DEFAULT '',
  `comment` text DEFAULT '',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wisp_events_issue` (`issue_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
DROP TABLE IF EXISTS `wisp_labels`;
CREATE TABLE `wisp_labels` (
  `issue_id` varchar(255) NOT NULL,
  `label` varchar(255) NOT NULL,
  PRIMARY KEY (`issue_id`,`label`),
  KEY `idx_wisp_labels_label` (`label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
DROP TABLE IF EXISTS `wisps`;
CREATE TABLE `wisps` (
  `id` varchar(255) NOT NULL,
  `content_hash` varchar(64),
  `title` varchar(500) NOT NULL,
  `description` text NOT NULL DEFAULT '',
  `design` text NOT NULL DEFAULT '',
  `acceptance_criteria` text NOT NULL DEFAULT '',
  `notes` text NOT NULL DEFAULT '',
  `status` varchar(32) NOT NULL DEFAULT 'open',
  `priority` int NOT NULL DEFAULT '2',
  `issue_type` varchar(32) NOT NULL DEFAULT 'task',
  `assignee` varchar(255),
  `estimated_minutes` int,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(255) DEFAULT '',
  `owner` varchar(255) DEFAULT '',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `closed_at` datetime,
  `closed_by_session` varchar(255) DEFAULT '',
  `external_ref` varchar(255),
  `spec_id` varchar(1024),
  `compaction_level` int DEFAULT '0',
  `compacted_at` datetime,
  `compacted_at_commit` varchar(64),
  `original_size` int,
  `sender` varchar(255) DEFAULT '',
  `ephemeral` tinyint(1) DEFAULT '0',
  `wisp_type` varchar(32) DEFAULT '',
  `pinned` tinyint(1) DEFAULT '0',
  `is_template` tinyint(1) DEFAULT '0',
  `mol_type` varchar(32) DEFAULT '',
  `work_type` varchar(32) DEFAULT 'mutex',
  `source_system` varchar(255) DEFAULT '',
  `metadata` json DEFAULT (json_object()),
  `source_repo` varchar(512) DEFAULT '',
  `close_reason` text DEFAULT '',
  `event_kind` varchar(32) DEFAULT '',
  `actor` varchar(255) DEFAULT '',
  `target` varchar(255) DEFAULT '',
  `payload` text DEFAULT '',
  `await_type` varchar(32) DEFAULT '',
  `await_id` varchar(255) DEFAULT '',
  `timeout_ns` bigint DEFAULT '0',
  `waiters` text DEFAULT '',
  `hook_bead` varchar(255) DEFAULT '',
  `role_bead` varchar(255) DEFAULT '',
  `agent_state` varchar(32) DEFAULT '',
  `last_activity` datetime,
  `role_type` varchar(32) DEFAULT '',
  `rig` varchar(255) DEFAULT '',
  `due_at` datetime,
  `defer_until` datetime,
  `no_history` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_wisps_assignee` (`assignee`),
  KEY `idx_wisps_created_at` (`created_at`),
  KEY `idx_wisps_external_ref` (`external_ref`),
  KEY `idx_wisps_issue_type` (`issue_type`),
  KEY `idx_wisps_priority` (`priority`),
  KEY `idx_wisps_spec_id` (`spec_id`),
  KEY `idx_wisps_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin;
CREATE OR REPLACE VIEW blocked_issues AS
SELECT
    i.*,
    (SELECT COUNT(*)
     FROM dependencies d
     WHERE d.issue_id = i.id
       AND d.type = 'blocks'
       AND EXISTS (
         SELECT 1 FROM issues blocker
         WHERE blocker.id = d.depends_on_id
           AND blocker.status NOT IN ('closed', 'pinned')
       )
    ) as blocked_by_count
FROM issues i
WHERE i.status NOT IN ('closed', 'pinned')
  AND EXISTS (
    SELECT 1 FROM dependencies d
    WHERE d.issue_id = i.id
      AND d.type = 'blocks'
      AND EXISTS (
        SELECT 1 FROM issues blocker
        WHERE blocker.id = d.depends_on_id
          AND blocker.status NOT IN ('closed', 'pinned')
      )
  );
CREATE OR REPLACE VIEW ready_issues AS
WITH RECURSIVE
  blocked_directly AS (
    SELECT DISTINCT d.issue_id
    FROM dependencies d
    WHERE d.type = 'blocks'
      AND EXISTS (
        SELECT 1 FROM issues blocker
        WHERE blocker.id = d.depends_on_id
          AND blocker.status NOT IN ('closed', 'pinned')
      )
  ),
  blocked_transitively AS (
    SELECT issue_id, 0 as depth
    FROM blocked_directly
    UNION ALL
    SELECT d.issue_id, bt.depth + 1
    FROM blocked_transitively bt
    JOIN dependencies d ON d.depends_on_id = bt.issue_id
    WHERE d.type = 'parent-child'
      AND bt.depth < 50
  )
SELECT i.*
FROM issues i
LEFT JOIN blocked_transitively bt ON bt.issue_id = i.id
WHERE i.status = 'open'
  AND (i.ephemeral = 0 OR i.ephemeral IS NULL)
  AND bt.issue_id IS NULL
  AND (i.defer_until IS NULL OR i.defer_until <= NOW())
  AND NOT EXISTS (
    SELECT 1 FROM dependencies d_parent
    JOIN issues parent ON parent.id = d_parent.depends_on_id
    WHERE d_parent.issue_id = i.id
      AND d_parent.type = 'parent-child'
      AND parent.defer_until IS NOT NULL
      AND parent.defer_until > NOW()
  );

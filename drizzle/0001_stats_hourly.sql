ALTER TABLE "stats" ADD COLUMN "hour" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stats" DROP CONSTRAINT "stats_profile_id_day_pk";--> statement-breakpoint
ALTER TABLE "stats" ADD CONSTRAINT "stats_profile_id_day_hour_pk" PRIMARY KEY("profile_id","day","hour");

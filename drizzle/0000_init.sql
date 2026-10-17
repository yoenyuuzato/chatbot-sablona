CREATE TABLE "knowledge" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"title" text NOT NULL,
	"content_md" text DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"knowledge_id" integer NOT NULL,
	"profile_id" text NOT NULL,
	"title" text NOT NULL,
	"content_md" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"bot_name" text DEFAULT 'Asistent' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"tone" text DEFAULT '' NOT NULL,
	"system_prompt" text DEFAULT '' NOT NULL,
	"welcome" jsonb NOT NULL,
	"suggested_questions" jsonb NOT NULL,
	"colors" jsonb NOT NULL,
	"contact" jsonb NOT NULL,
	"logo" text DEFAULT '' NOT NULL,
	"voice" text DEFAULT '' NOT NULL,
	"allowed_origins" text[] DEFAULT '{}' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stats" (
	"profile_id" text NOT NULL,
	"day" date NOT NULL,
	"conversations" integer DEFAULT 0 NOT NULL,
	"messages" integer DEFAULT 0 NOT NULL,
	"errors" integer DEFAULT 0 NOT NULL,
	"busy" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "stats_profile_id_day_pk" PRIMARY KEY("profile_id","day")
);
--> statement-breakpoint
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "knowledge_history" ADD CONSTRAINT "knowledge_history_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "knowledge_profile_idx" ON "knowledge" USING btree ("profile_id","sort");--> statement-breakpoint
CREATE INDEX "knowledge_history_profile_idx" ON "knowledge_history" USING btree ("profile_id","knowledge_id","created_at");
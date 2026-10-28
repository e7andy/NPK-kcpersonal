ALTER TABLE "shifts" DROP CONSTRAINT "shifts_type_valid";--> statement-breakpoint
-- Supervision hours are now förtroendetid ("trust"), outside normal time.
UPDATE "shifts" SET "type" = 'trust' WHERE "type" = 'supervision';--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_type_valid" CHECK ("shifts"."type" in ('regular', 'trust'));

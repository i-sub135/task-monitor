-- CreateEnum
CREATE TYPE "task_platform" AS ENUM ('api', 'mobile', 'ai-chat', 'other');

-- AlterEnum
ALTER TYPE "task_edit_field" ADD VALUE 'platform';

-- AlterTable
ALTER TABLE "task" ADD COLUMN "platform" "task_platform" NOT NULL DEFAULT 'other';

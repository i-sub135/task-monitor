-- CreateEnum
CREATE TYPE "task_type" AS ENUM ('bug', 'feature');

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('request', 'queue', 'in-progress', 'ready-to-test', 'done', 'rejected');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('marketing', 'developer', 'admin');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'non-active');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "task_type" NOT NULL,
    "status" "task_status" NOT NULL DEFAULT 'request',
    "ordering" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_history" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "status_before" "task_status",
    "status_after" "task_status" NOT NULL,
    "note" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_attachment" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "task_status_ordering_idx" ON "task"("status", "ordering");

-- CreateIndex
CREATE INDEX "task_history_task_id_idx" ON "task_history"("task_id");

-- CreateIndex
CREATE INDEX "task_attachment_task_id_idx" ON "task_attachment"("task_id");

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_history" ADD CONSTRAINT "task_history_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_history" ADD CONSTRAINT "task_history_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attachment" ADD CONSTRAINT "task_attachment_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attachment" ADD CONSTRAINT "task_attachment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


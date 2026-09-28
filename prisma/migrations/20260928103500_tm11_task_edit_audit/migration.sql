-- CreateEnum
CREATE TYPE "task_edit_field" AS ENUM ('title', 'description');

-- CreateTable
CREATE TABLE "task_edit" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "field" "task_edit_field" NOT NULL,
    "old_value" TEXT NOT NULL,
    "new_value" TEXT NOT NULL,
    "edited_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_edit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_edit_task_id_idx" ON "task_edit"("task_id");

-- AddForeignKey
ALTER TABLE "task_edit" ADD CONSTRAINT "task_edit_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_edit" ADD CONSTRAINT "task_edit_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

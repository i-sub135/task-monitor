-- TM-23: komentar di task + jejak edit-nya. Hapus komentar = hard delete, jejak edit ikut kebuang (CASCADE).

-- CreateTable
CREATE TABLE "task_comment" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_comment_edit" (
    "id" UUID NOT NULL,
    "comment_id" UUID NOT NULL,
    "old_body" TEXT NOT NULL,
    "new_body" TEXT NOT NULL,
    "edited_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_comment_edit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_comment_task_id_idx" ON "task_comment"("task_id");

-- CreateIndex
CREATE INDEX "task_comment_edit_comment_id_idx" ON "task_comment_edit"("comment_id");

-- AddForeignKey
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comment_edit" ADD CONSTRAINT "task_comment_edit_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "task_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comment_edit" ADD CONSTRAINT "task_comment_edit_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- TM-22: lampiran yang dihapus dari detail cuma diumpetin. File-nya tetep di storage, baris ini tetep ada
-- (link di Edit history tetep jalan). deleted_at null = masih tampil di task.

-- AlterTable
ALTER TABLE "task_attachment" ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "deleted_by" UUID;

-- AddForeignKey
ALTER TABLE "task_attachment" ADD CONSTRAINT "task_attachment_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

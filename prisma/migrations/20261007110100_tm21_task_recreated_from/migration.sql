-- TM-21: task hasil recreate nunjuk ke task Rejected asalnya. Unik = satu task cuma bisa di-recreate sekali.

-- AlterTable
ALTER TABLE "task" ADD COLUMN "recreated_from" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "task_recreated_from_key" ON "task"("recreated_from");

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_recreated_from_fkey" FOREIGN KEY ("recreated_from") REFERENCES "task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

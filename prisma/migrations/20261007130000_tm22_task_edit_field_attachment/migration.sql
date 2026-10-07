-- TM-22: jejak tambah / umpetin lampiran di edit history (enum ditambah di migration sendiri, terpisah dari pemakaiannya).
ALTER TYPE "task_edit_field" ADD VALUE 'attachment_add';
ALTER TYPE "task_edit_field" ADD VALUE 'attachment_remove';

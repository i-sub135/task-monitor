-- TM-21: jejak recreate di edit history (enum ditambah di migration sendiri, terpisah dari pemakaiannya).
ALTER TYPE "task_edit_field" ADD VALUE 'recreate';

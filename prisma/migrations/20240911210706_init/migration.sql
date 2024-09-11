-- CreateTable
CREATE TABLE "chopinLiszt" (
    "id_number" INTEGER NOT NULL,
    "checklist_item" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL,

    CONSTRAINT "chopinLiszt_pkey" PRIMARY KEY ("id_number")
);

-- CreateIndex
CREATE UNIQUE INDEX "chopinLiszt_checklist_item_key" ON "chopinLiszt"("checklist_item");

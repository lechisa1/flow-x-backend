-- AlterTable
ALTER TABLE "resource_access_logs" ADD COLUMN     "ip_address" VARCHAR(45),
ADD COLUMN     "user_agent" TEXT;

-- AlterTable
ALTER TABLE "resource_categories" ADD COLUMN     "color" VARCHAR(7),
ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "icon" VARCHAR(50),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "parent_id" INTEGER,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "category_name" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "resources" ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rating_avg" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "rating_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "view_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "resource_tags" (
    "tag_id" SERIAL NOT NULL,
    "tag_name" VARCHAR(50) NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_tags_pkey" PRIMARY KEY ("tag_id")
);

-- CreateTable
CREATE TABLE "resource_tag_mapping" (
    "mapping_id" SERIAL NOT NULL,
    "resource_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "resource_tag_mapping_pkey" PRIMARY KEY ("mapping_id")
);

-- CreateTable
CREATE TABLE "resource_versions" (
    "version_id" SERIAL NOT NULL,
    "resource_id" INTEGER NOT NULL,
    "version_number" INTEGER NOT NULL,
    "file_id" INTEGER NOT NULL,
    "change_notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_versions_pkey" PRIMARY KEY ("version_id")
);

-- CreateTable
CREATE TABLE "resource_favorites" (
    "favorite_id" SERIAL NOT NULL,
    "resource_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_favorites_pkey" PRIMARY KEY ("favorite_id")
);

-- CreateTable
CREATE TABLE "resource_comments" (
    "comment_id" SERIAL NOT NULL,
    "resource_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "content" TEXT NOT NULL,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_comments_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "resource_reviews" (
    "review_id" SERIAL NOT NULL,
    "resource_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "rating" SMALLINT NOT NULL,
    "review_text" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_reviews_pkey" PRIMARY KEY ("review_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resource_tags_tag_name_key" ON "resource_tags"("tag_name");

-- CreateIndex
CREATE UNIQUE INDEX "resource_tag_mapping_resource_id_tag_id_key" ON "resource_tag_mapping"("resource_id", "tag_id");

-- CreateIndex
CREATE INDEX "resource_versions_resource_id_idx" ON "resource_versions"("resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_versions_resource_id_version_number_key" ON "resource_versions"("resource_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "resource_favorites_resource_id_user_id_key" ON "resource_favorites"("resource_id", "user_id");

-- CreateIndex
CREATE INDEX "resource_comments_resource_id_idx" ON "resource_comments"("resource_id");

-- CreateIndex
CREATE INDEX "resource_reviews_resource_id_idx" ON "resource_reviews"("resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_reviews_resource_id_user_id_key" ON "resource_reviews"("resource_id", "user_id");

-- CreateIndex
CREATE INDEX "resource_access_logs_resource_id_idx" ON "resource_access_logs"("resource_id");

-- CreateIndex
CREATE INDEX "resource_access_logs_user_id_idx" ON "resource_access_logs"("user_id");

-- CreateIndex
CREATE INDEX "resource_access_logs_accessed_at_idx" ON "resource_access_logs"("accessed_at");

-- CreateIndex
CREATE INDEX "resource_categories_parent_id_idx" ON "resource_categories"("parent_id");

-- CreateIndex
CREATE INDEX "resources_title_idx" ON "resources"("title");

-- CreateIndex
CREATE INDEX "resources_uploaded_by_user_id_idx" ON "resources"("uploaded_by_user_id");

-- CreateIndex
CREATE INDEX "resources_org_node_id_idx" ON "resources"("org_node_id");

-- CreateIndex
CREATE INDEX "resources_is_active_idx" ON "resources"("is_active");

-- AddForeignKey
ALTER TABLE "resource_categories" ADD CONSTRAINT "resource_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "resource_categories"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_tag_mapping" ADD CONSTRAINT "resource_tag_mapping_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("resource_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_tag_mapping" ADD CONSTRAINT "resource_tag_mapping_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "resource_tags"("tag_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_versions" ADD CONSTRAINT "resource_versions_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("resource_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_versions" ADD CONSTRAINT "resource_versions_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("file_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_versions" ADD CONSTRAINT "resource_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_favorites" ADD CONSTRAINT "resource_favorites_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("resource_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_favorites" ADD CONSTRAINT "resource_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_comments" ADD CONSTRAINT "resource_comments_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("resource_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_comments" ADD CONSTRAINT "resource_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_comments" ADD CONSTRAINT "resource_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "resource_comments"("comment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_reviews" ADD CONSTRAINT "resource_reviews_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("resource_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_reviews" ADD CONSTRAINT "resource_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

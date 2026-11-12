/*
  Warnings:

  - Made the column `konten` on table `berita` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `berita` MODIFY `konten` LONGTEXT NOT NULL;

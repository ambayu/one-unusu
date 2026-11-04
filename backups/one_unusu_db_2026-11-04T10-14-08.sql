-- MySQL dump 10.13  Distrib 8.0.30, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: one_unusu_db
-- ------------------------------------------------------
-- Server version	8.0.30

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('567ae2d3-ed72-4e4c-8d09-a44529a32894','69f9740fed136808b3a99fd838c5b41492b0c87851f6fee31e7989215f50c898','2026-10-27 17:19:32.196','20261027171932_add_sso_models',NULL,NULL,'2026-10-27 17:19:32.027',1),('b50eec6c-0142-4686-994b-a583ba437b18','e2fd790b6fea6089ea97e62eff102ed42698789e36a8d20a364f4d68582e3b36','2026-10-27 17:19:01.324','20261023101029_asd',NULL,NULL,'2026-10-27 17:19:01.180',1),('b89cc638-eeb4-4bdd-8e29-7ae6ed5b6de1','8f2cae5865d54347299e1e270fbb75efcb3fa09236dd5385d2ca542d792ddc18','2026-10-29 18:40:23.045','20261029184022_asd',NULL,NULL,'2026-10-29 18:40:22.802',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `banner_sliders`
--

DROP TABLE IF EXISTS `banner_sliders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `banner_sliders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `judul` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subjudul` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gambarUrl` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `linkUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `urutan` int NOT NULL DEFAULT '0',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `banner_sliders`
--

LOCK TABLES `banner_sliders` WRITE;
/*!40000 ALTER TABLE `banner_sliders` DISABLE KEYS */;
/*!40000 ALTER TABLE `banner_sliders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `berita`
--

DROP TABLE IF EXISTS `berita`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `berita` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `judul` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ringkasan` text COLLATE utf8mb4_unicode_ci,
  `konten` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `kategori` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pengumuman',
  `penulis` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT 'Humas UNUSU',
  `gambar` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `views` int NOT NULL DEFAULT '0',
  `publishedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `berita_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `berita`
--

LOCK TABLES `berita` WRITE;
/*!40000 ALTER TABLE `berita` DISABLE KEYS */;
/*!40000 ALTER TABLE `berita` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fakultas`
--

DROP TABLE IF EXISTS `fakultas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fakultas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kode` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dekan` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci,
  `visi` text COLLATE utf8mb4_unicode_ci,
  `misi` text COLLATE utf8mb4_unicode_ci,
  `icon` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT 'GraduationCap',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fakultas_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fakultas`
--

LOCK TABLES `fakultas` WRITE;
/*!40000 ALTER TABLE `fakultas` DISABLE KEYS */;
/*!40000 ALTER TABLE `fakultas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `layanan_kampus`
--

DROP TABLE IF EXISTS `layanan_kampus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `layanan_kampus` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kategori` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `urlTarget` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT 'ExternalLink',
  `isExternal` tinyint(1) NOT NULL DEFAULT '0',
  `urutan` int NOT NULL DEFAULT '0',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `layanan_kampus`
--

LOCK TABLES `layanan_kampus` WRITE;
/*!40000 ALTER TABLE `layanan_kampus` DISABLE KEYS */;
INSERT INTO `layanan_kampus` VALUES (1,'SIAKAD UNUSU','Akademik','Pengisian KRS, transkrip nilai, jadwal perkuliahan, dan riwayat status akademik mahasiswa.','https://siakad.unusu.ac.id','AcademicCapIcon',1,1,1,'2026-10-29 19:52:18.328','2026-10-29 19:52:46.329'),(2,'PMB UNUSU','Admisi','Pendaftaran mahasiswa baru, informasi jalur seleksi, dan pengumuman hasil penerimaan.','https://pmb.unusu.ac.id','UserIcon',1,2,1,'2026-10-29 19:52:18.332','2026-10-29 19:52:46.333');
/*!40000 ALTER TABLE `layanan_kampus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_key_key` (`key`),
  KEY `permissions_resource_idx` (`resource`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'dashboard:menu','dashboard','menu','Dashboard SSO · Akses Menu','2026-10-29 19:22:08.816'),(2,'dashboard:view','dashboard','view','Dashboard SSO · Lihat','2026-10-29 19:22:08.827'),(3,'profile:menu','profile','menu','Biodata Pengguna · Akses Menu','2026-10-29 19:22:08.831'),(4,'profile:view','profile','view','Biodata Pengguna · Lihat','2026-10-29 19:22:08.833'),(5,'profile:edit','profile','edit','Biodata Pengguna · Ubah','2026-10-29 19:22:08.835'),(6,'application:menu','application','menu','Registrasi SSO · Akses Menu','2026-10-29 19:22:08.838'),(7,'application:view','application','view','Registrasi SSO · Lihat','2026-10-29 19:22:08.840'),(8,'application:edit','application','edit','Registrasi SSO · Ubah','2026-10-29 19:22:08.842'),(9,'application:delete','application','delete','Registrasi SSO · Hapus','2026-10-29 19:22:08.844'),(10,'user:menu','user','menu','Manajemen Pengguna · Akses Menu','2026-10-29 19:22:08.848'),(11,'user:view','user','view','Manajemen Pengguna · Lihat','2026-10-29 19:22:08.851'),(12,'user:edit','user','edit','Manajemen Pengguna · Ubah','2026-10-29 19:22:08.853'),(13,'user:delete','user','delete','Manajemen Pengguna · Hapus','2026-10-29 19:22:08.856'),(14,'permission:menu','permission','menu','Izin · Akses Menu','2026-10-29 19:22:08.858'),(15,'permission:view','permission','view','Izin · Lihat','2026-10-29 19:22:08.860'),(16,'permission:edit','permission','edit','Izin · Ubah','2026-10-29 19:22:08.863'),(17,'role:menu','role','menu','Peran · Akses Menu','2026-10-29 19:22:08.866'),(18,'role:view','role','view','Peran · Lihat','2026-10-29 19:22:08.868'),(19,'role:edit','role','edit','Peran · Ubah','2026-10-29 19:22:08.871'),(20,'role:delete','role','delete','Peran · Hapus','2026-10-29 19:22:08.873'),(21,'directory:menu','directory','menu','Direktori Publik · Akses Menu','2026-10-29 19:22:08.875'),(22,'directory:view','directory','view','Direktori Publik · Lihat','2026-10-29 19:22:08.879'),(23,'directory:edit','directory','edit','Direktori Publik · Ubah','2026-10-29 19:22:08.883'),(24,'directory:delete','directory','delete','Direktori Publik · Hapus','2026-10-29 19:22:08.887');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `prodi`
--

DROP TABLE IF EXISTS `prodi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prodi` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `jenjang` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'S1',
  `akreditasi` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT 'Baik',
  `kaprodi` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci,
  `fakultasId` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `prodi_slug_key` (`slug`),
  KEY `prodi_fakultasId_fkey` (`fakultasId`),
  CONSTRAINT `prodi_fakultasId_fkey` FOREIGN KEY (`fakultasId`) REFERENCES `fakultas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `prodi`
--

LOCK TABLES `prodi` WRITE;
/*!40000 ALTER TABLE `prodi` DISABLE KEYS */;
/*!40000 ALTER TABLE `prodi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `roleId` int NOT NULL,
  `permissionId` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permissions_roleId_permissionId_key` (`roleId`,`permissionId`),
  KEY `role_permissions_permissionId_fkey` (`permissionId`),
  CONSTRAINT `role_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,1,9,'2026-10-29 19:22:08.896'),(2,1,8,'2026-10-29 19:22:08.896'),(3,1,6,'2026-10-29 19:22:08.896'),(4,1,7,'2026-10-29 19:22:08.896'),(5,1,1,'2026-10-29 19:22:08.896'),(6,1,2,'2026-10-29 19:22:08.896'),(7,1,24,'2026-10-29 19:22:08.896'),(8,1,23,'2026-10-29 19:22:08.896'),(9,1,21,'2026-10-29 19:22:08.896'),(10,1,22,'2026-10-29 19:22:08.896'),(11,1,16,'2026-10-29 19:22:08.896'),(12,1,14,'2026-10-29 19:22:08.896'),(13,1,15,'2026-10-29 19:22:08.896'),(14,1,5,'2026-10-29 19:22:08.896'),(15,1,3,'2026-10-29 19:22:08.896'),(16,1,4,'2026-10-29 19:22:08.896'),(17,1,20,'2026-10-29 19:22:08.896'),(18,1,19,'2026-10-29 19:22:08.896'),(19,1,17,'2026-10-29 19:22:08.896'),(20,1,18,'2026-10-29 19:22:08.896'),(21,1,13,'2026-10-29 19:22:08.896'),(22,1,12,'2026-10-29 19:22:08.896'),(23,1,10,'2026-10-29 19:22:08.896'),(24,1,11,'2026-10-29 19:22:08.896'),(25,2,1,'2026-10-29 19:22:08.909'),(26,2,2,'2026-10-29 19:22:08.909'),(27,2,3,'2026-10-29 19:22:08.909'),(28,2,4,'2026-10-29 19:22:08.909'),(29,2,5,'2026-10-29 19:22:08.909'),(30,2,6,'2026-10-29 19:22:08.909'),(31,2,7,'2026-10-29 19:22:08.909'),(32,3,1,'2026-10-29 19:22:08.919'),(33,3,2,'2026-10-29 19:22:08.919'),(34,3,3,'2026-10-29 19:22:08.919'),(35,3,4,'2026-10-29 19:22:08.919'),(36,3,5,'2026-10-29 19:22:08.919'),(37,3,6,'2026-10-29 19:22:08.919'),(38,3,7,'2026-10-29 19:22:08.919');
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `isSystem` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_code_key` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'SUPERADMIN','Super Administrator','Pemegang kendali penuh atas registry SSO, akun civitas, izin, dan peran.',1,'2026-10-29 19:22:08.892','2026-10-29 19:22:08.892'),(2,'DOSEN','Dosen','Akses dashboard, biodata pribadi, dan katalog aplikasi terintegrasi.',1,'2026-10-29 19:22:08.904','2026-10-29 19:22:08.904'),(3,'MAHASISWA','Mahasiswa','Akses dashboard, biodata pribadi, dan katalog aplikasi terintegrasi.',1,'2026-10-29 19:22:08.915','2026-10-29 19:22:08.915');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sso_apps`
--

DROP TABLE IF EXISTS `sso_apps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sso_apps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clientId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clientKey` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nameApp` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `icon` longtext COLLATE utf8mb4_unicode_ci,
  `badge` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT 'Akademik',
  `urlRedirect` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `targetRoles` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `order` int NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sso_apps_clientId_key` (`clientId`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sso_apps`
--

LOCK TABLES `sso_apps` WRITE;
/*!40000 ALTER TABLE `sso_apps` DISABLE KEYS */;
INSERT INTO `sso_apps` VALUES (2,'lppm-unusu','SiVKZL5dBZALjZx8ginFeaNL8vHTYasEJDVfbusPUSHSJ3zE','LPPM UNUSU','Portal Riset, Pengabdian Kepada Masyarakat, Publikasi Jurnal, dan Hibah Dosen.','FlaskConical','Penelitian','http://localhost:5178/sso/callback','[\"DOSEN\",\"SUPERADMIN\"]',1,2,'2026-10-27 17:19:33.278','2026-10-29 19:57:00.066'),(3,'lpm-unusu','Qd4npgRjFkJ5P7URr62iWJwapXSZ6bYzAaDfqK9RdPKVU7n8','LPM UNUSU','Lembaga Penjaminan Mutu, Audit Mutu Internal (AMI), & Instrumen Akreditasi.','Award','Penjaminan Mutu','http://localhost:5177/sso/callback','[\"DOSEN\",\"SUPERADMIN\"]',1,3,'2026-10-27 17:19:33.280','2026-10-29 19:57:00.063'),(4,'esurat-unusu','nrme567SPu3xJZF9fCoErNnweokdNpTg9X5h4doFwwAKzEmm','E-Surat UNUSU','Tata Naskah Dinas, Disposisi Digital, & Surat Keterangan Mahasiswa/Dosen.','MailCheck','Administrasi','http://localhost:5175/sso/callback','[\"DOSEN\",\"MAHASISWA\",\"SUPERADMIN\"]',1,4,'2026-10-27 17:19:33.282','2026-10-29 19:57:00.069'),(5,'sdm-sarpras-unusu','Mh9K5Ta3JGoWjm6UkCjxyEtPn3RNqALx9iXVZun2bSZbDPRc','SDM & Sarpras','Manajemen Kepegawaian, Fasilitas Kampus, & Inventaris Sarana Prasarana.','Building2','Kepegawaian','http://localhost:3003/sso/callback','[\"DOSEN\",\"SUPERADMIN\"]',1,5,'2026-10-27 17:19:33.283','2026-10-29 19:57:00.072'),(6,'unusu-lms','pMNfQMg4WPGj8q69kwiANLGe56326CzcsYaGgPEbV2neKeFu','LMS UNUSU','Portal pembelajaran dosen & mahasiswa: kelas, materi, tugas, dan penilaian.','GraduationCap','Pembelajaran','http://localhost:3001/sso/callback','[\"DOSEN\",\"MAHASISWA\",\"SUPERADMIN\"]',1,1,'2026-10-27 17:52:10.185','2026-10-29 19:57:00.059'),(7,'unusu-akreditasi','rFgCFFWArywRkdtE7YEFyJvikUuFt2hFhXQfUxbRuZ7BQNT9','Akreditasi UNUSU','Instrumen akreditasi, bukti dokumen, dan penilaian butir mutu program studi.','ClipboardCheck','Penjaminan Mutu','http://localhost:3002/sso/callback','[\"DOSEN\",\"SUPERADMIN\"]',1,6,'2026-10-27 17:52:10.187','2026-10-29 19:57:00.075');
/*!40000 ALTER TABLE `sso_apps` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sso_auth_tokens`
--

DROP TABLE IF EXISTS `sso_auth_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sso_auth_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` int NOT NULL,
  `clientId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `appId` int NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `isUsed` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sso_auth_tokens_token_key` (`token`),
  KEY `sso_auth_tokens_token_clientId_idx` (`token`,`clientId`),
  KEY `sso_auth_tokens_userId_fkey` (`userId`),
  KEY `sso_auth_tokens_appId_fkey` (`appId`),
  CONSTRAINT `sso_auth_tokens_appId_fkey` FOREIGN KEY (`appId`) REFERENCES `sso_apps` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `sso_auth_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sso_auth_tokens`
--

LOCK TABLES `sso_auth_tokens` WRITE;
/*!40000 ALTER TABLE `sso_auth_tokens` DISABLE KEYS */;
INSERT INTO `sso_auth_tokens` VALUES (58,'94b140e375426e2f6b5651923128f4ff4a911f2d5ed6226efc971ce6ce43c76a',1,'lppm-unusu',2,'2026-10-31 21:42:26.349',1,'2026-10-31 21:37:26.350'),(59,'9ed0491d48d08613556e39d348f15c75e5366253c79e56b92d2c6745c84d386d',1,'lppm-unusu',2,'2026-11-01 10:28:32.441',1,'2026-11-01 10:23:32.442'),(60,'0c9dc203ff17040ab429a14e3f94e89ce4491a2f55db48201d4fe2e8d066d694',1,'lpm-unusu',3,'2026-11-01 10:41:37.925',0,'2026-11-01 10:36:37.926'),(61,'5381a00e795b7d8ddeb3d3c0697fc87832f007290d3a55de1f0d3ba6497d1314',1,'lpm-unusu',3,'2026-11-01 10:41:37.934',1,'2026-11-01 10:36:37.935'),(62,'18a0ae9097a03ec2d82a4705ca42c155c0588cd011a9a70d4b8a74f6c85b044c',1,'lppm-unusu',2,'2026-11-01 10:41:57.783',0,'2026-11-01 10:36:57.784'),(63,'aa82384e328c5fa38a59fd90f3ace7f76f3fb0ed81b23642aa6120551ed38280',1,'lppm-unusu',2,'2026-11-01 10:41:57.790',1,'2026-11-01 10:36:57.791'),(64,'2ff2724ed3cde598c3bbc8a7a9f2c25e50c1a519dee44838d674fe065cc1170b',1,'esurat-unusu',4,'2026-11-01 11:20:28.863',0,'2026-11-01 11:15:28.865'),(65,'65e0e5a1b1fd00278da8fafd7a5cea2e9f84006ac54f3baf33f1f9a6ba06cdef',1,'esurat-unusu',4,'2026-11-01 11:20:28.871',1,'2026-11-01 11:15:28.872'),(66,'a8c6472ce0cd875701abbbb920674f915c76ffead81a882dfd6321686e8ec37a',1,'esurat-unusu',4,'2026-11-01 13:52:32.664',0,'2026-11-01 13:47:32.665'),(67,'b6a3938b93d263b8d4a359af0bd2f117adf87bc232c5ac121bd0313f4e211680',1,'esurat-unusu',4,'2026-11-01 13:52:32.672',1,'2026-11-01 13:47:32.673');
/*!40000 ALTER TABLE `sso_auth_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `noHp` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('SUPERADMIN','DOSEN','MAHASISWA') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MAHASISWA',
  `nim` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nidn` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fakultas` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `prodi` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `roleId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_key` (`username`),
  UNIQUE KEY `users_email_key` (`email`),
  KEY `users_roleId_fkey` (`roleId`),
  CONSTRAINT `users_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','$2b$10$Hz3Fv.1T67FEeJZyhOAyI.LLhrQQoweI6vkpMTvzc5ROngEcYgp0e','Super Administrator ONE UNUSU','admin@unusu.ac.id','081234567890','SUPERADMIN',NULL,NULL,'Rektorat UNUSU','Pusat Teknologi Informasi dan Komunikasi',NULL,1,'2026-10-27 17:19:33.252','2026-10-29 19:22:08.925',1),(2,'0102038901','$2b$10$xuKyUtXCl6QtPfFcSRqXwOIQyFb9Sn0A1.NyueafDxF6PFpfn0AEK','Dr. H. Muhammad Ilyas, M.Kom.','ilyas@unusu.ac.id','081398765432','DOSEN',NULL,'0102038901','Fakultas Sains dan Teknologi','S1 Sistem Informasi',NULL,1,'2026-10-27 17:19:33.271','2026-10-29 19:22:08.934',2),(3,'2201010045','$2b$10$xuKyUtXCl6QtPfFcSRqXwOIQyFb9Sn0A1.NyueafDxF6PFpfn0AEK','Siti Rahmah','siti.rahmah@mhs.unusu.ac.id','082165432109','MAHASISWA','2201010045',NULL,'Fakultas Sains dan Teknologi','S1 Sistem Informasi',NULL,1,'2026-10-27 17:19:33.273','2026-10-29 19:22:08.939',3);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'one_unusu_db'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-04 17:14:10

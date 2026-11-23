-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `givenName` VARCHAR(191) NULL,
    `surName` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `passportNumber` VARCHAR(191) NULL,
    `passportIssuingCountry` VARCHAR(191) NULL,
    `passportExpiryDate` DATETIME(3) NULL,
    `nationality` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `admin` BOOLEAN NOT NULL DEFAULT false,
    `role` ENUM('CUSTOMER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'ACCOUNTANT', 'RESERVATION') NOT NULL DEFAULT 'CUSTOMER',
    `passwordHash` VARCHAR(191) NOT NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_admin_role_idx`(`admin`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminUser` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('CUSTOMER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'ACCOUNTANT', 'RESERVATION') NOT NULL DEFAULT 'ADMIN',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdminUser_email_key`(`email`),
    INDEX `AdminUser_role_isActive_idx`(`role`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `tripType` VARCHAR(191) NULL,
    `bookingFlowKey` VARCHAR(191) NULL,
    `bookingOfferKey` VARCHAR(191) NULL,
    `reservationId` VARCHAR(191) NULL,
    `locator` VARCHAR(191) NULL,
    `status` ENUM('PREPARED', 'BOOKED', 'FAILED', 'CANCELLED', 'COMMITTED', 'TICKETED') NOT NULL DEFAULT 'PREPARED',
    `routeKey` VARCHAR(191) NOT NULL,
    `airlineCode` VARCHAR(191) NOT NULL,
    `travelDate` DATE NOT NULL,
    `flightSignature` VARCHAR(191) NOT NULL,
    `departureCode` VARCHAR(191) NULL,
    `arrivalCode` VARCHAR(191) NULL,
    `totalFare` DOUBLE NULL,
    `currencyCode` VARCHAR(191) NULL,
    `rawPreview` JSON NULL,
    `rawCommit` JSON NULL,
    `payloadSnapshot` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Booking_bookingFlowKey_key`(`bookingFlowKey`),
    UNIQUE INDEX `Booking_reservationId_key`(`reservationId`),
    INDEX `Booking_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `Booking_userId_status_createdAt_idx`(`userId`, `status`, `createdAt`),
    INDEX `Booking_userId_flightSignature_travelDate_airlineCode_idx`(`userId`, `flightSignature`, `travelDate`, `airlineCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingPassenger` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `paxType` VARCHAR(191) NOT NULL,
    `prefix` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `birthDate` DATE NULL,
    `passportNumber` VARCHAR(191) NULL,
    `passportIssuingCountry` VARCHAR(191) NULL,
    `passportExpiryDate` DATE NULL,
    `nationality` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BookingPassenger_bookingId_paxType_idx`(`bookingId`, `paxType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TravelBuddy` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `title` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `paxtype` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `nationality` VARCHAR(191) NULL,
    `dateOfBirth` DATE NULL,
    `passportNumber` VARCHAR(191) NULL,
    `passportExpiryDate` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TravelBuddy_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `TravelBuddy_userId_passportNumber_idx`(`userId`, `passportNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlogPost` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `tag` VARCHAR(191) NOT NULL DEFAULT 'Travel Tips',
    `excerpt` TEXT NULL,
    `content` LONGTEXT NULL,
    `imageUrl` VARCHAR(191) NULL,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `authorName` VARCHAR(191) NULL DEFAULT 'FlyJatt Team',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BlogPost_published_createdAt_idx`(`published`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteSettings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `section` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SiteSettings_section_idx`(`section`),
    UNIQUE INDEX `SiteSettings_section_key_key`(`section`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SearchLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `timestamp` DATETIME(3) NOT NULL,
    `mode` VARCHAR(191) NOT NULL,
    `userId` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL,
    `route` TEXT NOT NULL,
    `cabinClass` VARCHAR(191) NOT NULL,
    `segments` INTEGER NOT NULL,
    `ipHash` VARCHAR(191) NOT NULL,
    `browserFingerprint` VARCHAR(191) NOT NULL,
    `visitorId` VARCHAR(191) NULL,
    `count` INTEGER NULL,
    `limit` INTEGER NULL,
    `remaining` INTEGER NULL,
    `bookingCount` INTEGER NULL,
    `message` TEXT NULL,
    `importKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SearchLog_importKey_key`(`importKey`),
    INDEX `SearchLog_timestamp_idx`(`timestamp`),
    INDEX `SearchLog_status_timestamp_idx`(`status`, `timestamp`),
    INDEX `SearchLog_mode_timestamp_idx`(`mode`, `timestamp`),
    INDEX `SearchLog_userId_timestamp_idx`(`userId`, `timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `timestamp` DATETIME(3) NOT NULL,
    `outcome` VARCHAR(191) NOT NULL,
    `stage` VARCHAR(191) NULL,
    `status` INTEGER NULL,
    `message` TEXT NULL,
    `details` TEXT NULL,
    `reservationId` VARCHAR(191) NULL,
    `bookingFlowKey` VARCHAR(191) NULL,
    `bookingOfferKey` VARCHAR(191) NULL,
    `offerIdentifiers` JSON NULL,
    `warnings` JSON NULL,
    `commitRequested` BOOLEAN NOT NULL DEFAULT false,
    `commitOnlyRequested` BOOLEAN NOT NULL DEFAULT false,
    `importKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BookingLog_importKey_key`(`importKey`),
    INDEX `BookingLog_timestamp_idx`(`timestamp`),
    INDEX `BookingLog_outcome_timestamp_idx`(`outcome`, `timestamp`),
    INDEX `BookingLog_reservationId_timestamp_idx`(`reservationId`, `timestamp`),
    INDEX `BookingLog_stage_timestamp_idx`(`stage`, `timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AirlineMarkup` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `airlineCode` VARCHAR(191) NOT NULL,
    `airlineName` VARCHAR(191) NULL,
    `markupType` VARCHAR(191) NOT NULL DEFAULT 'PERCENTAGE',
    `markupValue` DOUBLE NOT NULL DEFAULT 0,
    `discountType` VARCHAR(191) NOT NULL DEFAULT 'PERCENTAGE',
    `discountValue` DOUBLE NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AirlineMarkup_airlineCode_key`(`airlineCode`),
    INDEX `AirlineMarkup_airlineCode_isActive_idx`(`airlineCode`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingPassenger` ADD CONSTRAINT `BookingPassenger_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TravelBuddy` ADD CONSTRAINT `TravelBuddy_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


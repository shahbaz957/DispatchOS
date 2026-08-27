-- CreateEnum
CREATE TYPE "public"."DriverStatus" AS ENUM ('OFFLINE', 'AVAILABLE', 'OFFERED', 'BUSY');

-- CreateTable
CREATE TABLE "public"."drivers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "public"."DriverStatus" NOT NULL DEFAULT 'OFFLINE',
    "last_lat" DOUBLE PRECISION,
    "last_lng" DOUBLE PRECISION,
    "last_seen_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

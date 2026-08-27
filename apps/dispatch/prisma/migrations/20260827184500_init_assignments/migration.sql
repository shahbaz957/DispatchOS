-- CreateEnum
CREATE TYPE "public"."AssignmentStatus" AS ENUM ('OFFERED', 'CONFIRMED', 'REJECTED', 'TIMEOUT', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "public"."assignments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "status" "public"."AssignmentStatus" NOT NULL DEFAULT 'OFFERED',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assignments_order_id_attempt_key" ON "public"."assignments"("order_id", "attempt");

-- CreateIndex
CREATE INDEX "assignments_order_id_idx" ON "public"."assignments"("order_id");

-- CreateIndex
CREATE INDEX "assignments_driver_id_idx" ON "public"."assignments"("driver_id");

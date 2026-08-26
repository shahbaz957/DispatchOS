-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('PENDING_DISPATCH', 'OFFERED', 'ASSIGNED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."orders" (
    "id" UUID NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "client_order_id" TEXT,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'PENDING_DISPATCH',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "assigned_driver_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_merchant_id_client_order_id_key" ON "public"."orders"("merchant_id", "client_order_id");

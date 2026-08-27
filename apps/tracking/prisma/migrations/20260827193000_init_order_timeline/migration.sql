-- CreateTable
CREATE TABLE "public"."order_timeline" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "driver_id" UUID,
    "payload" JSONB NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_timeline_order_id_event_id_key" ON "public"."order_timeline"("order_id", "event_id");

-- CreateIndex
CREATE INDEX "order_timeline_order_id_occurred_at_idx" ON "public"."order_timeline"("order_id", "occurred_at");

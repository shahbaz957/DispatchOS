-- Seed sample drivers for the simulation UI.
-- Run after driver migrations:
--   psql postgresql://driver:driver@localhost:5436/driver_db -f scripts/seed-drivers.sql

INSERT INTO drivers (
  id,
  name,
  status,
  last_lat,
  last_lng,
  last_seen_at,
  created_at,
  updated_at
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Ali Khan',
    'OFFLINE',
    24.8607,
    67.0011,
    NOW(),
    NOW(),
    NOW()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Sara Ahmed',
    'OFFLINE',
    24.8700,
    67.0100,
    NOW(),
    NOW(),
    NOW()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Bilal Raza',
    'OFFLINE',
    24.8550,
    66.9950,
    NOW(),
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

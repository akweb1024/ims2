-- Bring User.roles into line with User.role before anything starts reading it.
--
-- The roles[] column has been in the schema since the baseline migration but no code ever
-- read or wrote it, so every row still carries the `[EXECUTIVE]` column default regardless of
-- the user's actual role. Multi-role support unions role with roles[], and while a stale
-- array can never *remove* access, leaving it wrong would mean every user silently picked up
-- EXECUTIVE the moment the union went live.
--
-- Only rows whose primary role is missing from the array are touched, so this is idempotent
-- and leaves any deliberately-populated array alone.

UPDATE "User"
SET    roles = ARRAY[role]::"UserRole"[]
WHERE  NOT (role = ANY(roles));

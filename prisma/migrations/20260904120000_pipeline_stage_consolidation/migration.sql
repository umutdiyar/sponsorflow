-- Pipeline stage consolidation: 9 stages -> 6.
--
-- Additive + remap + deactivate-old. No PipelineStage rows are deleted and no
-- Opportunity is dropped. Safe to re-run (idempotent via ON CONFLICT / guards).
--
-- Canonical set (per organization):
--   researching    Araştırılıyor       OPEN   pos 0
--   contacted      İletişime Geçildi   OPEN   pos 1   (existing key reused)
--   in-discussion  Görüşülüyor         OPEN   pos 2
--   responded      Yanıt Alındı        OPEN   pos 3
--   positive       Olumlu              WON    pos 4
--   negative       Olumsuz             LOST   pos 5
--
-- Old key -> new key:
--   research, contact-found          -> researching
--   contacted                        -> contacted   (in place)
--   replied                          -> responded
--   meeting, proposal, negotiation   -> in-discussion
--   won                              -> positive
--   lost                             -> negative

-- 1. Ensure the six canonical stages exist for every organization.
DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM "Organization" LOOP
    INSERT INTO "PipelineStage"
      ("id", "organizationId", "name", "key", "position", "type", "isActive", "createdAt", "updatedAt")
    VALUES
      (gen_random_uuid()::text, org.id, 'Araştırılıyor',     'researching',   0, 'OPEN', true, now(), now()),
      (gen_random_uuid()::text, org.id, 'İletişime Geçildi',  'contacted',     1, 'OPEN', true, now(), now()),
      (gen_random_uuid()::text, org.id, 'Görüşülüyor',        'in-discussion', 2, 'OPEN', true, now(), now()),
      (gen_random_uuid()::text, org.id, 'Yanıt Alındı',       'responded',     3, 'OPEN', true, now(), now()),
      (gen_random_uuid()::text, org.id, 'Olumlu',             'positive',      4, 'WON',  true, now(), now()),
      (gen_random_uuid()::text, org.id, 'Olumsuz',            'negative',      5, 'LOST', true, now(), now())
    ON CONFLICT ("organizationId", "key") DO UPDATE SET
      "name"      = EXCLUDED."name",
      "position"  = EXCLUDED."position",
      "type"      = EXCLUDED."type",
      "isActive"  = true,
      "updatedAt" = now();
  END LOOP;
END $$;

-- 2. Repoint opportunities from every old stage to its canonical replacement.
WITH mapping ("old_key", "new_key") AS (
  VALUES
    ('research',      'researching'),
    ('contact-found', 'researching'),
    ('replied',       'responded'),
    ('meeting',       'in-discussion'),
    ('proposal',      'in-discussion'),
    ('negotiation',   'in-discussion'),
    ('won',           'positive'),
    ('lost',          'negative')
)
UPDATE "Opportunity" o
SET "stageId" = tgt."id",
    "updatedAt" = now()
FROM "PipelineStage" src
JOIN mapping m ON m."old_key" = src."key"
JOIN "PipelineStage" tgt
  ON tgt."organizationId" = src."organizationId"
 AND tgt."key" = m."new_key"
WHERE o."stageId" = src."id";

-- 3. Deactivate every stage that is not in the canonical set. Rows are kept so
--    FK references and history stay intact; the board filters on isActive.
UPDATE "PipelineStage"
SET "isActive" = false,
    "updatedAt" = now()
WHERE "key" NOT IN (
  'researching', 'contacted', 'in-discussion', 'responded', 'positive', 'negative'
)
AND "isActive" = true;

begin;

-- Deliberately do not backfill free text into structured arrays. A legacy value
-- may contain several skills, languages, licenses or qualifications with no
-- reliable boundary or priority. Treating it as one exact item is ambiguous.
-- Existing skills, languages, driver_license and license_requirement columns
-- remain unchanged and available to legacy readers and forms. New structured
-- arrays keep their defaults until explicitly supplied by the user.
-- Already supplied structured data is also left untouched.

commit;

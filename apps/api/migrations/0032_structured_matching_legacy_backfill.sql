begin;

-- Preserve every legacy value while giving the structured matcher useful data
-- for records created before the new form fields existed.
update candidate_profiles
set
  structured_skills = case
    when jsonb_array_length(coalesce(structured_skills, '[]'::jsonb)) = 0 and nullif(trim(skills), '') is not null
      then jsonb_build_array(jsonb_build_object('label', trim(skills), 'source', 'LEGACY_TEXT'))
    else structured_skills
  end,
  structured_languages = case
    when jsonb_array_length(coalesce(structured_languages, '[]'::jsonb)) = 0 and nullif(trim(languages), '') is not null
      then jsonb_build_array(jsonb_build_object('label', trim(languages), 'source', 'LEGACY_TEXT'))
    else structured_languages
  end,
  structured_licenses = case
    when jsonb_array_length(coalesce(structured_licenses, '[]'::jsonb)) = 0 and nullif(trim(driver_license), '') is not null
      then jsonb_build_array(jsonb_build_object('label', trim(driver_license), 'source', 'LEGACY_TEXT'))
    else structured_licenses
  end
where
  (jsonb_array_length(coalesce(structured_skills, '[]'::jsonb)) = 0 and nullif(trim(skills), '') is not null)
  or (jsonb_array_length(coalesce(structured_languages, '[]'::jsonb)) = 0 and nullif(trim(languages), '') is not null)
  or (jsonb_array_length(coalesce(structured_licenses, '[]'::jsonb)) = 0 and nullif(trim(driver_license), '') is not null);

update vacancies
set
  structured_skills = case
    when jsonb_array_length(coalesce(structured_skills, '[]'::jsonb)) = 0 and nullif(trim(skills), '') is not null
      then jsonb_build_array(jsonb_build_object('label', trim(skills), 'importance', 'UNSPECIFIED', 'source', 'LEGACY_TEXT'))
    else structured_skills
  end,
  structured_languages = case
    when jsonb_array_length(coalesce(structured_languages, '[]'::jsonb)) = 0 and nullif(trim(languages), '') is not null
      then jsonb_build_array(jsonb_build_object('label', trim(languages), 'importance', 'UNSPECIFIED', 'source', 'LEGACY_TEXT'))
    else structured_languages
  end,
  structured_licenses = case
    when jsonb_array_length(coalesce(structured_licenses, '[]'::jsonb)) = 0 and nullif(trim(license_requirement), '') is not null
      then jsonb_build_array(jsonb_build_object('label', trim(license_requirement), 'importance', 'UNSPECIFIED', 'source', 'LEGACY_TEXT'))
    else structured_licenses
  end
where
  (jsonb_array_length(coalesce(structured_skills, '[]'::jsonb)) = 0 and nullif(trim(skills), '') is not null)
  or (jsonb_array_length(coalesce(structured_languages, '[]'::jsonb)) = 0 and nullif(trim(languages), '') is not null)
  or (jsonb_array_length(coalesce(structured_licenses, '[]'::jsonb)) = 0 and nullif(trim(license_requirement), '') is not null);

commit;

-- One planet-wide model of public functions, with the existing public bodies of any place mapped onto it
-- (owner direction 2026-10-29: no country first; integrate existing structures efficiently, improving them).
--
-- Functions: the backbone is the UN Classification of the Functions of Government (COFOG, 1999), the standard every
-- government uses to report what it does: 10 divisions (general public services, defence, public order and safety,
-- economic affairs, environmental protection, housing and community amenities, health, recreation/culture/religion,
-- education, social protection) and their groups. COFOG classifies spending, so citizen-facing services it folds
-- into broader groups (data protection, elections, civil registration, digital government, ...) are added as clearly
-- marked Civizen additions inside the right division, and every division has a catch-all, so nothing falls outside.
-- Each division has a Civizen liaison position (Public Liaison unit) that answers wherever no body is mapped yet.
-- The 37 Solutions categories (`solution_authorities`) stay and point to the function they belong to.
-- Bodies: `public_bodies` are real public bodies anywhere on the planet, placed with the scope codes Matters use;
-- `public_body_functions` says which functions a body performs there. Nothing is seeded: a member or position proposes
-- a body with an official source; the liaison verifies it; only verified bodies are public and used for routing.
-- Routing: a function and a place resolve to the most local verified body (locality, region, country, then global),
-- otherwise to the division's liaison.

-- ---------------------------------------------------------------------------------------------
-- 1. Divisions, functions, and the liaisons that answer for them
-- ---------------------------------------------------------------------------------------------
INSERT INTO public.governance_execution_units (unit_key, name, description, domain_key, is_system_unit) VALUES
  ('public_liaison', 'Public Liaison Unit', 'Brings members'' Matters to the public bodies responsible for them anywhere on the planet, and maps those bodies onto Civizen''s model of public functions', 'civic_operations', true)
ON CONFLICT (unit_key) DO NOTHING;

WITH seed (position_key, title, parent, sort_order, mandate) AS (VALUES
  ('public_liaison_lead', 'Public Liaison Lead', 'civic_operations_lead', 10,
   'Leads the integration of existing public structures into Civizen: every public function has a body that answers for it in every place, or a liaison who finds one.'),
  ('liaison_general_services', 'Liaison: General Public Services', 'public_liaison_lead', 21,
   'Answers for Matters about government itself, public finance, taxes, foreign affairs, elections, records, digital government and oversight until the responsible body is reached.'),
  ('liaison_defence', 'Liaison: Defence', 'public_liaison_lead', 22,
   'Answers for Matters about military and civil defence and veterans until the responsible body is reached.'),
  ('liaison_public_order', 'Liaison: Public Order and Safety', 'public_liaison_lead', 23,
   'Answers for Matters about policing, fire and rescue, emergency response, courts, prosecution and prisons until the responsible body is reached.'),
  ('liaison_economic_affairs', 'Liaison: Economic Affairs', 'public_liaison_lead', 24,
   'Answers for Matters about business, work, consumers, finance regulation, agriculture, energy, industry, transport and communications until the responsible body is reached.'),
  ('liaison_environment', 'Liaison: Environmental Protection', 'public_liaison_lead', 25,
   'Answers for Matters about waste, wastewater, pollution, climate, nature and weather services until the responsible body is reached.'),
  ('liaison_housing_community', 'Liaison: Housing and Community Amenities', 'public_liaison_lead', 26,
   'Answers for Matters about housing, planning and permits, water supply, street lighting and local amenities until the responsible body is reached.'),
  ('liaison_health', 'Liaison: Health', 'public_liaison_lead', 27,
   'Answers for Matters about medicines, clinics, hospitals, public health, food safety and health coverage until the responsible body is reached.'),
  ('liaison_culture_recreation', 'Liaison: Recreation, Culture and Religion', 'public_liaison_lead', 28,
   'Answers for Matters about sport, parks, culture, heritage, public media and religious and community services until the responsible body is reached.'),
  ('liaison_education', 'Liaison: Education', 'public_liaison_lead', 29,
   'Answers for Matters about schools, vocational and higher education, adult learning and school services until the responsible body is reached.'),
  ('liaison_social_protection', 'Liaison: Social Protection', 'public_liaison_lead', 30,
   'Answers for Matters about disability, pensions, survivors, families and children, unemployment, social housing and exclusion until the responsible body is reached.')
)
INSERT INTO public.org_positions (position_key, unit_id, title, domain_role_key, parent_position_key, sort_order, mandate, duties, acts_for_civizen)
SELECT s.position_key, u.id, s.title, CASE WHEN s.position_key = 'public_liaison_lead' THEN 'steward' ELSE 'reviewer' END,
       s.parent, s.sort_order, s.mandate,
       CASE WHEN s.position_key = 'public_liaison_lead'
         THEN ARRAY['Keep the model of public functions complete and clear', 'Review and verify proposed public bodies with their official sources',
                    'Track that Matters delivered to public bodies are answered within their deadlines', 'Propose improvements where responsibility is unclear, duplicated or missing']
         ELSE ARRAY['Deliver Matters to the responsible body through its official channel', 'Follow up until the body answers within its deadline',
                    'Map and verify the bodies that perform these functions, place by place'] END,
       true
  FROM seed s JOIN public.governance_execution_units u ON u.unit_key = 'public_liaison'
ON CONFLICT (position_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.public_function_divisions (
  division_code text PRIMARY KEY,
  cofog_code text,
  name text NOT NULL,
  liaison_position_key text NOT NULL REFERENCES public.org_positions(position_key),
  sort_order integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public.public_functions (
  function_key text PRIMARY KEY CHECK (function_key ~ '^[a-z][a-z0-9_]{2,62}$'),
  division_code text NOT NULL REFERENCES public.public_function_divisions(division_code),
  cofog_code text,
  origin text NOT NULL CHECK (origin IN ('cofog', 'civizen_addition', 'catch_all')),
  name text NOT NULL,
  description text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL
);

ALTER TABLE public.public_function_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_functions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_function_divisions, public.public_functions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_function_divisions, public.public_functions TO anon, authenticated;
DROP POLICY IF EXISTS public_function_divisions_read ON public.public_function_divisions;
CREATE POLICY public_function_divisions_read ON public.public_function_divisions FOR SELECT USING (true);
DROP POLICY IF EXISTS public_functions_read ON public.public_functions;
CREATE POLICY public_functions_read ON public.public_functions FOR SELECT USING (true);

INSERT INTO public.public_function_divisions (division_code, cofog_code, name, liaison_position_key, sort_order) VALUES
  ('01', '01', 'General public services', 'liaison_general_services', 1),
  ('02', '02', 'Defence', 'liaison_defence', 2),
  ('03', '03', 'Public order and safety', 'liaison_public_order', 3),
  ('04', '04', 'Economic affairs', 'liaison_economic_affairs', 4),
  ('05', '05', 'Environmental protection', 'liaison_environment', 5),
  ('06', '06', 'Housing and community amenities', 'liaison_housing_community', 6),
  ('07', '07', 'Health', 'liaison_health', 7),
  ('08', '08', 'Recreation, culture and religion', 'liaison_culture_recreation', 8),
  ('09', '09', 'Education', 'liaison_education', 9),
  ('10', '10', 'Social protection', 'liaison_social_protection', 10),
  ('civizen', NULL, 'Civizen itself', 'member_support', 11),
  ('unsure', NULL, 'Not sure which', 'public_liaison_lead', 12)
ON CONFLICT (division_code) DO NOTHING;

INSERT INTO public.public_functions (function_key, division_code, cofog_code, origin, name, description, keywords, sort_order) VALUES
  -- 01 General public services
  ('executive_legislative', '01', '01.1', 'cofog', 'Government and legislature', 'Heads of government, cabinets, parliaments and councils, and their offices.', ARRAY['government','parliament','congress','council','legislature','mayor','governor','president','prime minister','law making'], 101),
  ('public_finance', '01', '01.1', 'cofog', 'Public finance and budgets', 'Public budgets, treasury and fiscal policy.', ARRAY['budget','treasury','public money','fiscal','spending'], 102),
  ('taxes_customs', '01', '01.1', 'civizen_addition', 'Taxes and customs', 'Tax collection, tax returns and refunds, customs duties. Part of COFOG 01.1, listed separately because members deal with it directly.', ARRAY['tax','taxes','irs','customs','duty','refund','tax return','vat'], 103),
  ('foreign_affairs', '01', '01.1', 'cofog', 'Foreign affairs and consular services', 'Diplomacy, embassies, treaties and help for citizens abroad.', ARRAY['embassy','consulate','foreign','diplomacy','treaty','abroad','visa abroad'], 104),
  ('foreign_aid', '01', '01.2', 'cofog', 'Foreign economic aid', 'Development aid to other countries and international organisations.', ARRAY['foreign aid','development aid','humanitarian aid abroad'], 105),
  ('general_services', '01', '01.3', 'cofog', 'Civil service and general services', 'Public employment, central procurement, public buildings and shared services.', ARRAY['civil service','public employee','public building','government services'], 106),
  ('basic_research', '01', '01.4', 'cofog', 'Basic research', 'Publicly funded research not tied to one field.', ARRAY['research','science','grant','laboratory'], 107),
  ('public_debt', '01', '01.7', 'cofog', 'Public debt', 'Borrowing and repayment by the state.', ARRAY['public debt','government bonds','borrowing'], 108),
  ('elections', '01', NULL, 'civizen_addition', 'Elections and referendums', 'Election administration, voter registration, ballots and electoral integrity.', ARRAY['election','vote','voting','ballot','voter registration','referendum','polling'], 109),
  ('statistics', '01', NULL, 'civizen_addition', 'Statistics and census', 'Official statistics and the census.', ARRAY['statistics','census','official data'], 110),
  ('civil_registration', '01', NULL, 'civizen_addition', 'Civil registration and identity documents', 'Births, deaths, marriages, names, identity cards and passports.', ARRAY['birth certificate','death certificate','marriage','passport','id card','identity card','civil registry','name change'], 111),
  ('migration_citizenship', '01', NULL, 'civizen_addition', 'Migration and citizenship', 'Visas, residence, work permits, asylum and naturalisation.', ARRAY['immigration','visa','residence permit','work permit','asylum','refugee status','citizenship','naturalization','green card'], 112),
  ('digital_government', '01', NULL, 'civizen_addition', 'Digital government, IT and cybersecurity', 'Public digital services and portals, government IT, digital identity and cybersecurity.', ARRAY['website','online service','portal','digital','it','information technology','cyber','cybersecurity','hacking','digital id','app','software','data breach'], 113),
  ('data_protection', '01', NULL, 'civizen_addition', 'Data protection and privacy', 'Supervision of how personal data is collected and used.', ARRAY['privacy','personal data','data protection','gdpr','surveillance','data leak'], 114),
  ('public_procurement', '01', NULL, 'civizen_addition', 'Public procurement', 'How public bodies buy goods, works and services.', ARRAY['procurement','tender','public contract','bidding'], 115),
  ('audit_oversight', '01', NULL, 'civizen_addition', 'Audit, ombudsman and anti-corruption', 'Public audit, complaints against public bodies, integrity and anti-corruption.', ARRAY['ombudsman','corruption','bribe','audit','complaint about government','misconduct','integrity'], 116),
  ('human_rights_equality', '01', NULL, 'civizen_addition', 'Human rights and equality', 'Human rights institutions and equality and non-discrimination bodies.', ARRAY['human rights','discrimination','equality','racism','sexism','accessibility rights','minority rights'], 117),
  ('land_property_registry', '01', NULL, 'civizen_addition', 'Land and property registry', 'Land titles, cadastre and property records.', ARRAY['land registry','cadastre','property title','deed','land ownership'], 118),
  ('general_other', '01', NULL, 'catch_all', 'Other general public services', 'General public services not listed above.', ARRAY[]::text[], 199),
  -- 02 Defence
  ('military_defence', '02', '02.1', 'cofog', 'Military defence', 'Armed forces and national defence.', ARRAY['military','army','armed forces','defence','defense','conscription'], 201),
  ('civil_defence', '02', '02.2', 'cofog', 'Civil defence', 'Civil protection planning and shelters for war and major emergencies.', ARRAY['civil defence','civil protection','shelter','air raid'], 202),
  ('veterans', '02', NULL, 'civizen_addition', 'Veterans', 'Support and benefits for former members of the armed forces.', ARRAY['veteran','veterans','former soldier'], 203),
  ('defence_other', '02', NULL, 'catch_all', 'Other defence matters', 'Defence matters not listed above.', ARRAY[]::text[], 299),
  -- 03 Public order and safety
  ('police', '03', '03.1', 'cofog', 'Police', 'Policing, crime reports and traffic enforcement.', ARRAY['police','crime','theft','robbery','assault','traffic police','report a crime'], 301),
  ('fire_rescue', '03', '03.2', 'cofog', 'Fire and rescue', 'Fire prevention, firefighting and rescue.', ARRAY['fire','firefighter','fire department','rescue','smoke'], 302),
  ('emergency_response', '03', NULL, 'civizen_addition', 'Emergency response and disasters', 'Emergency numbers, ambulance dispatch, disaster response and early warning.', ARRAY['emergency','911','112','ambulance','disaster','flood','earthquake','evacuation','storm','wildfire'], 303),
  ('law_courts', '03', '03.3', 'cofog', 'Courts', 'Courts and tribunals.', ARRAY['court','judge','trial','lawsuit','tribunal'], 304),
  ('prosecution_legal_aid', '03', NULL, 'civizen_addition', 'Prosecution and legal aid', 'Public prosecution and free or low-cost legal help.', ARRAY['prosecutor','prosecution','legal aid','public defender','lawyer for free'], 305),
  ('prisons', '03', '03.4', 'cofog', 'Prisons and probation', 'Prisons, detention and probation.', ARRAY['prison','jail','detention','probation','inmate'], 306),
  ('public_order_other', '03', NULL, 'catch_all', 'Other public order and safety', 'Public order and safety matters not listed above.', ARRAY[]::text[], 399),
  -- 04 Economic affairs
  ('commerce_trade', '04', '04.1', 'cofog', 'Business, trade and competition', 'Business registration and support, trade and fair competition.', ARRAY['business','company registration','trade','competition','monopoly','small business','license to operate'], 401),
  ('labour', '04', '04.1', 'cofog', 'Work and labour standards', 'Wages, working conditions, workplace safety and labour disputes.', ARRAY['work','job','wage','salary','employer','workplace','labor','labour','overtime','workplace safety'], 402),
  ('consumer_protection', '04', NULL, 'civizen_addition', 'Consumer protection', 'Consumer rights, product safety and unfair practices.', ARRAY['consumer','refund','scam','fraud','product safety','warranty','overcharged'], 403),
  ('financial_regulation', '04', NULL, 'civizen_addition', 'Banking, insurance and financial regulation', 'Supervision of banks, insurers and financial markets, and the central bank.', ARRAY['bank','banking','insurance','loan','mortgage','credit','central bank','financial regulator'], 404),
  ('agriculture_fisheries', '04', '04.2', 'cofog', 'Agriculture, forestry and fishing', 'Farming, forestry, fishing and hunting.', ARRAY['farm','farming','agriculture','forestry','fishing','hunting','crops','livestock'], 405),
  ('animal_health_welfare', '04', NULL, 'civizen_addition', 'Animal health and welfare', 'Veterinary services, animal welfare and animal control.', ARRAY['animal','pet','stray','veterinary','animal cruelty','dog'], 406),
  ('energy', '04', '04.3', 'cofog', 'Fuel and energy', 'Electricity, gas, fuel and energy policy.', ARRAY['electricity','power','gas','fuel','energy','blackout','power outage','renewable'], 407),
  ('industry_construction', '04', '04.4', 'cofog', 'Mining, manufacturing and construction', 'Mining, industry and the construction sector.', ARRAY['mining','mine','factory','manufacturing','construction industry'], 408),
  ('transport', '04', '04.5', 'cofog', 'Transport', 'Roads, public transport, rail, aviation, shipping, driving licences and vehicle registration.', ARRAY['road','pothole','traffic','bus','train','metro','transit','airport','flight','driver license','driving licence','vehicle registration','parking','bridge','sidewalk'], 409),
  ('communication', '04', '04.6', 'cofog', 'Communications and post', 'Telecommunications, internet access and postal services.', ARRAY['internet','broadband','phone','mobile network','telecom','post','postal','mail delivery'], 410),
  ('tourism_services', '04', '04.7', 'cofog', 'Tourism, trade services and storage', 'Tourism, distributive trades, hotels and storage.', ARRAY['tourism','hotel','tourist'], 411),
  ('intellectual_property', '04', NULL, 'civizen_addition', 'Intellectual property', 'Patents, trademarks and copyright offices.', ARRAY['patent','trademark','copyright','intellectual property'], 412),
  ('standards_metrology', '04', NULL, 'civizen_addition', 'Standards and measurement', 'Technical standards, certification and weights and measures.', ARRAY['standard','certification','weights and measures','metrology'], 413),
  ('economic_other', '04', NULL, 'catch_all', 'Other economic affairs', 'Economic matters not listed above.', ARRAY[]::text[], 499),
  -- 05 Environmental protection
  ('waste_management', '05', '05.1', 'cofog', 'Waste management', 'Rubbish collection, recycling and disposal.', ARRAY['garbage','trash','rubbish','waste','recycling','landfill','litter'], 501),
  ('waste_water', '05', '05.2', 'cofog', 'Wastewater', 'Sewers and wastewater treatment.', ARRAY['sewer','sewage','wastewater','drain','drainage'], 502),
  ('pollution_abatement', '05', '05.3', 'cofog', 'Pollution control', 'Air, water, soil and noise pollution.', ARRAY['pollution','air quality','smog','noise','contamination','toxic','emissions'], 503),
  ('biodiversity_landscape', '05', '05.4', 'cofog', 'Nature and biodiversity', 'Protected areas, wildlife, forests and landscapes.', ARRAY['nature','wildlife','biodiversity','protected area','national park','deforestation','species'], 504),
  ('climate', '05', NULL, 'civizen_addition', 'Climate', 'Climate change mitigation and adaptation.', ARRAY['climate','climate change','carbon','global warming','heatwave','adaptation'], 505),
  ('meteorology', '05', NULL, 'civizen_addition', 'Weather and hydrology services', 'Weather forecasts, warnings and water monitoring.', ARRAY['weather','forecast','meteorology','storm warning'], 506),
  ('environment_other', '05', NULL, 'catch_all', 'Other environmental protection', 'Environmental matters not listed above.', ARRAY[]::text[], 599),
  -- 06 Housing and community amenities
  ('housing_development', '06', '06.1', 'cofog', 'Housing', 'Housing supply, affordability and building standards.', ARRAY['housing','rent','landlord','eviction','apartment','affordable housing','building code'], 601),
  ('community_development', '06', '06.2', 'cofog', 'Planning, zoning and permits', 'Land use, zoning, building permits and community development.', ARRAY['zoning','building permit','planning','land use','construction permit','development'], 602),
  ('water_supply', '06', '06.3', 'cofog', 'Water supply', 'Drinking water supply and quality.', ARRAY['water','tap water','drinking water','water bill','water outage'], 603),
  ('street_lighting', '06', '06.4', 'cofog', 'Street lighting', 'Public lighting of streets and spaces.', ARRAY['street light','streetlight','lamp','lighting'], 604),
  ('local_amenities', '06', NULL, 'civizen_addition', 'Local public spaces and cemeteries', 'Squares, public toilets, markets and cemeteries. Part of COFOG 06, listed separately because members ask about them directly.', ARRAY['public toilet','square','cemetery','market hall','bench'], 605),
  ('housing_community_other', '06', NULL, 'catch_all', 'Other housing and community amenities', 'Housing and community matters not listed above.', ARRAY[]::text[], 699),
  -- 07 Health
  ('medical_products', '07', '07.1', 'cofog', 'Medicines and medical products', 'Medicines, pharmacies and medical devices.', ARRAY['medicine','drug','pharmacy','prescription','medical device'], 701),
  ('outpatient_services', '07', '07.2', 'cofog', 'Doctors and clinics', 'General practitioners, specialists, dentists and clinics.', ARRAY['doctor','clinic','dentist','appointment','general practitioner','specialist'], 702),
  ('hospital_services', '07', '07.3', 'cofog', 'Hospitals', 'Hospital care.', ARRAY['hospital','surgery','emergency room','ward'], 703),
  ('public_health', '07', '07.4', 'cofog', 'Public health', 'Prevention, vaccination, epidemics and health inspection.', ARRAY['public health','vaccine','vaccination','epidemic','pandemic','outbreak','disease','health inspection'], 704),
  ('food_safety', '07', NULL, 'civizen_addition', 'Food safety', 'Safety and hygiene of food and restaurants.', ARRAY['food safety','food poisoning','restaurant hygiene','expired food'], 705),
  ('health_coverage', '07', NULL, 'civizen_addition', 'Health coverage and insurance', 'Public health insurance and coverage of care costs.', ARRAY['health insurance','coverage','medicaid','medicare','medical bill'], 706),
  ('mental_health', '07', NULL, 'civizen_addition', 'Mental health services', 'Public mental health care and crisis support.', ARRAY['mental health','depression','anxiety','psychiatric','suicide prevention','counselling'], 707),
  ('health_other', '07', NULL, 'catch_all', 'Other health matters', 'Health matters not listed above.', ARRAY[]::text[], 799),
  -- 08 Recreation, culture and religion
  ('recreation_sport', '08', '08.1', 'cofog', 'Sport, parks and recreation', 'Sports facilities, parks and playgrounds.', ARRAY['sport','park','playground','gym','stadium','swimming pool','recreation'], 801),
  ('cultural_services', '08', '08.2', 'cofog', 'Culture, libraries and heritage', 'Libraries, museums, theatres and cultural heritage.', ARRAY['library','museum','theatre','heritage','monument','culture','arts'], 802),
  ('broadcasting_publishing', '08', '08.3', 'cofog', 'Public media and publishing', 'Public broadcasting and media regulation.', ARRAY['public television','radio','broadcasting','media','press freedom'], 803),
  ('religious_community', '08', '08.4', 'cofog', 'Religious and community services', 'Support for religious and community organisations.', ARRAY['religion','church','mosque','temple','community centre'], 804),
  ('culture_other', '08', NULL, 'catch_all', 'Other recreation, culture and religion', 'Matters in this area not listed above.', ARRAY[]::text[], 899),
  -- 09 Education
  ('early_primary_education', '09', '09.1', 'cofog', 'Early childhood and primary education', 'Kindergartens, pre-schools and primary schools.', ARRAY['kindergarten','preschool','primary school','elementary school','daycare'], 901),
  ('secondary_education', '09', '09.2', 'cofog', 'Secondary education', 'Middle and high schools.', ARRAY['high school','secondary school','middle school'], 902),
  ('vocational_education', '09', '09.3', 'cofog', 'Vocational and post-secondary education', 'Vocational training and post-secondary non-tertiary education.', ARRAY['vocational','apprenticeship','trade school','training'], 903),
  ('tertiary_education', '09', '09.4', 'cofog', 'Higher education', 'Universities and colleges.', ARRAY['university','college','tuition','student loan','scholarship'], 904),
  ('adult_learning', '09', '09.5', 'cofog', 'Adult and other learning', 'Learning not tied to a level, such as adult education and literacy.', ARRAY['adult education','literacy','language course'], 905),
  ('education_support', '09', '09.6', 'cofog', 'School services', 'School transport, meals and other support for students.', ARRAY['school bus','school meals','school lunch','school transport'], 906),
  ('education_other', '09', NULL, 'catch_all', 'Other education matters', 'Education matters not listed above.', ARRAY[]::text[], 999),
  -- 10 Social protection
  ('sickness_disability', '10', '10.1', 'cofog', 'Sickness and disability support', 'Sick pay, disability benefits and care.', ARRAY['disability','disabled','sick leave','sick pay','care allowance','accessibility support'], 1001),
  ('old_age', '10', '10.2', 'cofog', 'Pensions and old age', 'Pensions and care for older people.', ARRAY['pension','retirement','elderly','senior','nursing home','social security'], 1002),
  ('survivors', '10', '10.3', 'cofog', 'Survivors', 'Support for widows, widowers and orphans.', ARRAY['widow','widower','orphan','survivor benefit'], 1003),
  ('family_children', '10', '10.4', 'cofog', 'Families and children', 'Family benefits, childcare support and child protection.', ARRAY['child benefit','childcare','child protection','foster','adoption','parental leave','family allowance'], 1004),
  ('unemployment', '10', '10.5', 'cofog', 'Unemployment and job seeking', 'Unemployment benefits and employment services.', ARRAY['unemployment','unemployed','job seeker','jobless','employment office'], 1005),
  ('social_housing', '10', '10.6', 'cofog', 'Social housing and housing support', 'Social housing and help with housing costs.', ARRAY['social housing','public housing','housing benefit','rent support'], 1006),
  ('social_exclusion', '10', '10.7', 'cofog', 'Poverty, homelessness and social inclusion', 'Support against poverty and social exclusion, homelessness and help for refugees and others at risk.', ARRAY['poverty','homeless','homelessness','food bank','social assistance','welfare','refugee support'], 1007),
  ('social_protection_other', '10', NULL, 'catch_all', 'Other social protection', 'Social protection matters not listed above.', ARRAY[]::text[], 1099),
  -- Civizen itself, and not sure
  ('civizen_network', 'civizen', NULL, 'civizen_addition', 'Civizen itself', 'Issues about the Civizen platform, membership and community processes.', ARRAY['civizen','account','profile','app'], 1101),
  ('not_sure', 'unsure', NULL, 'catch_all', 'Not sure which', 'When it is not clear which public function a Matter concerns; the Public Liaison Lead decides.', ARRAY[]::text[], 1201)
ON CONFLICT (function_key) DO NOTHING;

-- The Solutions categories keep working and point to the function they belong to
ALTER TABLE public.solution_authorities ADD COLUMN IF NOT EXISTS function_key text REFERENCES public.public_functions(function_key);
UPDATE public.solution_authorities a SET function_key = m.fk
  FROM (VALUES
    ('executive_office', 'executive_legislative'), ('interior', 'civil_registration'), ('foreign_affairs', 'foreign_affairs'),
    ('defense', 'military_defence'), ('justice', 'prosecution_legal_aid'), ('judiciary', 'law_courts'), ('finance', 'public_finance'),
    ('taxation', 'taxes_customs'), ('economy', 'commerce_trade'), ('labor', 'labour'), ('health', 'public_health'),
    ('education', 'secondary_education'), ('higher_education', 'tertiary_education'), ('transport', 'transport'),
    ('infrastructure', 'transport'), ('housing', 'housing_development'), ('environment', 'pollution_abatement'), ('energy', 'energy'),
    ('agriculture', 'agriculture_fisheries'), ('water', 'water_supply'), ('social_welfare', 'social_exclusion'),
    ('culture', 'cultural_services'), ('communications', 'communication'), ('immigration', 'migration_citizenship'),
    ('emergency', 'emergency_response'), ('consumer', 'consumer_protection'), ('planning', 'community_development'),
    ('municipal', 'housing_community_other'), ('police', 'police'), ('utilities', 'water_supply'), ('elections', 'elections'),
    ('ombudsman', 'audit_oversight'), ('veterans', 'veterans'), ('family_youth', 'family_children'), ('tourism_sport', 'recreation_sport'),
    ('natural_resources', 'biodiversity_landscape'), ('civizen_network', 'civizen_network')
  ) AS m(id, fk)
 WHERE a.id = m.id;

-- ---------------------------------------------------------------------------------------------
-- 2. Public bodies anywhere, and the functions they perform there
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.public_bodies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 200),
  kind text NOT NULL CHECK (kind IN ('international', 'legislature', 'executive', 'ministry', 'agency', 'court', 'independent',
                                     'regional_government', 'local_government', 'service_provider', 'other')),
  scope_kind text NOT NULL CHECK (scope_kind IN ('global', 'country', 'region', 'locality')),
  scope_country_code text,
  scope_region_code text,
  scope_locality_code text,
  parent_body_id uuid REFERENCES public.public_bodies(id) ON DELETE SET NULL,
  website text CHECK (website IS NULL OR website ~ '^https?://'),
  channel_kind text NOT NULL DEFAULT 'web_form' CHECK (channel_kind IN ('service_request_api', 'email', 'web_form', 'postal', 'phone')),
  channel_address text NOT NULL CHECK (length(btrim(channel_address)) BETWEEN 3 AND 500),
  answer_deadline_days integer CHECK (answer_deadline_days IS NULL OR answer_deadline_days BETWEEN 1 AND 365),
  source_url text NOT NULL CHECK (source_url ~ '^https://'),
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'verified', 'rejected', 'retired')),
  notes text CHECK (notes IS NULL OR length(notes) <= 2000),
  proposed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((scope_kind = 'global' AND scope_country_code IS NULL)
         OR (scope_kind = 'country' AND scope_country_code IS NOT NULL)
         OR (scope_kind = 'region' AND scope_country_code IS NOT NULL AND scope_region_code IS NOT NULL)
         OR (scope_kind = 'locality' AND scope_country_code IS NOT NULL AND scope_locality_code IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS public_bodies_place_idx ON public.public_bodies (scope_country_code, scope_region_code, scope_locality_code) WHERE status = 'verified';

CREATE TABLE IF NOT EXISTS public.public_body_functions (
  body_id uuid NOT NULL REFERENCES public.public_bodies(id) ON DELETE CASCADE,
  function_key text NOT NULL REFERENCES public.public_functions(function_key),
  coverage_note text CHECK (coverage_note IS NULL OR length(coverage_note) <= 300),
  PRIMARY KEY (body_id, function_key)
);
CREATE INDEX IF NOT EXISTS public_body_functions_function_idx ON public.public_body_functions (function_key);

ALTER TABLE public.matters ADD COLUMN IF NOT EXISTS public_function_key text REFERENCES public.public_functions(function_key);
ALTER TABLE public.matters ADD COLUMN IF NOT EXISTS public_body_id uuid REFERENCES public.public_bodies(id) ON DELETE SET NULL;

ALTER TABLE public.public_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_body_functions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_bodies, public.public_body_functions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_bodies, public.public_body_functions TO anon, authenticated;
DROP POLICY IF EXISTS public_bodies_read ON public.public_bodies;
CREATE POLICY public_bodies_read ON public.public_bodies FOR SELECT
  USING (status = 'verified' OR (proposed_by IS NOT NULL AND proposed_by = public.current_profile_id()));
DROP POLICY IF EXISTS public_body_functions_read ON public.public_body_functions;
CREATE POLICY public_body_functions_read ON public.public_body_functions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.public_bodies b WHERE b.id = body_id
                   AND (b.status = 'verified' OR (b.proposed_by IS NOT NULL AND b.proposed_by = public.current_profile_id()))));

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['public_bodies', 'public_body_functions', 'public_function_divisions', 'public_functions'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS enforcement_suspension_guard ON public.%I', t);
    EXECUTE format('CREATE TRIGGER enforcement_suspension_guard BEFORE INSERT OR UPDATE OR DELETE ON public.%I '
                   'FOR EACH STATEMENT EXECUTE FUNCTION public.enforcement_suspension_guard()', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------------------------

-- ---------------------------------------------------------------------------------------------
-- 3. Routing
-- ---------------------------------------------------------------------------------------------
-- The most local verified body that performs the function in the place, else the division's liaison position.
CREATE OR REPLACE FUNCTION public.route_public_function(
  p_function_key text, p_scope_kind text DEFAULT 'global', p_country text DEFAULT NULL, p_region text DEFAULT NULL, p_locality text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_function public.public_functions%ROWTYPE;
  v_liaison text;
  v_body public.public_bodies%ROWTYPE;
  v_country text := nullif(nullif(upper(btrim(coalesce(p_country, ''))), 'GLOBAL'), '');
  v_region text := nullif(btrim(coalesce(p_region, '')), '');
  v_locality text := nullif(btrim(coalesce(p_locality, '')), '');
BEGIN
  SELECT * INTO v_function FROM public.public_functions WHERE function_key = p_function_key;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown_function' USING ERRCODE = '22023';
  END IF;
  SELECT liaison_position_key INTO v_liaison FROM public.public_function_divisions WHERE division_code = v_function.division_code;
  SELECT b.* INTO v_body
    FROM public.public_bodies b JOIN public.public_body_functions f ON f.body_id = b.id
   WHERE f.function_key = p_function_key AND b.status = 'verified'
     AND (
       (b.scope_kind = 'locality' AND b.scope_country_code = v_country AND b.scope_locality_code = v_locality
          AND (b.scope_region_code IS NULL OR b.scope_region_code = v_region))
       OR (b.scope_kind = 'region' AND b.scope_country_code = v_country AND b.scope_region_code = v_region)
       OR (b.scope_kind = 'country' AND b.scope_country_code = v_country)
       OR b.scope_kind = 'global')
   ORDER BY CASE b.scope_kind WHEN 'locality' THEN 0 WHEN 'region' THEN 1 WHEN 'country' THEN 2 ELSE 3 END, b.created_at
   LIMIT 1;
  RETURN jsonb_build_object(
    'function_key', v_function.function_key, 'function_name', v_function.name, 'division_code', v_function.division_code,
    'liaison_position_key', v_liaison,
    'liaison_title', (SELECT title FROM public.org_positions WHERE position_key = v_liaison),
    'body', CASE WHEN v_body.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_body.id, 'name', v_body.name, 'kind', v_body.kind, 'scope_kind', v_body.scope_kind,
      'scope_country_code', v_body.scope_country_code, 'scope_region_code', v_body.scope_region_code,
      'scope_locality_code', v_body.scope_locality_code, 'website', v_body.website, 'channel_kind', v_body.channel_kind,
      'channel_address', v_body.channel_address, 'answer_deadline_days', v_body.answer_deadline_days, 'source_url', v_body.source_url) END);
END;
$$;
REVOKE ALL ON FUNCTION public.route_public_function(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.route_public_function(text, text, text, text, text) TO anon, authenticated;

-- The planet-wide model: functions by division, with their origin, liaison and how many verified bodies perform each.
CREATE OR REPLACE FUNCTION public.public_function_catalog()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'function_key', f.function_key, 'name', f.name, 'description', f.description, 'division_code', f.division_code,
           'division_name', d.name, 'cofog_code', f.cofog_code, 'origin', f.origin, 'keywords', to_jsonb(f.keywords),
           'liaison_position_key', d.liaison_position_key,
           'verified_bodies', (SELECT count(*) FROM public.public_body_functions bf JOIN public.public_bodies b ON b.id = bf.body_id
                                WHERE bf.function_key = f.function_key AND b.status = 'verified'))
         ORDER BY d.sort_order, f.sort_order), '[]'::jsonb)
    FROM public.public_functions f JOIN public.public_function_divisions d ON d.division_code = f.division_code;
$$;
REVOKE ALL ON FUNCTION public.public_function_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_function_catalog() TO anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 4. Proposing and verifying bodies
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.propose_public_body(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_id uuid;
  v_functions text[] := ARRAY(SELECT DISTINCT jsonb_array_elements_text(coalesce(payload -> 'functions', '[]'::jsonb)));
  v_scope text := lower(btrim(coalesce(payload ->> 'scope_kind', '')));
  v_liaison text;
  v_name text := btrim(coalesce(payload ->> 'name', ''));
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF cardinality(v_functions) = 0 OR EXISTS (SELECT 1 FROM unnest(v_functions) f WHERE f NOT IN (SELECT function_key FROM public.public_functions)) THEN
    RAISE EXCEPTION 'functions_required' USING ERRCODE = '22023';
  END IF;
  IF coalesce(payload ->> 'source_url', '') !~ '^https://' THEN
    RAISE EXCEPTION 'source_required' USING ERRCODE = '22023';
  END IF;
  -- at most 10 proposals a day per member
  IF (SELECT count(*) FROM public.public_bodies WHERE proposed_by = v_me AND created_at > now() - interval '1 day') >= 10 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'PT429', DETAIL = 'public_body', HINT = (now() + interval '1 day')::text;
  END IF;
  INSERT INTO public.public_bodies (name, kind, scope_kind, scope_country_code, scope_region_code, scope_locality_code, website,
                                    channel_kind, channel_address, answer_deadline_days, source_url, notes, proposed_by)
  VALUES (v_name, coalesce(nullif(payload ->> 'kind', ''), 'other'), v_scope,
          CASE WHEN v_scope = 'global' THEN NULL ELSE nullif(upper(btrim(coalesce(payload ->> 'scope_country_code', ''))), '') END,
          nullif(btrim(coalesce(payload ->> 'scope_region_code', '')), ''),
          nullif(btrim(coalesce(payload ->> 'scope_locality_code', '')), ''),
          nullif(btrim(coalesce(payload ->> 'website', '')), ''),
          coalesce(nullif(payload ->> 'channel_kind', ''), 'web_form'), btrim(coalesce(payload ->> 'channel_address', '')),
          nullif(payload ->> 'answer_deadline_days', '')::integer, btrim(payload ->> 'source_url'),
          nullif(btrim(coalesce(payload ->> 'notes', '')), ''), v_me)
  RETURNING id INTO v_id;
  INSERT INTO public.public_body_functions (body_id, function_key) SELECT v_id, f FROM unnest(v_functions) f;
  SELECT d.liaison_position_key INTO v_liaison FROM public.public_functions f JOIN public.public_function_divisions d ON d.division_code = f.division_code
   WHERE f.function_key = v_functions[1];
  INSERT INTO public.org_position_items (position_key, kind, title, body, recommendation, source_type, source_ref, created_by)
  VALUES (coalesce(v_liaison, 'public_liaison_lead'), 'review', 'Verify public body: ' || left(v_name, 150),
          'Proposed ' || to_char(now(), 'YYYY-MM-DD') || '. Place: ' || v_scope
            || coalesce(' ' || nullif(upper(btrim(coalesce(payload ->> 'scope_country_code', ''))), ''), '')
            || coalesce(' / ' || nullif(btrim(coalesce(payload ->> 'scope_region_code', '')), ''), '')
            || coalesce(' / ' || nullif(btrim(coalesce(payload ->> 'scope_locality_code', '')), ''), '')
            || E'\nFunctions: ' || array_to_string(v_functions, ', ')
            || E'\nChannel: ' || coalesce(payload ->> 'channel_kind', 'web_form') || ' ' || btrim(coalesce(payload ->> 'channel_address', ''))
            || E'\nSource: ' || btrim(payload ->> 'source_url'),
          'Open the source, confirm the body exists, performs these functions in this place, and that the channel is its official one; then verify or reject with a note.',
          'public_body', v_id::text, v_me);
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.propose_public_body(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.propose_public_body(jsonb) TO authenticated;

-- The liaison for any of the body's functions verifies or rejects it; the review item closes with the decision.
CREATE OR REPLACE FUNCTION public.review_public_body(p_body_id uuid, p_decision text, p_note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := public.current_profile_id();
BEGIN
  IF p_decision NOT IN ('verified', 'rejected', 'retired') THEN
    RAISE EXCEPTION 'unknown_decision' USING ERRCODE = '22023';
  END IF;
  IF nullif(btrim(p_note), '') IS NULL THEN
    RAISE EXCEPTION 'note_required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.public_body_functions bf JOIN public.public_functions f ON f.function_key = bf.function_key
      JOIN public.public_function_divisions d ON d.division_code = f.division_code
     WHERE bf.body_id = p_body_id AND public.org_can_work_position(d.liaison_position_key, v_me)) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  UPDATE public.public_bodies SET status = p_decision, reviewed_by = v_me, reviewed_at = now(), review_note = btrim(p_note), updated_at = now()
   WHERE id = p_body_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'body_not_found' USING ERRCODE = '22023';
  END IF;
  WITH closed AS (
    UPDATE public.org_position_items
       SET status = CASE WHEN p_decision = 'rejected' THEN 'declined' ELSE 'done' END, resolution = initcap(p_decision) || ': ' || btrim(p_note),
           resolved_by = v_me, resolved_at = now(), updated_at = now()
     WHERE source_type = 'public_body' AND source_ref = p_body_id::text AND status IN ('open', 'in_progress', 'waiting')
    RETURNING id, position_key)
  INSERT INTO public.org_position_log (position_key, item_id, event, actor_profile_id, body)
  SELECT position_key, id, 'item_resolved', v_me, initcap(p_decision) || ': ' || btrim(p_note) FROM closed;
END;
$$;
REVOKE ALL ON FUNCTION public.review_public_body(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_public_body(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- 5. A Matter for a public authority
-- ---------------------------------------------------------------------------------------------
-- The initiator records which public function the Matter is about; the route picks the body for the Matter's place.
-- The Matter moves from Member Support's triage to the function's liaison, with what to deliver and where.
CREATE OR REPLACE FUNCTION public.set_matter_public_route(p_matter_id uuid, p_function_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matter public.matters%ROWTYPE;
  v_route jsonb;
  v_body jsonb;
  v_liaison text;
BEGIN
  SELECT * INTO v_matter FROM public.matters WHERE id = p_matter_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'matter_not_found' USING ERRCODE = '22023';
  END IF;
  IF NOT public.current_profile_represents_actor(v_matter.initiator_kind, v_matter.initiator_profile_id) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  v_route := public.route_public_function(p_function_key, v_matter.scope_kind, v_matter.scope_country_code,
                                          v_matter.scope_region_code, v_matter.scope_locality_code);
  v_body := nullif(v_route -> 'body', 'null'::jsonb);
  v_liaison := coalesce(v_route ->> 'liaison_position_key', 'public_liaison_lead');
  UPDATE public.matters SET public_function_key = p_function_key, public_body_id = (v_body ->> 'id')::uuid WHERE id = p_matter_id;
  -- triage is no longer needed: the liaison for the function has it
  WITH closed AS (
    UPDATE public.org_position_items
       SET status = 'done', resolution = 'Routed to ' || coalesce(v_route ->> 'liaison_title', v_liaison) || ' (public function: '
                                         || (v_route ->> 'function_name') || ').', resolved_at = now(), updated_at = now()
     WHERE position_key = 'member_support' AND source_type = 'matter' AND source_ref = p_matter_id::text
       AND status IN ('open', 'in_progress', 'waiting')
    RETURNING id)
  INSERT INTO public.org_position_log (position_key, item_id, event, body)
  SELECT 'member_support', id, 'item_resolved', 'Routed to ' || coalesce(v_route ->> 'liaison_title', v_liaison) FROM closed;
  PERFORM public.org_open_matter_item(
    v_liaison, 'task',
    CASE WHEN v_body IS NULL THEN 'Find the responsible office: ' ELSE 'Deliver to ' || (v_body ->> 'name') || ': ' END || v_matter.title,
    'Public function: ' || (v_route ->> 'function_name') || E'\nPlace: ' || v_matter.scope_kind
      || coalesce(' ' || v_matter.scope_country_code, '') || coalesce(' / ' || v_matter.scope_region_code, '')
      || coalesce(' / ' || v_matter.scope_locality_code, '')
      || CASE WHEN v_body IS NULL THEN E'\nNo verified body performs this function here yet.'
         ELSE E'\nChannel: ' || (v_body ->> 'channel_kind') || ' ' || (v_body ->> 'channel_address')
              || coalesce(E'\nAnswer due within ' || (v_body ->> 'answer_deadline_days') || ' days by law or policy.', '')
              || E'\nSource: ' || (v_body ->> 'source_url') END,
    CASE WHEN v_body IS NULL
      THEN 'Find the office that performs this function in this place from an official source, propose it as a public body, then deliver the Matter and record the reference here.'
      ELSE 'Deliver the Matter through the official channel, record the reference and the date here, and follow up until the body answers.' END,
    'normal', p_matter_id);
  PERFORM public.matter_log_event(p_matter_id, 'public_route_set',
    'Addressed to the public function "' || (v_route ->> 'function_name') || '"'
      || CASE WHEN v_body IS NULL THEN '; a Civizen liaison will find the responsible office.' ELSE '; delivered through ' || (v_body ->> 'name') || '.' END,
    'system', NULL, true, jsonb_build_object('functionKey', p_function_key, 'bodyId', v_body ->> 'id', 'liaison', v_liaison));
  RETURN v_route;
END;
$$;
REVOKE ALL ON FUNCTION public.set_matter_public_route(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_matter_public_route(uuid, text) TO authenticated;

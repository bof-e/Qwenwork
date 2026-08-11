-- Seed data for Nexus Enterprise Workspace

-- Insert data source
INSERT INTO data_sources (project_id, organization_id, name, source_type, configuration, is_active, created_by_user_id)
VALUES (
  'cb7f16ef-f69d-4387-86c2-3657e0590349',
  'b427456d-c912-48b4-a493-b3b7cd66df5a',
  'KoboToolbox Collecte Terrain',
  'KOBOTOOLBOX',
  '{"api_key": "0f9e0e67943424bae1ded169d45b76bd0a8f1503"}'::jsonb,
  true,
  '169d895f-df8f-4eef-aad4-a5582a5e1408'
) ON CONFLICT DO NOTHING;

-- Insert logical framework
INSERT INTO logical_frameworks (project_id, level, code, name, description, parent_id, order_index)
VALUES 
  ('cb7f16ef-f69d-4387-86c2-3657e0590349', 'Impact', 'IMP-1', 'Résilience climatique améliorée', 'Communautés résilientes au changement climatique', NULL, 0),
  ('cb7f16ef-f69d-4387-86c2-3657e0590349', 'Outcome', 'OUT-1', 'Sécurité alimentaire renforcée', 'Meilleure sécurité alimentaire pour les ménages vulnérables', NULL, 1)
ON CONFLICT DO NOTHING;

-- Insert indicators (linked to logical framework)
INSERT INTO indicators (framework_id, name, unit, formula_type, formula_params, target_value, baseline_value, periodicity)
VALUES 
  ((SELECT id FROM logical_frameworks WHERE code = 'OUT-1' LIMIT 1), 'Taux de couverture vaccinale', '%', 'AVG', '{}', 95.0, 80.0, 'MONTHLY'),
  ((SELECT id FROM logical_frameworks WHERE code = 'OUT-1' LIMIT 1), 'Ménages enquêtés', 'count', 'SUM', '{}', 1000.0, 0.0, 'QUARTERLY'),
  ((SELECT id FROM logical_frameworks WHERE code = 'OUT-1' LIMIT 1), 'Budget intrants engagé', 'USD', 'SUM', '{}', 500000.0, 0.0, 'QUARTERLY')
ON CONFLICT DO NOTHING;

-- Insert sample data batch
INSERT INTO data_batches (project_id, raw_payload, cleaning_status, submitted_by_user_id, submitted_at)
VALUES (
  'cb7f16ef-f69d-4387-86c2-3657e0590349',
  '{"vaccination_rate": 142, "households_surveyed": -4, "budget_inputs": 8412000}'::jsonb,
  'APPROVED',
  '169d895f-df8f-4eef-aad4-a5582a5e1408',
  NOW()
) ON CONFLICT DO NOTHING;

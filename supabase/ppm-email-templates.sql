-- Refinement program, Wave 1: shared FR+EN email templates for the generic
-- submit -> verify -> approve/validate (+ returned/rejected) workflow, sent via
-- lib/ppm/notifications.ts's notifyPpmEvent() through the existing sendSystemEmail/resend
-- pipeline (system_email_templates, seeded in accounts-growth-admin.sql; subject_en/body_text_en
-- columns added by multilingual-fr-en.sql). One small set of generic templates — parameterized by
-- {{entity_label}}/{{item_title}}/{{project_name}}/{{note}}/{{action_url}} — covers every register
-- across the app (achievements, expenses, NCRs, risks, deliverables, feedback, external approvals,
-- actions...) instead of one template per entity type.
-- Run after accounts-growth-admin.sql and multilingual-fr-en.sql.

insert into public.system_email_templates(id, name, subject, body_text, subject_en, body_text_en) values
(
  'ppm_workflow_submitted',
  'PPM - soumission a verifier',
  '{{entity_label}} a verifier - {{item_title}}',
  'Bonjour,\n\n{{entity_label}} "{{item_title}}" du projet {{project_name}} a ete soumis(e) et attend votre verification.\n\nEquipe NutVitaGlobalis',
  '{{entity_label}} awaiting your review - {{item_title}}',
  'Hello,\n\n{{entity_label}} "{{item_title}}" from project {{project_name}} has been submitted and is awaiting your review.\n\nNutVitaGlobalis Team'
),
(
  'ppm_workflow_verified',
  'PPM - soumission a approuver',
  '{{entity_label}} a approuver - {{item_title}}',
  'Bonjour,\n\n{{entity_label}} "{{item_title}}" du projet {{project_name}} a ete verifie(e) et attend votre approbation.\n\nEquipe NutVitaGlobalis',
  '{{entity_label}} awaiting your approval - {{item_title}}',
  'Hello,\n\n{{entity_label}} "{{item_title}}" from project {{project_name}} has been reviewed and is awaiting your approval.\n\nNutVitaGlobalis Team'
),
(
  'ppm_workflow_approved',
  'PPM - soumission validee',
  '{{entity_label}} validee - {{item_title}}',
  'Bonjour,\n\n{{entity_label}} "{{item_title}}" du projet {{project_name}} a ete validee.\n\n{{note}}\n\nEquipe NutVitaGlobalis',
  '{{entity_label}} approved - {{item_title}}',
  'Hello,\n\n{{entity_label}} "{{item_title}}" from project {{project_name}} has been approved.\n\n{{note}}\n\nNutVitaGlobalis Team'
),
(
  'ppm_workflow_returned',
  'PPM - soumission retournee',
  '{{entity_label}} retournee pour correction - {{item_title}}',
  'Bonjour,\n\n{{entity_label}} "{{item_title}}" du projet {{project_name}} vous a ete retournee pour correction.\n\nCommentaire : {{note}}\n\nEquipe NutVitaGlobalis',
  '{{entity_label}} returned for correction - {{item_title}}',
  'Hello,\n\n{{entity_label}} "{{item_title}}" from project {{project_name}} has been returned to you for correction.\n\nComment: {{note}}\n\nNutVitaGlobalis Team'
),
(
  'ppm_workflow_rejected',
  'PPM - soumission rejetee',
  '{{entity_label}} rejetee - {{item_title}}',
  'Bonjour,\n\n{{entity_label}} "{{item_title}}" du projet {{project_name}} a ete rejetee.\n\nCommentaire : {{note}}\n\nEquipe NutVitaGlobalis',
  '{{entity_label}} rejected - {{item_title}}',
  'Hello,\n\n{{entity_label}} "{{item_title}}" from project {{project_name}} has been rejected.\n\nComment: {{note}}\n\nNutVitaGlobalis Team'
),
(
  'ppm_external_approval_requested',
  'PPM - approbation externe demandee',
  'Approbation demandee - {{item_title}}',
  'Bonjour,\n\nVotre approbation est demandee pour "{{item_title}}" (projet {{project_name}}).\n\nMerci de vous connecter pour consulter et approuver ce document.\n\nEquipe NutVitaGlobalis',
  'Approval requested - {{item_title}}',
  'Hello,\n\nYour approval is requested for "{{item_title}}" (project {{project_name}}).\n\nPlease sign in to review and approve this document.\n\nNutVitaGlobalis Team'
)
on conflict(id) do update set
  subject = excluded.subject, body_text = excluded.body_text,
  subject_en = excluded.subject_en, body_text_en = excluded.body_text_en,
  updated_at = now();

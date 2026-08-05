-- Premium expertise detail pages remain stored in the existing expertises JSONB.
-- This migration only upgrades legacy hero images; all new bilingual blocks are
-- editable and persisted by the Research, Innovation & Consulting admin editor.
update public.research_innovation_settings settings
set expertises = (
  select jsonb_agg(
    case item->>'slug'
      when 'sante-publique-securite-alimentaire' then item || jsonb_build_object('image_url','/images/research-innovation/expertise-public-health-v2.png')
      when 'recherche-enquetes-donnees' then item || jsonb_build_object('image_url','/images/research-innovation/expertise-research-data-v2.png')
      when 'ia-developpement-logiciels' then item || jsonb_build_object('image_url','/images/research-innovation/expertise-ai-software-v2.png')
      when 'sig-cartographie' then item || jsonb_build_object('image_url','/images/research-innovation/expertise-gis-v2.png')
      when 'monitoring-evaluation-impact' then item || jsonb_build_object('image_url','/images/research-innovation/expertise-mel-v2.png')
      when 'formation-renforcement-capacites' then item || jsonb_build_object('image_url','/images/research-innovation/expertise-training-v2.png')
      else item
    end order by position
  )
  from jsonb_array_elements(settings.expertises) with ordinality as entries(item, position)
)
where settings.id = 1 and jsonb_typeof(settings.expertises) = 'array';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

function escapeCsv(value: unknown) {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeXml(value: unknown) {
  return String(value ?? '').replace(/[<>&'"]/g, character => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  })[character] || character);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Non authentifie.' }, { status: 401 });
  const { data: member } = await supabase
    .from('nutritrack_members')
    .select('organization_id,role,roles,status,nutritrack_organizations(name,status)')
    .eq('user_id', user.id)
    .maybeSingle();
  const organization = Array.isArray(member?.nutritrack_organizations)
    ? member.nutritrack_organizations[0]
    : member?.nutritrack_organizations;
  const isAdmin = member?.role === 'organization_admin' || member?.roles?.includes('organization_admin');
  if (!member || !isAdmin || member.status !== 'active' || organization?.status !== 'approved') {
    return NextResponse.json({ message: 'Administrateur de l espace NutriTrack requis.' }, { status: 403 });
  }

  const format = new URL(request.url).searchParams.get('format') || 'json';
  const { data, error } = await createAdminClient()
    .from('nutritrack_documents')
    .select('collection_path,document_id,data,created_at,updated_at')
    .eq('organization_id', member.organization_id)
    .order('collection_path')
    .order('document_id');
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  const rows = data || [];
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === 'csv') {
    const csv = [
      ['collection_path', 'document_id', 'created_at', 'updated_at', 'data'].map(escapeCsv).join(','),
      ...rows.map(row => [row.collection_path, row.document_id, row.created_at, row.updated_at, row.data].map(escapeCsv).join(',')),
    ].join('\r\n');
    return new NextResponse(`\uFEFF${csv}`, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="nutritrack-${stamp}.csv"` } });
  }

  if (format === 'excel') {
    const xmlRows = rows.map(row => `<Row><Cell><Data ss:Type="String">${escapeXml(row.collection_path)}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(row.document_id)}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(row.created_at)}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(row.updated_at)}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(JSON.stringify(row.data))}</Data></Cell></Row>`).join('');
    const workbook = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="NutriTrack"><Table><Row><Cell><Data ss:Type="String">Collection</Data></Cell><Cell><Data ss:Type="String">Document</Data></Cell><Cell><Data ss:Type="String">Creation</Data></Cell><Cell><Data ss:Type="String">Mise a jour</Data></Cell><Cell><Data ss:Type="String">Donnees JSON</Data></Cell></Row>${xmlRows}</Table></Worksheet></Workbook>`;
    return new NextResponse(workbook, { headers: { 'Content-Type': 'application/vnd.ms-excel; charset=utf-8', 'Content-Disposition': `attachment; filename="nutritrack-${stamp}.xls"` } });
  }

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    organization: organization?.name,
    documents: rows,
  }, { headers: { 'Content-Disposition': `attachment; filename="nutritrack-${stamp}.json"` } });
}

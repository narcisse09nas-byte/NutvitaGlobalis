import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateProgramReport } from '@/nutritrack/ai/flows/generate-program-report-flow';
import { renderNutriTrackReportPdf } from '@/lib/nutritrack-report-pdf';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Non authentifie.' }, { status: 401 });
  const { data: member } = await supabase
    .from('nutritrack_members')
    .select('organization_id,status,nutritrack_organizations(name,status)')
    .eq('user_id', user.id)
    .maybeSingle();
  const organization = Array.isArray(member?.nutritrack_organizations)
    ? member.nutritrack_organizations[0]
    : member?.nutritrack_organizations;
  if (!member || member.status !== 'active' || organization?.status !== 'approved') {
    return NextResponse.json({ message: 'Acces NutriTrack inactif.' }, { status: 403 });
  }

  const body = await request.json();
  const filters = body.filters && typeof body.filters === 'object' ? body.filters : {};
  const reportData = body.reportData && typeof body.reportData === 'object' ? body.reportData : {};
  const narrative = await generateProgramReport({ filters, reportData });
  const bytes = await renderNutriTrackReportPdf({
    organization: organization.name,
    filters,
    data: reportData,
    narrative,
  });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rapport-nutritrack-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}

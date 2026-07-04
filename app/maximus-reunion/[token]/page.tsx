import ExternalMeetingAccess from "./ExternalMeetingAccess";

export const metadata = { title: "Invitation reunion Maximus" };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ExternalMeetingAccess token={token}/>;
}

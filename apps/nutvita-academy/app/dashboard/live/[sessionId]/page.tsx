import { LiveSessionRoom } from "@/components/live/LiveSessionRoom";

type PageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function LiveSessionPage({ params }: PageProps) {
  const { sessionId } = await params;

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <LiveSessionRoom sessionId={sessionId} />
    </div>
  );
}

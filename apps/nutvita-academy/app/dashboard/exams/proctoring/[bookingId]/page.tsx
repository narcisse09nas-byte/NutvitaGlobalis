import { CandidateExamRoom } from "@/components/proctoring/CandidateExamRoom";

export default async function CandidateExamRoomPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <CandidateExamRoom bookingId={bookingId} />
    </div>
  );
}

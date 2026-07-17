import { CalendarDays } from "lucide-react";

export function CertificateFooter({
  completionDate,
  certificateId,
}: {
  completionDate: string;
  certificateId: string;
}) {
  return (
    <div className="nvg-footer-info">
      <div>
        <CalendarDays size={22} />
        <p>Date of Completion</p>
        <strong>{completionDate}</strong>
      </div>

      <div>
        <p>Certificate ID</p>
        <strong>{certificateId}</strong>
      </div>
    </div>
  );
}
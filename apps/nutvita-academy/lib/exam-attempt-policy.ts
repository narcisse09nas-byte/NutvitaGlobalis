import type { ExamAttempt, ExamDefinition } from "@/types/exam";
import type { ExamBooking } from "@/types/proctoring";
import { CERTIFICATION_RETAKE_DELAYS } from "@/lib/exam-engine";

export type ExamBookingPolicyResult = {
  canBook: boolean;
  attemptNumber: number;
  earliestSlotAt: string | null;
  status:
    | "first_attempt"
    | "active_booking"
    | "awaiting_conduct_review"
    | "certified"
    | "retake_available"
    | "attempts_exhausted";
};

function addDays(value: string, days: number): string {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function evaluateExamBookingPolicy(input: {
  userId: string;
  definition: ExamDefinition;
  attempts: ExamAttempt[];
  bookings: ExamBooking[];
}): ExamBookingPolicyResult {
  const attempts = input.attempts
    .filter(
      (attempt) =>
        attempt.userId === input.userId &&
        attempt.examSlug === input.definition.slug,
    )
    .sort((first, second) =>
      first.submittedAt.localeCompare(second.submittedAt),
    );
  const bookings = input.bookings.filter(
    (booking) =>
      booking.userId === input.userId &&
      booking.examSlug === input.definition.slug,
  );
  const activeBooking = bookings.some(
    (booking) =>
      !booking.attemptId &&
      booking.status !== "rejected" &&
      booking.status !== "cancelled",
  );
  if (activeBooking)
    return {
      canBook: false,
      attemptNumber: Math.min(attempts.length + 1, input.definition.maxAttempts),
      earliestSlotAt: null,
      status: "active_booking",
    };
  if (attempts.length === 0)
    return {
      canBook: true,
      attemptNumber: 1,
      earliestSlotAt: null,
      status: "first_attempt",
    };

  const latestAttempt = attempts.at(-1)!;
  const latestBooking = bookings.find(
    (booking) =>
      booking.id === latestAttempt.bookingId ||
      booking.attemptId === latestAttempt.id,
  );
  if (latestAttempt.passed) {
    if (
      latestBooking?.conductRating === "good" ||
      latestBooking?.conductRating === "passable"
    )
      return {
        canBook: false,
        attemptNumber: attempts.length,
        earliestSlotAt: null,
        status: "certified",
      };
    if (latestBooking?.conductRating !== "poor")
      return {
        canBook: false,
        attemptNumber: attempts.length,
        earliestSlotAt: null,
        status: "awaiting_conduct_review",
      };
  }
  if (attempts.length >= input.definition.maxAttempts)
    return {
      canBook: false,
      attemptNumber: attempts.length,
      earliestSlotAt: null,
      status: "attempts_exhausted",
    };
  const attemptNumber = attempts.length + 1;
  const delays = input.definition.retakeDelayDays ?? CERTIFICATION_RETAKE_DELAYS;
  const delayDays = attemptNumber === 2 ? delays[0] : delays[1];
  return {
    canBook: true,
    attemptNumber,
    earliestSlotAt: addDays(latestAttempt.submittedAt, delayDays),
    status: "retake_available",
  };
}

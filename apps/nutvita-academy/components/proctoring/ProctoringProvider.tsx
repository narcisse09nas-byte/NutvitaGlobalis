"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createRoomCode,
  emptyProctoringStore,
  loadProctoringStore,
  proctoringId,
  saveProctoringStore,
} from "@/lib/proctoring-storage";
import type {
  ExamBooking,
  ExamConductRating,
  ExamSlot,
  IdentitySubmission,
  IncidentSeverity,
  ProctoringRoomStatus,
  ProctoringStore,
  TechnicalCheck,
} from "@/types/proctoring";
import { assessSurveillanceRisk } from "@/lib/proctoring/surveillance-engine";
import { useLanguage } from "@/hooks/use-language";
import { buildConductDecisionNotification } from "@/lib/notification-engine";
import { pushNotificationForUser } from "@/lib/notification-storage";

type Result = { success: boolean; error?: string };

type ContextValue = {
  data: ProctoringStore;
  createSlot: (
    input: Omit<ExamSlot, "id" | "createdAt" | "updatedAt">,
  ) => Result;
  requestBooking: (
    input: Pick<
      ExamBooking,
      | "slotId"
      | "userId"
      | "candidateName"
      | "candidateEmail"
      | "courseSlug"
      | "examSlug"
      | "attemptNumber"
      | "paper"
    >,
  ) => Result;
  reviewBooking: (
    bookingId: string,
    approved: boolean,
    reviewerId: string,
  ) => Result;
  submitIdentity: (bookingId: string, identity: IdentitySubmission) => Result;
  reviewIdentity: (
    bookingId: string,
    input: {
      approved: boolean;
      matchScore: number;
      profileDataMatched: boolean;
      reviewerId: string;
      note: string;
    },
  ) => Result;
  reviewIntegrity: (
    bookingId: string,
    approved: boolean,
    reviewerId: string,
    note: string,
  ) => Result;
  reviewConduct: (
    bookingId: string,
    rating: ExamConductRating,
    reviewerId: string,
    note: string,
  ) => Result;
  recordAttemptResult: (
    bookingId: string,
    attempt: {
      id: string;
      scorePercent: number;
      passed: boolean;
      submittedAt: string;
    },
  ) => Result;
  setRoomStatus: (slotId: string, status: ProctoringRoomStatus) => Result;
  saveTechnicalCheck: (bookingId: string, check: TechnicalCheck) => Result;
  admitCandidate: (
    bookingId: string,
    technicalCheck?: TechnicalCheck,
  ) => Result;
  ejectCandidate: (bookingId: string, reason: string) => Result;
  heartbeat: (bookingId: string) => void;
  reportIncident: (input: {
    bookingId: string;
    userId: string;
    type: ProctoringStore["incidents"][number]["type"];
    severity: IncidentSeverity;
    message: string;
  }) => void;
};

export const ProctoringContext = createContext<ContextValue | null>(null);

export function ProctoringProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { text } = useLanguage();
  const [data, setData] = useState<ProctoringStore>(emptyProctoringStore());

  useEffect(() => {
    setData(loadProctoringStore());
    const sync = () => setData(loadProctoringStore());
    window.addEventListener("storage", sync);
    window.addEventListener("nutvita-proctoring-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("nutvita-proctoring-updated", sync);
    };
  }, []);

  const persist = useCallback(
    (updater: (current: ProctoringStore) => ProctoringStore) => {
      setData((current) => {
        const updated = updater(current);
        saveProctoringStore(updated);
        window.dispatchEvent(new Event("nutvita-proctoring-updated"));
        return updated;
      });
    },
    [],
  );

  const createSlot = useCallback<ContextValue["createSlot"]>(
    (input) => {
      const startsAt = new Date(input.startsAt);
      const minimum = new Date();
      minimum.setDate(minimum.getDate() + data.policy.minimumLeadDays);
      if (Number.isNaN(startsAt.getTime()) || startsAt < minimum)
        return {
          success: false,
          error: text(
            `La session doit être planifiée au moins ${data.policy.minimumLeadDays} jours à l’avance.`,
            `The session must be scheduled at least ${data.policy.minimumLeadDays} days in advance.`,
          ),
        };
      if (input.capacity < 1 || input.capacity > data.policy.maximumCandidates)
        return {
          success: false,
          error: text(
            `La capacité doit être comprise entre 1 et ${data.policy.maximumCandidates}.`,
            `Capacity must be between 1 and ${data.policy.maximumCandidates}.`,
          ),
        };
      const now = new Date().toISOString();
      const slot: ExamSlot = {
        ...input,
        id: proctoringId("slot"),
        createdAt: now,
        updatedAt: now,
      };
      persist((current) => ({
        ...current,
        slots: [slot, ...current.slots],
        roomStatuses: { ...current.roomStatuses, [slot.id]: "scheduled" },
      }));
      return { success: true };
    },
    [data.policy.maximumCandidates, data.policy.minimumLeadDays, persist, text],
  );

  const requestBooking = useCallback<ContextValue["requestBooking"]>(
    (input) => {
      const slot = data.slots.find((item) => item.id === input.slotId);
      if (!slot)
        return { success: false, error: text("Créneau introuvable.", "Slot not found.") };
      if (
        input.paper.userId !== input.userId ||
        input.paper.examSlug !== input.examSlug ||
        input.paper.attemptNumber !== input.attemptNumber
      )
        return {
          success: false,
          error: text(
            "L’épreuve individualisée est invalide.",
            "The individualized exam paper is invalid.",
          ),
        };
      const duplicate = data.bookings.some(
        (booking) =>
          booking.slotId === input.slotId &&
          booking.userId === input.userId &&
          booking.status !== "cancelled" &&
          booking.status !== "rejected",
      );
      if (duplicate)
        return {
          success: false,
          error: text("Vous avez déjà demandé ce créneau.", "You already requested this slot."),
        };
      const occupied = data.bookings.filter(
        (booking) =>
          booking.slotId === input.slotId &&
          booking.status !== "cancelled" &&
          booking.status !== "rejected",
      ).length;
      if (occupied >= slot.capacity)
        return { success: false, error: text("Ce créneau est complet.", "This slot is full.") };
      const booking: ExamBooking = {
        ...input,
        id: proctoringId("booking"),
        status: "pending",
        requestedAt: new Date().toISOString(),
        identity: null,
      };
      persist((current) => ({
        ...current,
        bookings: [booking, ...current.bookings],
      }));
      return { success: true };
    },
    [data.bookings, data.slots, persist, text],
  );

  const reviewBooking = useCallback<ContextValue["reviewBooking"]>(
    (bookingId, approved, reviewerId) => {
      if (!data.bookings.some((booking) => booking.id === bookingId))
        return { success: false, error: text("Demande introuvable.", "Request not found.") };
      persist((current) => ({
        ...current,
        bookings: current.bookings.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                status: approved ? "approved" : "rejected",
                reviewedAt: new Date().toISOString(),
                reviewedBy: reviewerId,
                roomCode: approved
                  ? (booking.roomCode ?? createRoomCode())
                  : undefined,
              }
            : booking,
        ),
      }));
      return { success: true };
    },
    [data.bookings, persist, text],
  );

  const submitIdentity = useCallback<ContextValue["submitIdentity"]>(
    (bookingId, identity) => {
      if (!data.bookings.some((booking) => booking.id === bookingId))
        return { success: false, error: text("Réservation introuvable.", "Booking not found.") };
      persist((current) => ({
        ...current,
        bookings: current.bookings.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                identity: {
                  ...identity,
                  status: "pending_review",
                  matchScore: null,
                  profileDataMatched: null,
                },
              }
            : booking,
        ),
      }));
      return { success: true };
    },
    [data.bookings, persist, text],
  );

  const reviewIdentity = useCallback<ContextValue["reviewIdentity"]>(
    (bookingId, input) => {
      const booking = data.bookings.find((item) => item.id === bookingId);
      if (!booking?.identity)
        return { success: false, error: text("Dossier d’identité incomplet.", "Incomplete identity file.") };
      const approved =
        input.approved &&
        input.profileDataMatched &&
        input.matchScore >= data.policy.identityThreshold;
      persist((current) => ({
        ...current,
        bookings: current.bookings.map((item) =>
          item.id === bookingId && item.identity
            ? {
                ...item,
                identity: {
                  ...item.identity,
                  status: approved ? "verified" : "rejected",
                  matchScore: input.matchScore,
                  profileDataMatched: input.profileDataMatched,
                  reviewedBy: input.reviewerId,
                  reviewedAt: new Date().toISOString(),
                  reviewNote: input.note,
                },
              }
            : item,
        ),
      }));
      return approved
        ? { success: true }
        : {
            success: false,
            error: text(
              `Validation refusée : le seuil requis est ${data.policy.identityThreshold}% et les données du profil doivent correspondre.`,
              `Verification denied: the required threshold is ${data.policy.identityThreshold}% and profile data must match.`,
            ),
          };
    },
    [data.bookings, data.policy.identityThreshold, persist, text],
  );

  const reviewIntegrity = useCallback<ContextValue["reviewIntegrity"]>(
    (bookingId, approved, reviewerId, note) => {
      if (!data.bookings.some((booking) => booking.id === bookingId))
        return { success: false, error: text("Candidat introuvable.", "Candidate not found.") };
      persist((current) => ({
        ...current,
        bookings: current.bookings.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                integrityStatus: approved ? "approved" : "rejected",
                integrityReviewedAt: new Date().toISOString(),
                integrityReviewedBy: reviewerId,
                integrityNote: note,
              }
            : booking,
        ),
      }));
      return { success: true };
    },
    [data.bookings, persist, text],
  );

  const reviewConduct = useCallback<ContextValue["reviewConduct"]>(
    (bookingId, rating, reviewerId, note) => {
      const booking = data.bookings.find((item) => item.id === bookingId);
      if (!booking?.attemptId)
        return {
          success: false,
          error: text("Aucune copie soumise.", "No submitted exam attempt."),
        };
      if (!booking.attemptPassed && rating !== "poor")
        return {
          success: false,
          error: text(
            "Une copie non réussie ne peut pas déverrouiller le certificat.",
            "A failed attempt cannot unlock the certificate.",
          ),
        };
      const approved = rating === "good" || rating === "passable";
      const now = new Date().toISOString();
      persist((current) => ({
        ...current,
        bookings: current.bookings.map((item) =>
          item.id === bookingId
            ? {
                ...item,
                conductRating: rating,
                conductReviewedAt: now,
                conductReviewedBy: reviewerId,
                conductNote: note,
                integrityStatus: approved ? "approved" : "rejected",
                integrityReviewedAt: now,
                integrityReviewedBy: reviewerId,
                integrityNote: note,
              }
            : item,
        ),
      }));
      pushNotificationForUser(
        booking.userId,
        buildConductDecisionNotification(booking, rating),
      );
      return { success: true };
    },
    [data.bookings, persist, text],
  );

  const recordAttemptResult = useCallback<ContextValue["recordAttemptResult"]>(
    (bookingId, attempt) => {
      const booking = data.bookings.find((item) => item.id === bookingId);
      if (!booking)
        return {
          success: false,
          error: text("Réservation introuvable.", "Booking not found."),
        };
      if (booking.attemptId)
        return {
          success: false,
          error: text(
            "Cette session a déjà été soumise.",
            "This session has already been submitted.",
          ),
        };
      persist((current) => ({
        ...current,
        bookings: current.bookings.map((item) =>
          item.id === bookingId
            ? {
                ...item,
                attemptId: attempt.id,
                attemptScorePercent: attempt.scorePercent,
                attemptPassed: attempt.passed,
                attemptSubmittedAt: attempt.submittedAt,
                integrityStatus: "pending",
              }
            : item,
        ),
      }));
      return { success: true };
    },
    [data.bookings, persist, text],
  );

  const setRoomStatus = useCallback<ContextValue["setRoomStatus"]>(
    (slotId, status) => {
      const slot = data.slots.find((item) => item.id === slotId);
      if (!slot) return { success: false, error: text("Salle introuvable.", "Room not found.") };
      if (status === "active" && new Date() < new Date(slot.startsAt))
        return {
          success: false,
          error: text(
            "L’examen ne peut être activé avant l’heure planifiée.",
            "The exam cannot be activated before its scheduled time.",
          ),
        };
      persist((current) => ({
        ...current,
        roomStatuses: { ...current.roomStatuses, [slotId]: status },
      }));
      return { success: true };
    },
    [data.slots, persist, text],
  );

  const saveTechnicalCheck = useCallback<ContextValue["saveTechnicalCheck"]>(
    (bookingId, check) => {
      persist((current) => ({
        ...current,
        admissions: [
          ...current.admissions.filter((item) => item.bookingId !== bookingId),
          {
            ...(current.admissions.find(
              (item) => item.bookingId === bookingId,
            ) ?? { bookingId }),
            technicalCheck: check,
          },
        ],
      }));
      return { success: true };
    },
    [persist],
  );

  const admitCandidate = useCallback<ContextValue["admitCandidate"]>(
    (bookingId, technicalCheck) => {
      const booking = data.bookings.find((item) => item.id === bookingId);
      const slot =
        booking && data.slots.find((item) => item.id === booking.slotId);
      const admission = data.admissions.find(
        (item) => item.bookingId === bookingId,
      );
      if (!booking || !slot || booking.status !== "approved")
        return { success: false, error: text("Réservation non approuvée.", "Booking not approved.") };
      if (booking.identity?.status !== "verified")
        return { success: false, error: text("Identité non validée.", "Identity not verified.") };
      if (data.roomStatuses[slot.id] !== "active")
        return {
          success: false,
          error: text(
            "L’examinateur n’a pas encore activé la salle.",
            "The examiner has not activated the room yet.",
          ),
        };
      const check = technicalCheck ?? admission?.technicalCheck;
      if (
        !check ||
        !check.camera ||
        !check.microphone ||
        !check.screenShare ||
        !check.fullscreen
      )
        return {
          success: false,
          error: text(
            "Tous les contrôles techniques sont obligatoires.",
            "All technical checks are required.",
          ),
        };
      persist((current) => ({
        ...current,
        admissions: [
          ...current.admissions.filter((item) => item.bookingId !== bookingId),
          {
            ...admission,
            bookingId,
            technicalCheck: check,
            admittedAt: new Date().toISOString(),
            ejectedAt: undefined,
            ejectionReason: undefined,
            lastHeartbeatAt: new Date().toISOString(),
            riskScore: 0,
            riskLevel: "low",
            reviewRequiredAt: undefined,
            reviewReason: undefined,
          },
        ],
      }));
      return { success: true };
    },
    [data.admissions, data.bookings, data.roomStatuses, data.slots, persist, text],
  );

  const ejectCandidate = useCallback<ContextValue["ejectCandidate"]>(
    (bookingId, reason) => {
      persist((current) => ({
        ...current,
        admissions: current.admissions.map((item) =>
          item.bookingId === bookingId
            ? {
                ...item,
                ejectedAt: new Date().toISOString(),
                ejectionReason: reason,
              }
            : item,
        ),
      }));
      return { success: true };
    },
    [persist],
  );

  const heartbeat = useCallback(
    (bookingId: string) => {
      persist((current) => ({
        ...current,
        admissions: current.admissions.map((item) =>
          item.bookingId === bookingId
            ? { ...item, lastHeartbeatAt: new Date().toISOString() }
            : item,
        ),
      }));
    },
    [persist],
  );

  const reportIncident = useCallback<ContextValue["reportIncident"]>(
    (input) => {
      persist((current) => {
        const incident = {
          ...input,
          id: proctoringId("incident"),
          occurredAt: new Date().toISOString(),
        };
        const incidents = [incident, ...current.incidents];
        const risk = assessSurveillanceRisk(
          incidents.filter((item) => item.bookingId === input.bookingId),
        );
        const admissions = current.admissions.map((item) =>
          item.bookingId === input.bookingId
            ? {
                ...item,
                riskScore: risk.score,
                riskLevel: risk.level,
                reviewRequiredAt: risk.reviewRequired
                  ? (item.reviewRequiredAt ?? new Date().toISOString())
                  : item.reviewRequiredAt,
                reviewReason: risk.reviewRequired
                  ? risk.reasons.join(" ") ||
                    text(
                      "Seuil de risque atteint. Révision humaine requise.",
                      "Risk threshold reached. Human review required.",
                    )
                  : item.reviewReason,
              }
            : item,
        );
        return { ...current, incidents, admissions };
      });
    },
    [persist, text],
  );

  const value = useMemo(
    () => ({
      data,
      createSlot,
      requestBooking,
      reviewBooking,
      submitIdentity,
      reviewIdentity,
      reviewIntegrity,
      reviewConduct,
      recordAttemptResult,
      setRoomStatus,
      saveTechnicalCheck,
      admitCandidate,
      ejectCandidate,
      heartbeat,
      reportIncident,
    }),
    [
      data,
      createSlot,
      requestBooking,
      reviewBooking,
      submitIdentity,
      reviewIdentity,
      reviewIntegrity,
      reviewConduct,
      recordAttemptResult,
      setRoomStatus,
      saveTechnicalCheck,
      admitCandidate,
      ejectCandidate,
      heartbeat,
      reportIncident,
    ],
  );
  return (
    <ProctoringContext.Provider value={value}>
      {children}
    </ProctoringContext.Provider>
  );
}

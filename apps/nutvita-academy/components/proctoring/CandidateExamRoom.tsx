"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  CheckCircle2,
  FileBadge2,
  LockKeyhole,
  Maximize,
  Mic,
  MonitorUp,
  ShieldAlert,
} from "lucide-react";
import { getExamDefinitionBySlug } from "@/data/exam-definitions";
import { ExamRunner } from "@/components/exams/ExamRunner";
import { useLocalAuth } from "@/hooks/use-local-auth";
import { useInstructorStudio } from "@/hooks/use-instructor-studio";
import { useProctoring } from "@/hooks/use-proctoring";
import { getPublishedStudioCourses, localizeExamQuestions, localizeStudioExam } from "@/lib/studio-course-runtime";
import { saveLocalMedia } from "@/lib/local-media-storage";
import type { TechnicalCheck } from "@/types/proctoring";
import { useLanguage } from "@/hooks/use-language";

export function CandidateExamRoom({ bookingId }: { bookingId: string }) {
  const { locale, text } = useLanguage();
  const { user } = useLocalAuth();
  const { data: studioData } = useInstructorStudio();
  const {
    data,
    submitIdentity,
    reviewIdentity,
    saveTechnicalCheck,
    admitCandidate,
    heartbeat,
    reportIncident,
  } = useProctoring();
  const booking = data.bookings.find((item) => item.id === bookingId);
  const slot = booking && data.slots.find((item) => item.id === booking.slotId);
  const admission = data.admissions.find(
    (item) => item.bookingId === bookingId,
  );
  const studioBundle = getPublishedStudioCourses(studioData)
    .flatMap((course) => (course.finalExam ? [course.finalExam] : []))
    .find((bundle) => bundle.definition.slug === booking?.examSlug);
  const localizedStudioBundle = studioBundle
    ? localizeStudioExam(studioBundle, locale)
    : null;
  const exam = booking
    ? (getExamDefinitionBySlug(booking.examSlug) ??
      localizedStudioBundle?.definition ??
      null)
    : null;
  const cameraStream = useRef<MediaStream | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const faceVideo = useRef<HTMLVideoElement | null>(null);
  const screenVideo = useRef<HTMLVideoElement | null>(null);
  const [documentType, setDocumentType] = useState<"passport" | "national_id">(
    "passport",
  );
  const [issuingCountry, setIssuingCountry] = useState(user?.country ?? "");
  const [documentNumber, setDocumentNumber] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [screenReady, setScreenReady] = useState(false);
  const [fullscreenReady, setFullscreenReady] = useState(false);
  const [error, setError] = useState("");
  const [diditAvailable, setDiditAvailable] = useState(false);
  const [identityLaunching, setIdentityLaunching] = useState(false);

  const isOwner = Boolean(user && booking?.userId === user.id);
  const roomActive = Boolean(slot && data.roomStatuses[slot.id] === "active");
  const identityVerified = booking?.identity?.status === "verified";
  const admitted = Boolean(admission?.admittedAt && !admission.ejectedAt);
  const criticalCount = useMemo(
    () =>
      data.incidents.filter(
        (item) => item.bookingId === bookingId && item.severity === "critical",
      ).length,
    [bookingId, data.incidents],
  );

  useEffect(
    () => () => {
      cameraStream.current?.getTracks().forEach((track) => track.stop());
      screenStream.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  useEffect(() => {
    void fetch("/api/proctoring/readiness", { cache: "no-store" })
      .then(
        (response) =>
          response.json() as Promise<{ canAutoVerifyIdentity?: boolean }>,
      )
      .then((payload) =>
        setDiditAvailable(Boolean(payload.canAutoVerifyIdentity)),
      )
      .catch(() => setDiditAvailable(false));
  }, []);

  useEffect(() => {
    if (!diditAvailable || booking?.identity?.status !== "pending_review")
      return;
    const check = () =>
      void fetch(
        `/api/proctoring/identity/status?bookingReference=${encodeURIComponent(bookingId)}`,
        { cache: "no-store" },
      )
        .then(
          (response) =>
            response.json() as Promise<{
              status?: string;
              identity_score?: number;
              profile_data_matched?: boolean;
            }>,
        )
        .then((payload) => {
          if (payload.status === "verified")
            reviewIdentity(bookingId, {
              approved: true,
              matchScore: payload.identity_score ?? 100,
              profileDataMatched: payload.profile_data_matched === true,
              reviewerId: "didit",
              note: text(
                "Identité vérifiée automatiquement par Didit.",
                "Identity automatically verified by Didit.",
              ),
            });
        });
    check();
    const timer = window.setInterval(check, 5_000);
    return () => window.clearInterval(timer);
  }, [booking?.identity?.status, bookingId, diditAvailable, reviewIdentity, text]);

  useEffect(() => {
    if (!admitted || !user) return;
    const log = (
      type: "tab_hidden" | "window_blur" | "fullscreen_exit",
      message: string,
    ) =>
      reportIncident({
        bookingId,
        userId: user.id,
        type,
        severity: type === "tab_hidden" ? "critical" : "warning",
        message,
      });
    const visibility = () => {
      if (document.hidden)
        log(
          "tab_hidden",
          text(
            "Le candidat a quitté ou masqué l’onglet d’examen.",
            "The candidate left or hid the exam tab.",
          ),
        );
    };
    const blur = () =>
      log(
        "window_blur",
        text("La fenêtre d’examen a perdu le focus.", "The exam window lost focus."),
      );
    const fullscreen = () => {
      setFullscreenReady(Boolean(document.fullscreenElement));
      if (!document.fullscreenElement)
        log(
          "fullscreen_exit",
          text("Le candidat a quitté le plein écran.", "The candidate exited full screen."),
        );
    };
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("fullscreenchange", fullscreen);
    window.addEventListener("blur", blur);
    const timer = window.setInterval(() => heartbeat(bookingId), 15_000);
    heartbeat(bookingId);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("fullscreenchange", fullscreen);
      window.removeEventListener("blur", blur);
      window.clearInterval(timer);
    };
  }, [admitted, bookingId, heartbeat, reportIncident, text, user]);

  async function startCamera() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      cameraStream.current?.getTracks().forEach((track) => track.stop());
      cameraStream.current = stream;
      if (faceVideo.current) faceVideo.current.srcObject = stream;
      setCameraReady(true);
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        setCameraReady(false);
        if (user)
          reportIncident({
            bookingId,
            userId: user.id,
            type: "camera_stopped",
            severity: "critical",
            message: text(
              "Le flux caméra obligatoire a été interrompu.",
              "The required camera feed was interrupted.",
            ),
          });
      });
    } catch {
      setError(
        text(
          "Caméra et microphone refusés. Autorisez-les dans le navigateur.",
          "Camera and microphone access denied. Allow them in your browser.",
        ),
      );
    }
  }

  async function captureSelfie() {
    if (!faceVideo.current || !cameraReady) return;
    const canvas = document.createElement("canvas");
    canvas.width = faceVideo.current.videoWidth || 640;
    canvas.height = faceVideo.current.videoHeight || 480;
    canvas
      .getContext("2d")
      ?.drawImage(faceVideo.current, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (blob)
      setSelfieFile(
        new File([blob], `selfie-${bookingId}.jpg`, { type: "image/jpeg" }),
      );
  }

  async function sendIdentity(event: React.FormEvent) {
    event.preventDefault();
    if (!documentFile || !selfieFile || !consent)
      return setError(
        text(
          "Document, selfie et consentement sont obligatoires.",
          "Document, selfie and consent are required.",
        ),
      );
    if (new Date(expiresAt) <= new Date())
      return setError(
        text(
          "Le document d’identité doit être valide à la date de l’examen.",
          "The identity document must be valid on the exam date.",
        ),
      );
    const [documentMediaUrl, selfieMediaUrl] = await Promise.all([
      saveLocalMedia(documentFile),
      saveLocalMedia(selfieFile),
    ]);
    const now = new Date().toISOString();
    const result = submitIdentity(bookingId, {
      documentType,
      issuingCountry,
      documentNumber,
      expiresAt,
      documentMediaUrl,
      selfieMediaUrl,
      consentedAt: now,
      submittedAt: now,
      status: "pending_review",
      matchScore: null,
      profileDataMatched: null,
    });
    setError(result.error ?? "");
  }

  async function startDiditVerification() {
    if (!consent)
      return setError(
        text("Votre consentement est obligatoire.", "Your consent is required."),
      );
    setIdentityLaunching(true);
    setError("");
    const response = await fetch("/api/proctoring/identity/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingReference: bookingId,
        documentType,
        issuingCountry,
        consent: true,
      }),
    });
    const payload = (await response.json()) as {
      verificationUrl?: string;
      error?: string;
    };
    if (!response.ok || !payload.verificationUrl) {
      setIdentityLaunching(false);
      return setError(
        payload.error ??
          text(
            "La vérification Didit n’a pas pu démarrer.",
            "Didit verification could not start.",
          ),
      );
    }
    const now = new Date().toISOString();
    submitIdentity(bookingId, {
      documentType,
      issuingCountry,
      documentNumber: "didit-hosted",
      expiresAt: "",
      documentMediaUrl: "didit://hosted",
      selfieMediaUrl: "didit://hosted",
      consentedAt: now,
      submittedAt: now,
      status: "pending_review",
      matchScore: null,
      profileDataMatched: null,
    });
    window.location.assign(payload.verificationUrl);
  }

  async function startScreenShare() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      screenStream.current?.getTracks().forEach((track) => track.stop());
      screenStream.current = stream;
      if (screenVideo.current) screenVideo.current.srcObject = stream;
      setScreenReady(true);
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        setScreenReady(false);
        if (user)
          reportIncident({
            bookingId,
            userId: user.id,
            type: "screen_share_stopped",
            severity: "critical",
            message: text(
              "Le partage d’écran obligatoire a été arrêté.",
              "The required screen share was stopped.",
            ),
          });
      });
    } catch {
      setError(
        text(
          "Le partage d’écran a été annulé. Il est obligatoire pour composer.",
          "Screen sharing was cancelled. It is required to take the exam.",
        ),
      );
    }
  }

  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
      setFullscreenReady(true);
    } catch {
      setError(
        text("Le plein écran n’a pas pu être activé.", "Full screen could not be enabled."),
      );
    }
  }

  function validateTechnicalCheck() {
    const check: TechnicalCheck = {
      camera: cameraReady,
      microphone: Boolean(
        cameraStream.current
          ?.getAudioTracks()
          .some((track) => track.readyState === "live"),
      ),
      screenShare: screenReady,
      fullscreen: Boolean(document.fullscreenElement),
      checkedAt: new Date().toISOString(),
    };
    saveTechnicalCheck(bookingId, check);
    const result = admitCandidate(bookingId, check);
    setError(result.error ?? "");
  }

  if (!booking || !slot || !exam)
    return (
      <RoomMessage
        title={text("Salle introuvable", "Room not found")}
        text={text(
          "Cette invitation n’existe pas ou n’est plus disponible.",
          "This invitation does not exist or is no longer available.",
        )}
      />
    );
  if (!isOwner)
    return (
      <RoomMessage
        title={text("Accès refusé", "Access denied")}
        text={text(
          "Cette invitation appartient à un autre candidat.",
          "This invitation belongs to another candidate.",
        )}
      />
    );
  if (booking.status !== "approved")
    return (
      <RoomMessage
        title={text("Demande en attente", "Request pending")}
        text={text(
          "L’administration doit approuver votre créneau avant l’ouverture du contrôle d’identité.",
          "The administration must approve your slot before identity verification opens.",
        )}
      />
    );
  if (admission?.ejectedAt)
    return (
      <RoomMessage
        title={text("Composition verrouillée", "Exam locked")}
        text={
          (admission.ejectionReason ??
            text(
              "Un incident critique a interrompu la session.",
              "A critical incident interrupted the session.",
            )) +
          " " +
          text(
            "L’examinateur doit procéder à une révision humaine.",
            "The examiner must perform a human review.",
          )
        }
      />
    );

  return (
    <div className="space-y-7">
      <header className="rounded-[28px] border border-green-100 bg-white p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
              {text("Salle", "Room")} {booking.roomCode}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#063D2E]">
              {exam.title}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {new Date(slot.startsAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")} ·{" "}
              {slot.durationMinutes} minutes
            </p>
          </div>
          <span
            className={`rounded-full px-4 py-2 text-xs font-bold ${roomActive ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}
          >
            {roomActive
              ? text("Salle activée", "Room active")
              : text("En attente de l’examinateur", "Waiting for the examiner")}
          </span>
        </div>
      </header>

      {!booking.identity && diditAvailable && (
        <section className="rounded-[28px] border border-green-200 bg-white p-7">
          <div className="flex items-center gap-3">
            <FileBadge2 className="text-[#0B5D3B]" />
            <h2 className="text-2xl font-extrabold text-[#063D2E]">
              {text(
                "1. Vérification d’identité sécurisée",
                "1. Secure identity verification",
              )}
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {text(
              "Didit vérifiera votre pièce, la preuve de vie et la concordance du visage. Vous reviendrez automatiquement dans cette salle après le contrôle.",
              "Didit will verify your document, liveness and facial match. You will automatically return to this room after verification.",
            )}
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-bold">
              Document
              <select
                value={documentType}
                onChange={(event) =>
                  setDocumentType(event.target.value as typeof documentType)
                }
                className="mt-2 h-12 w-full rounded-xl border bg-white px-3"
              >
                <option value="passport">{text("Passeport", "Passport")}</option>
                <option value="national_id">{text("Carte nationale d’identité", "National identity card")}</option>
              </select>
            </label>
            <label className="text-sm font-bold">
              {text("Pays émetteur", "Issuing country")}
              <input
                required
                value={issuingCountry}
                onChange={(event) => setIssuingCountry(event.target.value)}
                className="mt-2 h-12 w-full rounded-xl border px-3"
              />
            </label>
          </div>
          <label className="mt-5 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 h-5 w-5 accent-[#0B5D3B]"
            />
            {text(
              "Je consens au contrôle de mon identité et au traitement biométrique limité nécessaire à la certification.",
              "I consent to identity verification and the limited biometric processing required for certification.",
            )}
          </label>
          <button
            type="button"
            disabled={identityLaunching}
            onClick={startDiditVerification}
            className="mt-5 w-full rounded-full bg-[#F58220] px-6 py-3 font-bold text-white disabled:opacity-60"
          >
            {identityLaunching
              ? text("Ouverture du contrôle…", "Opening verification…")
              : text("Vérifier mon identité avec Didit", "Verify my identity with Didit")}
          </button>
        </section>
      )}

      {!booking.identity && !diditAvailable && (
        <section className="rounded-[28px] border border-green-100 bg-white p-7">
          <div className="flex items-center gap-3">
            <FileBadge2 className="text-[#0B5D3B]" />
            <h2 className="text-2xl font-extrabold text-[#063D2E]">
              {text("1. Vérification d’identité", "1. Identity verification")}
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {text(
              "Joignez un passeport ou une carte nationale valide, puis prenez une photo en direct. Le contrôle local est examiné manuellement ; aucun score biométrique n’est inventé.",
              "Attach a valid passport or national identity card, then take a live photo. Local verification is reviewed manually; no biometric score is fabricated.",
            )}
          </p>
          <form
            onSubmit={sendIdentity}
            className="mt-6 grid gap-4 md:grid-cols-2"
          >
            <label className="text-sm font-bold">
              Document
              <select
                value={documentType}
                onChange={(event) =>
                  setDocumentType(event.target.value as typeof documentType)
                }
                className="mt-2 h-12 w-full rounded-xl border bg-white px-3"
              >
                <option value="passport">{text("Passeport", "Passport")}</option>
                <option value="national_id">{text("Carte nationale d’identité", "National identity card")}</option>
              </select>
            </label>
            <label className="text-sm font-bold">
              {text("Pays émetteur", "Issuing country")}
              <input
                required
                value={issuingCountry}
                onChange={(event) => setIssuingCountry(event.target.value)}
                className="mt-2 h-12 w-full rounded-xl border px-3"
              />
            </label>
            <label className="text-sm font-bold">
              {text("Numéro du document", "Document number")}
              <input
                required
                value={documentNumber}
                onChange={(event) => setDocumentNumber(event.target.value)}
                className="mt-2 h-12 w-full rounded-xl border px-3"
              />
            </label>
            <label className="text-sm font-bold">
              {text("Date d’expiration", "Expiry date")}
              <input
                required
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="mt-2 h-12 w-full rounded-xl border px-3"
              />
            </label>
            <label className="text-sm font-bold md:col-span-2">
              {text("Photo lisible du document", "Readable photo of the document")}
              <input
                required
                accept="image/jpeg,image/png,application/pdf"
                type="file"
                onChange={(event) =>
                  setDocumentFile(event.target.files?.[0] ?? null)
                }
                className="mt-2 block w-full rounded-xl border bg-white p-3"
              />
            </label>
            <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
              <div className="overflow-hidden rounded-2xl bg-[#063D2E]">
                <video
                  ref={faceVideo}
                  autoPlay
                  muted
                  playsInline
                  className="aspect-video w-full object-cover"
                />
              </div>
              <div className="flex flex-col justify-center gap-3">
                <button
                  type="button"
                  onClick={startCamera}
                  className="rounded-full bg-[#0B5D3B] px-5 py-3 font-bold text-white"
                >
                  <Camera className="mr-2 inline" size={18} />
                  {text("Activer caméra + micro", "Enable camera + microphone")}
                </button>
                <button
                  type="button"
                  disabled={!cameraReady}
                  onClick={captureSelfie}
                  className="rounded-full border border-[#0B5D3B] px-5 py-3 font-bold text-[#0B5D3B] disabled:opacity-40"
                >
                  {text("Capturer ma photo", "Capture my photo")}
                </button>
                {selfieFile && (
                  <p className="text-center text-sm font-bold text-green-700">
                    {text("Photo capturée", "Photo captured")}
                  </p>
                )}
              </div>
            </div>
            <label className="md:col-span-2 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1 h-5 w-5 accent-[#0B5D3B]"
              />
              {text(
                "Je consens au contrôle de mon identité, à la surveillance audio-vidéo, au partage d’écran et à la conservation limitée des preuves selon la politique de certification.",
                "I consent to identity verification, audio-video monitoring, screen sharing and limited retention of evidence under the certification policy.",
              )}
            </label>
            <button className="md:col-span-2 rounded-full bg-[#F58220] px-6 py-3 font-bold text-white">
              {text("Transmettre pour vérification", "Submit for verification")}
            </button>
          </form>
        </section>
      )}

      {booking.identity?.status === "pending_review" && (
        <RoomMessage
          title={text("Identité en cours de vérification", "Identity verification in progress")}
          text={text(
            "Un administrateur doit comparer le document, le profil et la photo en direct. Vous recevrez l’accès aux contrôles techniques après validation.",
            "An administrator must compare the document, profile and live photo. You will receive access to the technical checks after approval.",
          )}
        />
      )}
      {booking.identity?.status === "rejected" && (
        <RoomMessage
          title={text("Identité non validée", "Identity not verified")}
          text={text(
            `Le contrôle n’a pas atteint le seuil de ${data.policy.identityThreshold}%. Contactez l’administration pour une révision humaine ou soumettez un document recevable.`,
            `Verification did not reach the ${data.policy.identityThreshold}% threshold. Contact the administration for human review or submit an acceptable document.`,
          )}
        />
      )}

      {identityVerified && !admitted && (
        <section className="rounded-[28px] border border-green-100 bg-white p-7">
          <div className="flex items-center gap-3">
            <MonitorUp className="text-[#0B5D3B]" />
            <h2 className="text-2xl font-extrabold text-[#063D2E]">
              {text("2. Contrôle technique obligatoire", "2. Required technical check")}
            </h2>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            {text(
              "Le navigateur vous demandera chaque autorisation. Sélectionnez l’écran complet pour le partage. Gardez cet onglet et le plein écran ouverts jusqu’à la soumission.",
              "Your browser will request each permission. Select the entire screen for sharing. Keep this tab and full screen open until submission.",
            )}
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="overflow-hidden rounded-2xl bg-[#063D2E]">
              <video
                ref={faceVideo}
                autoPlay
                muted
                playsInline
                className="aspect-video w-full object-cover"
              />
              <div className="flex items-center justify-between p-3 text-xs font-bold text-white">
                <span>
                  <Camera className="mr-1 inline" size={15} />
                  {text("Caméra", "Camera")}
                </span>
                <span>
                  <Mic className="mr-1 inline" size={15} />
                  {text("Micro", "Microphone")}
                </span>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl bg-slate-900">
              <video
                ref={screenVideo}
                autoPlay
                muted
                playsInline
                className="aspect-video w-full object-contain"
              />
              <p className="p-3 text-xs font-bold text-white">
                <MonitorUp className="mr-1 inline" size={15} />
                {text("Écran partagé", "Shared screen")}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <CheckButton
              ok={cameraReady}
              icon={<Camera size={18} />}
              onClick={startCamera}
              label={text("Caméra + micro", "Camera + microphone")}
            />
            <CheckButton
              ok={screenReady}
              icon={<MonitorUp size={18} />}
              onClick={startScreenShare}
              label={text("Partager l’écran", "Share screen")}
            />
            <CheckButton
              ok={fullscreenReady}
              icon={<Maximize size={18} />}
              onClick={enterFullscreen}
              label={text("Plein écran", "Full screen")}
            />
          </div>
          <button
            disabled={
              !roomActive || !cameraReady || !screenReady || !fullscreenReady
            }
            onClick={validateTechnicalCheck}
            className="mt-6 w-full rounded-full bg-[#F58220] px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {roomActive
              ? text("Entrer et commencer l’examen", "Enter and start the exam")
              : text("L’examinateur doit activer la salle", "The examiner must activate the room")}
          </button>
        </section>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800">
          <ShieldAlert className="mr-2 inline" size={18} />
          {error}
        </div>
      )}
      {admitted && booking.attemptId && (
        <RoomMessage
          title={text("Copie déjà soumise", "Exam already submitted")}
          text={
            booking.conductRating ? text(`Votre resultat valide est ${booking.attemptScorePercent ?? 0} %.`, `Your validated result is ${booking.attemptScorePercent ?? 0}%.`) : booking.conductRating === "poor"
              ? text(
                  "Le déroulement a été classé Poor. Une nouvelle réservation respectant le délai de reprise est obligatoire.",
                  "The session was rated Poor. A new booking that respects the retake delay is required.",
                )
              : booking.attemptPassed
              ? text(
                  "Votre note est suffisante. Le certificat reste bloqué jusqu’à l’évaluation Bon ou Passable du surveillant.",
                  "Your score is sufficient. The certificate remains locked until the proctor rates the session Good or Passable.",
                )
              : text(
                  "Cette tentative est terminée. Une nouvelle réservation respectant le délai de reprise est obligatoire.",
                  "This attempt is complete. A new booking that respects the retake delay is required.",
                )
          }
        />
      )}
      {admitted && !booking.attemptId && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#063D2E] p-4 text-white">
            <span className="font-bold">
              <CheckCircle2 className="mr-2 inline" />
              {text("Surveillance active", "Proctoring active")}
            </span>
            <span className="text-sm">
              {criticalCount} {text("incident(s) critique(s)", "critical incident(s)")} · {text("risque", "risk")}{" "}
              {admission?.riskScore ?? 0}/100
              {admission?.reviewRequiredAt
                ? text(" · revue examinateur requise", " · examiner review required")
                : ""}
            </span>
          </div>
          <ExamRunner
            exam={exam}
            questionPool={
              booking.paper?.questions
                ? localizeExamQuestions(booking.paper.questions, locale)
                : localizedStudioBundle?.questions
            }
            bookingId={booking.id}
            paperId={booking.paper?.id}
            attemptNumber={booking.attemptNumber}
          />
        </>
      )}
    </div>
  );
}

function CheckButton({
  ok,
  icon,
  onClick,
  label,
}: {
  ok: boolean;
  icon: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold ${ok ? "bg-green-100 text-green-800" : "border border-[#0B5D3B] text-[#0B5D3B]"}`}
    >
      {ok ? <CheckCircle2 size={18} /> : icon}
      {label}
    </button>
  );
}

function RoomMessage({ title, text }: { title: string; text: string }) {
  const { text: localizedText } = useLanguage();
  return (
    <div className="mx-auto max-w-3xl rounded-[28px] border border-green-100 bg-white p-10 text-center">
      <LockKeyhole className="mx-auto text-[#0B5D3B]" size={42} />
      <h1 className="mt-5 text-3xl font-extrabold text-[#063D2E]">{title}</h1>
      <p className="mt-3 text-slate-600">{text}</p>
      <Link
        href="/dashboard/exams/schedule"
        className="mt-6 inline-flex rounded-full bg-[#0B5D3B] px-6 py-3 font-bold text-white"
      >
        {localizedText("Retour à la planification", "Back to scheduling")}
      </Link>
    </div>
  );
}

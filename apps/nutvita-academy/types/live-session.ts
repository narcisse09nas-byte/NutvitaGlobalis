export type LiveProvider =
  | "jitsi"
  | "zoom"
  | "google_meet"
  | "external";

export type LiveSessionStatus =
  | "scheduled"
  | "live"
  | "completed"
  | "cancelled";

export type LiveSession = {
  id: string;
  organizationId?: string;
  courseSlug?: string;
  moduleSlug?: string;

  title: string;
  description: string;

  provider: LiveProvider;
  roomName?: string;
  externalUrl?: string;

  instructorUserId: string;
  instructorName: string;

  startAt: string;
  endAt: string;
  timezone: string;

  capacity: number;
  status: LiveSessionStatus;

  createdAt: string;
  updatedAt: string;
};

export type LiveRegistration = {
  id: string;
  sessionId: string;
  userId: string;
  fullName: string;
  email: string;
  registeredAt: string;
};

export type LiveAttendance = {
  id: string;
  sessionId: string;
  userId: string;
  fullName: string;
  joinedAt: string;
  leftAt?: string;
  durationSeconds: number;
};

export type LiveChatMessage = {
  id: string;
  sessionId: string;
  userId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export type LiveSessionStore = {
  version: 1;
  sessions: LiveSession[];
  registrations: LiveRegistration[];
  attendance: LiveAttendance[];
  messages: LiveChatMessage[];
};

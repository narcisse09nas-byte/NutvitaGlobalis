import "server-only";
import { createSign } from "node:crypto";

type Participant = { id: string; name: string; email?: string; avatar?: string; moderator?: boolean };

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

export function hasJaasConfig() {
  return Boolean(process.env.JAAS_APP_ID && process.env.JAAS_API_KEY_ID && process.env.JAAS_PRIVATE_KEY);
}

export function createJaasSession(room: string, participant: Participant) {
  const appId = String(process.env.JAAS_APP_ID || "").trim();
  const kid = String(process.env.JAAS_API_KEY_ID || "").trim();
  const privateKey = String(process.env.JAAS_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  if (!appId || !kid || !privateKey) throw new Error("JaaS n'est pas configure sur le serveur.");
  const alias = room.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120);
  if (!alias) throw new Error("Nom de salle invalide.");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", kid, typ: "JWT" };
  const payload = {
    aud: "jitsi", iss: "chat", sub: appId, room: alias, nbf: now - 10, iat: now, exp: now + 600,
    context: {
      room: { regex: false },
      features: { livestreaming: false, recording: false, transcription: false, "outbound-call": false, "sip-outbound-call": false, "file-upload": false },
      user: { id: participant.id, name: participant.name, email: participant.email || "", avatar: participant.avatar || "", moderator: Boolean(participant.moderator) },
    },
  };
  const input = `${encode(header)}.${encode(payload)}`;
  const signer = createSign("RSA-SHA256"); signer.update(input); signer.end();
  return { domain: "8x8.vc", roomName: `${appId}/${alias}`, jwt: `${input}.${signer.sign(privateKey).toString("base64url")}`, expiresAt: new Date((now + 600) * 1000).toISOString() };
}

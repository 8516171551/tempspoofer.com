import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE, type Session } from "./auth";

export async function currentSession(): Promise<Session | null> {
  const jar = await cookies();
  return readSession(jar.get(SESSION_COOKIE)?.value);
}

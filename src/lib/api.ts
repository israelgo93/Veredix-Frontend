// src/lib/api.ts
import { getUserId } from "./utils";
import type { UserSession } from "../types";

// Obtener la URL base desde variables de entorno
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://veredix.app/api/v1/playground";

/**
 * Obtiene las sesiones de un usuario
 */
export async function fetchUserSessions(userId: string): Promise<UserSession[]> {
  if (!userId) return [];
  try {
    const response = await fetch(
      `${API_BASE_URL}/agents/veredix/sessions?user_id=${userId}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch user sessions: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    return [];
  }
}

/**
 * Elimina una sesión de usuario
 */
export async function deleteUserSession(userId: string, sessionId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/agents/veredix/sessions/${sessionId}?user_id=${userId}`,
      {
        method: "DELETE",
      }
    );
    return response.ok;
  } catch (error) {
    console.error("Error deleting session:", error);
    return false;
  }
}

/**
 * Renombra una sesión de usuario
 */
export async function renameUserSession(userId: string, sessionId: string, newTitle: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/agents/veredix/sessions/${sessionId}/rename`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newTitle,
          user_id: userId,
        }),
      }
    );
    return response.ok;
  } catch (error) {
    console.error("Error renaming session:", error);
    return false;
  }
}

/**
 * Carga una sesión específica
 */
export async function loadUserSession(userId: string, chatId: string): Promise<any> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/agents/veredix/sessions/${chatId}?user_id=${userId}`
    );
    if (!response.ok) {
      throw new Error(`Failed to load session: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error loading session:", error);
    throw error;
  }
}

/**
 * Envía un mensaje al agente
 */
export async function sendMessageToAgent(
  message: string,
  sessionId: string | null,
  userId: string | null,
  signal: AbortSignal
): Promise<Response> {
  const formData = new FormData();
  formData.append("message", message);
  formData.append("stream", "true");
  formData.append("monitor", "false");
  formData.append("session_id", sessionId || "");
  formData.append("user_id", userId || getUserId());

  return fetch(`${API_BASE_URL}/agents/veredix/runs`, {
    method: "POST",
    body: formData,
    signal,
  });
}
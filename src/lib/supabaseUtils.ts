import { supabase } from "./supabase"

export interface UserSession {
  id: string
  user_id: string
  session_id: string
  agent_id: string
  title: string
  created_at: string
}

export async function createUserSession(
  userId: string,
  sessionId: string,
  agentId: string,
  title: string,
): Promise<UserSession | null> {
  const { data, error } = await supabase
    .from("user_sessions")
    .insert({
      user_id: userId,
      session_id: sessionId,
      agent_id: agentId,
      title: title,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating user session:", error)
    return null
  }

  return data
}

export async function getUserSessions(userId: string): Promise<UserSession[]> {
  // Solo buscar sesiones si el userId es un UUID válido
  if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(userId)) {
    console.log("Invalid user ID, not fetching sessions")
    return []
  }

  const { data, error } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching user sessions:", error)
    return []
  }

  return data
}

export async function deleteUserSession(userId: string, sessionId: string): Promise<boolean> {
  const { error } = await supabase.from("user_sessions").delete().eq("user_id", userId).eq("session_id", sessionId)

  if (error) {
    console.error("Error deleting user session:", error)
    return false
  }

  return true
}

export async function renameUserSession(userId: string, sessionId: string, newTitle: string): Promise<boolean> {
  const { error } = await supabase
    .from("user_sessions")
    .update({ title: newTitle })
    .eq("user_id", userId)
    .eq("session_id", sessionId)

  if (error) {
    console.error("Error renaming user session:", error)
    return false
  }

  return true
}


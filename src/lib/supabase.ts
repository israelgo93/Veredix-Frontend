import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials. Please check your environment variables.")
}

export const supabase = createClient(supabaseUrl!, supabaseKey!, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Add logging for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log(`Supabase auth event: ${event}`)
  if (event === "SIGNED_IN") {
    console.log("User signed in:", session?.user?.id)
  } else if (event === "SIGNED_OUT") {
    console.log("User signed out")
    // Clear any stored session data
    try {
      sessionStorage.removeItem("session_id")
      sessionStorage.removeItem("userId")
    } catch (error) {
      console.error("Error clearing session:", error)
    }
  }
})

// Test Supabase connection
supabase
  .from("user_sessions")
  .select("count", { count: "exact" })
  .then(({ count, error }) => {
    if (error) {
      console.error("Error connecting to Supabase:", error)
    } else {
      console.log("Successfully connected to Supabase. Number of user sessions:", count)
    }
  })


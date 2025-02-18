import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://racgppnnhkyulfdeeuel.supabase.co"
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhY2dwcG5uaGt5dWxmZGVldWVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgwODA1NjksImV4cCI6MjA1MzY1NjU2OX0.M_GlFYZCqhR33mZJSm6z8ldLleJgMI8oFWY1Khdf7mg"

export const supabase = createClient(supabaseUrl, supabaseKey)


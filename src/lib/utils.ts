import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRandomUserId() {
  const timestamp = new Date().getTime()
  const random = Math.floor(Math.random() * 1000)
  return `user${timestamp}${random}`
}

export function getUserId() {
  try {
    let userId = sessionStorage.getItem("userId")
    if (!userId) {
      userId = generateRandomUserId()
      sessionStorage.setItem("userId", userId)
    }
    return userId
  } catch (error) {
    // Fallback if sessionStorage is not available
    return generateRandomUserId()
  }
}

export function setUserIdInSession(userId: string) {
  try {
    sessionStorage.setItem("userId", userId)
  } catch (error) {
    console.error("Error setting userId in session:", error)
  }
}


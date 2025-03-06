// src/contexts/AuthContext.tsx
"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setIsAuthenticated(!!user)
      setLoading(false)
    }
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setIsAuthenticated(!!session?.user)
      setLoading(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // Nueva función para solicitar restablecimiento de contraseña
  const resetPassword = async (email: string) => {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://veredix.app";
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/update-password`,
      });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error al solicitar restablecimiento de contraseña:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Error desconocido" 
      };
    }
  }

  // Nueva función para actualizar la contraseña
  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error("Error al actualizar la contraseña:", error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Error desconocido" 
      }
    }
  }

  // Nueva función para reenviar el correo de verificación
  const resendVerificationEmail = async (email: string) => {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://veredix.app";
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${siteUrl}/auth/login`,
        },
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error al reenviar correo de verificación:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Error desconocido" 
      };
    }
  }

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    loading,
    resetPassword,
    updatePassword,
    resendVerificationEmail,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
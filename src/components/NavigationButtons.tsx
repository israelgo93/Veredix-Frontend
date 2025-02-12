"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "./ui/button"

export function NavigationButtons() {
  const pathname = usePathname()
  const isLoginPage = pathname === "/auth/login"

  return (
    <Link href={isLoginPage ? "/auth/signup" : "/auth/login"}>
      <Button variant="outline" size="sm">
        {isLoginPage ? "Crear cuenta" : "Iniciar sesión"}
      </Button>
    </Link>
  )
}
// src/app/auth/update-password/page.tsx
import { UpdatePasswordForm } from "@/components/auth/update-password-form"

export default function UpdatePasswordPage() {
  return (
    <main className="flex flex-col min-h-screen bg-gradient-to-br from-background to-muted/50">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-gray-950">
          <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        </div>
        <UpdatePasswordForm />
      </div>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        <p>&copy; 2025 Chat Legal IA. Todos los derechos reservados.</p>
      </footer>
    </main>
  )
}
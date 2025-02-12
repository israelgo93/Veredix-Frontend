//home/phiuser/phi/chat-legal/src/app/auth/login/page.tsx
import { LoginForm } from "../../../components/auth/login-form"

export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-4 min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background to-muted/50">
      <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-gray-950 [background:radial-gradient(125%_125%_at_50%_10%,#fff_40%,#63e_100%)] dark:[background:radial-gradient(125%_125%_at_50%_10%,#000_40%,#63e_100%)]" />
      <LoginForm />
    </main>
  )
}


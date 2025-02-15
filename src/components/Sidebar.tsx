import { Menu, ChevronsLeft, LogIn, UserPlus, LogOut, Home, Users, BookOpen, MessageSquare } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./theme-toggle"

const NewChatIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className="icon-xl-heavy"
  >
    <path
      d="M15.6729 3.91287C16.8918 2.69392 18.8682 2.69392 20.0871 3.91287C21.3061 5.13182 21.3061 7.10813 20.0871 8.32708L14.1499 14.2643C13.3849 15.0293 12.3925 15.5255 11.3215 15.6785L9.14142 15.9899C8.82983 16.0344 8.51546 15.9297 8.29289 15.7071C8.07033 15.4845 7.96554 15.1701 8.01005 14.8586L8.32149 12.6785C8.47449 11.6075 8.97072 10.615 9.7357 9.85006L15.6729 3.91287ZM18.6729 5.32708C18.235 4.88918 17.525 4.88918 17.0871 5.32708L11.1499 11.2643C10.6909 11.7233 10.3932 12.3187 10.3014 12.9613L10.1785 13.8215L11.0386 13.6986C11.6812 13.6068 12.2767 13.3091 12.7357 12.8501L18.6729 6.91287C19.1108 6.47497 19.1108 5.76499 18.6729 5.32708ZM11 3.99929C11.0004 4.55157 10.5531 4.99963 10.0008 5.00007C9.00227 5.00084 8.29769 5.00827 7.74651 5.06064C7.20685 5.11191 6.88488 5.20117 6.63803 5.32695C6.07354 5.61457 5.6146 6.07351 5.32698 6.63799C5.19279 6.90135 5.10062 7.24904 5.05118 7.8542C5.00078 8.47105 5 9.26336 5 10.4V13.6C5 14.7366 5.00078 15.5289 5.05118 16.1457C5.10062 16.7509 5.19279 17.0986 5.32698 17.3619C5.6146 17.9264 6.07354 18.3854 6.63803 18.673C6.90138 18.8072 7.24907 18.8993 7.85424 18.9488C8.47108 18.9992 9.26339 19 10.4 19H13.6C14.7366 19 15.5289 18.9992 16.1458 18.9488C16.7509 18.8993 17.0986 18.8072 17.362 18.673C17.9265 18.3854 18.3854 17.9264 18.673 17.3619C18.7988 17.1151 18.8881 16.7931 18.9393 16.2535C18.9917 15.7023 18.9991 14.9977 18.9999 13.9992C19.0003 13.4469 19.4484 12.9995 20.0007 13C20.553 13.0004 21.0003 13.4485 20.9999 14.0007C20.9991 14.9789 20.9932 15.7808 20.9304 16.4426C20.8664 17.116 20.7385 17.7136 20.455 18.2699C19.9757 19.2107 19.2108 19.9756 18.27 20.455C17.6777 20.7568 17.0375 20.8826 16.3086 20.9421C15.6008 21 14.7266 21 13.6428 21H10.3572C9.27339 21 8.39925 21 7.69138 20.9421C6.96253 20.8826 6.32234 20.7568 5.73005 20.455C4.78924 19.9756 4.02433 19.2107 3.54497 18.2699C3.24318 17.6776 3.11737 17.0374 3.05782 16.3086C2.99998 15.6007 2.99999 14.7266 3 13.6428V10.3572C2.99999 9.27337 2.99998 8.39922 3.05782 7.69134C3.11737 6.96249 3.24318 6.3223 3.54497 5.73001C4.02433 4.7892 4.78924 4.0243 5.73005 3.54493C6.28633 3.26149 6.88399 3.13358 7.55735 3.06961C8.21919 3.00673 9.02103 3.00083 9.99922 3.00007C10.5515 2.99964 10.9996 3.447 11 3.99929Z"
      fill="currentColor"
    ></path>
  </svg>
)

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  toggleSidebar: () => void
  isMobile: boolean
  isAuthenticated?: boolean
  userName?: string
  onNewChat?: () => void
  onLogout?: () => void
  onLogin?: () => void
}

export function Sidebar({
  isOpen,
  onClose,
  toggleSidebar,
  isMobile,
  isAuthenticated,
  userName,
  onNewChat,
  onLogout,
  onLogin,
}: SidebarProps) {
  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat()
    }
  }

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Menú</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={isMobile ? onClose : toggleSidebar}
          aria-label="Cerrar barra lateral"
          className="transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <ChevronsLeft className="h-5 w-5" />
        </Button>
      </div>
      <div className="p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleNewChat}
          className="w-full rounded-full px-3 py-2 border border-gray-300 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
        >
          <NewChatIcon />
          <span>Nuevo chat</span>
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        <Link href="/" className="flex items-center gap-2 hover:text-primary transition-colors">
          <Home className="w-4 h-4" />
          <span>Inicio</span>
        </Link>
        <Link href="/community" className="flex items-center gap-2 hover:text-primary transition-colors">
          <Users className="w-4 h-4" />
          <span>Comunidad</span>
        </Link>
        <Link href="/library" className="flex items-center gap-2 hover:text-primary transition-colors">
          <BookOpen className="w-4 h-4" />
          <span>Biblioteca</span>
        </Link>
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase mb-2 text-muted-foreground">Chats recientes</h3>
          <ul className="space-y-2">
            {["Document translation", "Abogado labor laws", "Invalid input", "Python xml api", "Inpaint input"].map(
              (chat, index) => (
                <li key={index}>
                  <Link
                    href={`/chat/${chat.toLowerCase().replace(/ /g, "-")}`}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{chat}</span>
                  </Link>
                </li>
              ),
            )}
          </ul>
        </div>
      </nav>
      <div className="p-4 border-t border-border">
        {!isAuthenticated ? (
          <div className="flex flex-col gap-2">
            <Link href="/auth/login">
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-full px-3 py-2 border border-gray-300 text-sm bg-background text-foreground hover:bg-accent transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Iniciar Sesión</span>
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-full px-3 py-2 border border-gray-300 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Registrarse</span>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="w-full rounded-full px-3 py-2 border border-gray-300 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </Button>
          </div>
        )}
      </div>
      <div className="p-4 text-xs text-center text-muted-foreground">© 2025 Chat Legal IA</div>
    </>
  )

  if (isMobile) {
    return (
      <div className={`fixed inset-0 z-50 ${isOpen ? "" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={onClose}
        />
        <div
          className={`fixed inset-y-0 left-0 w-64 bg-background shadow-lg transform transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {sidebarContent}
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className={`fixed top-0 left-0 h-full w-16 bg-background shadow-lg z-50 flex flex-col justify-between transition-all duration-300 ${
          isOpen ? "hidden" : "translate-x-0"
        }`}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={isOpen ? "Cerrar barra lateral" : "Abrir barra lateral"}
          className="m-2 transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          {isOpen ? <ChevronsLeft className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNewChat}
          aria-label="Nuevo chat"
          className="m-2 transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <NewChatIcon />
        </Button>
        <div className="m-2 mt-auto">
          <ThemeToggle />
        </div>
      </div>
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-background shadow-lg z-40 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </div>
    </>
  )
}


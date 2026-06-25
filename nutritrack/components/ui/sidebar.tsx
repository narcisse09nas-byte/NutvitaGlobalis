
"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Globe, PanelLeft } from "lucide-react"

import { cn } from "@/nutritrack/lib/utils"
import { Button } from "@/nutritrack/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/nutritrack/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/nutritrack/components/ui/tooltip"

interface SidebarContextProps {
  isOpen: boolean
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
  isMobile: boolean
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

export const useSidebar = () => {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [isMobile, setIsMobile] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(!isMobile)

  React.useEffect(() => {
    const checkDevice = () => {
        const mobile = window.matchMedia("(max-width: 768px)").matches;
        setIsMobile(mobile);
        setIsOpen(!mobile); // Open by default on desktop, closed on mobile
    };
    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => {
        window.removeEventListener("resize", checkDevice);
    };
  }, []);
  
  const contextValue = React.useMemo(() => ({ isOpen, setIsOpen, isMobile }), [isOpen, setIsOpen, isMobile]);

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </SidebarContext.Provider>
  )
}

export const Sidebar = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  const { isMobile } = useSidebar()

  if (isMobile) {
     return (
      <Sheet>
        <SheetContent side="left" className="p-0 w-72 bg-sidebar text-sidebar-foreground border-r-0" showCloseButton={false}>
          <div className="flex flex-col h-full">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const { isOpen } = useSidebar()
  return (
    <aside
      className={cn(
        "hidden md:flex flex-col transition-all duration-300 ease-in-out bg-sidebar text-sidebar-foreground",
        isOpen ? "w-64" : "w-16",
        className
      )}
    >
      {children}
    </aside>
  )
}

export const SidebarTrigger = ({ className, ...props }: React.ComponentProps<typeof Button>) => {
  const { isOpen, setIsOpen, isMobile } = useSidebar();
  
  const triggerContent = (
      <PanelLeft className="h-5 w-5" />
  );

  if (isMobile) {
    return (
       <SheetTrigger asChild className={cn("text-white", className)}>
            <Button variant="ghost" size="icon" {...props}>
                {triggerContent}
            </Button>
       </SheetTrigger>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsOpen(!isOpen)}
      className={cn("text-white", className)}
      {...props}
    >
      {triggerContent}
    </Button>
  );
};


export const SidebarHeader = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return <div className={cn("border-b border-sidebar-border", className)}>{children}</div>
}

export const SidebarContent = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return <div className={cn("flex-grow overflow-y-auto", className)}>{children}</div>
}

export const SidebarFooter = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return <div className={cn("p-4 border-t border-sidebar-border", className)}>{children}</div>
}

export const SidebarMenu = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return <ul className={cn("space-y-1 p-2", className)}>{children}</ul>
}

export const SidebarMenuItem = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return <li className={cn("", className)}>{children}</li>
}

export const SidebarMenuLabel = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  const { isOpen } = useSidebar()
  if (!isOpen) return null;
  return <h3 className={cn("px-2 pt-4 pb-1 text-xs font-semibold text-sidebar-foreground/50 border-t border-sidebar-border/50 first:border-t-0", className)}>{children}</h3>
}

const sidebarMenuButtonVariants = cva(
  "flex items-center w-full text-left rounded-md p-2 transition-colors",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        reporting: "bg-[var(--sidebar-reporting-active)] text-[var(--sidebar-reporting-active-foreground)]",
        operations: "bg-[var(--sidebar-operations-active)] text-[var(--sidebar-operations-active-foreground)]",
        settings: "bg-[var(--sidebar-settings-active)] text-[var(--sidebar-settings-active-foreground)]",
        feedback: "bg-[var(--sidebar-feedback-active)] text-[var(--sidebar-feedback-active-foreground)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type SidebarMenuButtonProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    isActive?: boolean
    tooltip?: string
    href: string
    group?: 'reporting' | 'operations' | 'settings' | 'feedback'
}

export const SidebarMenuButton = React.forwardRef<HTMLAnchorElement, SidebarMenuButtonProps>(
    ({ children, href, isActive, tooltip, group, ...props }, ref) => {
    const { isOpen } = useSidebar()
    const Comp = "a"

    const childArray = React.Children.toArray(children);
    const icon = childArray[0];
    const label = isOpen ? childArray[1] : null;

    const variant = isActive ? group : 'default';

    const buttonContent = (
        <Comp
        ref={ref}
        href={href}
        className={cn(
            sidebarMenuButtonVariants({ variant }),
            "justify-start gap-3"
        )}
        {...props}
        >
        {icon}
        {label && <span className="transition-opacity duration-200">{label}</span>}
        </Comp>
    )

    if (!isOpen) {
        return (
        <Tooltip>
            <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
            <TooltipContent side="right">
            <p>{tooltip}</p>
            </TooltipContent>
        </Tooltip>
        )
    }

    return buttonContent
})
SidebarMenuButton.displayName = "SidebarMenuButton"


export const SidebarInset = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    return (
      <div className={cn("flex-1 flex flex-col", className)}>
        {children}
      </div>
    )
  }

export function LanguageSwitcher() {
  // This component is now a placeholder.
  return null;
}



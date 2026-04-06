import type { ReactNode } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

interface AuthPageShellProps {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthPageShell({
  title,
  description,
  children,
  footer,
}: AuthPageShellProps) {
  return (
    <main className="min-h-screen bg-muted/20 px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <div className="flex w-full flex-col gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center"
              aria-label="Ir al login"
            >
              <span className="sr-only">Aiderbrand</span>
              <img
                src="/logo_light.png"
                alt=""
                aria-hidden="true"
                className="block w-[220px] max-w-full dark:hidden"
              />
              <img
                src="/logo_dark.png"
                alt=""
                aria-hidden="true"
                className="hidden w-[220px] max-w-full dark:block"
              />
            </Link>
            <p className="text-sm text-muted-foreground">
              There&apos;s a better way
            </p>
          </div>

          <Card className="border-border/80 bg-background/95 shadow-sm backdrop-blur">
            <CardHeader className="gap-3 text-center">
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {children}
              {footer}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

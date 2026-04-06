"use client"

import { useMemo, useState } from "react"
import { CalendarIcon, X } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"
import { es } from "react-day-picker/locale"

interface DatePickerProps {
  id?: string
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

function parseDateValue(value?: string) {
  if (!value) {
    return undefined
  }

  const [year, month, day] = value.split("-").map(Number)

  if (!year || !month || !day) {
    return undefined
  }

  return new Date(year, month - 1, day, 12)
}

function formatDateValue(date?: Date) {
  if (!date) {
    return ""
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function formatDateLabel(date?: Date) {
  if (!date) {
    return ""
  }

  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Seleccioná una fecha",
  disabled = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selectedDate = useMemo(() => parseDateValue(value), [value])

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "flex-1 justify-start px-2.5 text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon data-icon="inline-start" aria-hidden="true" />
            <span className="truncate">
              {selectedDate ? formatDateLabel(selectedDate) : placeholder}
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate}
            onSelect={(date) => {
              onChange(formatDateValue(date))
              setOpen(false)
            }}
            captionLayout="dropdown"
            locale={es}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {selectedDate ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          onClick={() => onChange("")}
          aria-label="Limpiar fecha"
        >
          <X aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  )
}

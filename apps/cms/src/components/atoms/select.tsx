import { Check, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { Select as BaseSelect } from "@base-ui-components/react/select";
import { cn } from "@three-acts/utils";
import { inputVariants, popupClass } from "./styles";

export type SelectOption = { label: string; value: string; icon?: ReactNode };

type SelectProps = {
  className?: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  value: string;
};

// Base UI Select associates itself with a surrounding Field label automatically.
export function Select({ className, disabled, onValueChange, options, value }: SelectProps) {
  return (
    <BaseSelect.Root disabled={disabled} items={options} onValueChange={(next) => onValueChange((next as string) ?? "")} value={value}>
      <BaseSelect.Trigger className={cn(inputVariants(), "flex items-center justify-between gap-2 text-left", className)}>
        <BaseSelect.Value className="truncate">
          {(selected: string) => {
            const match = options.find((option) => option.value === selected);

            if (match) {
              return <span className="inline-flex min-w-0 items-center gap-1.5">{match.icon}<span className="truncate">{match.label}</span></span>;
            }

            // A value the option list doesn't know about (e.g. imported data)
            // still needs to be visible, rather than rendering an empty trigger.
            return selected ? <span className="text-cms-subtle">{selected}</span> : "";
          }}
        </BaseSelect.Value>
        <BaseSelect.Icon className="shrink-0 text-cms-subtle">
          <ChevronsUpDown size={13} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className="z-60 outline-none" sideOffset={4}>
          <BaseSelect.Popup className={cn(popupClass, "max-h-(--available-height) min-w-(--anchor-width) overflow-auto p-1 text-field")}>
            {options.map((option, index) => (
              <BaseSelect.Item
                className="flex cursor-default items-center justify-between gap-2 rounded-cms-sm px-2 py-1.5 outline-none data-highlighted:bg-cms-raised"
                // Index-qualified: callers can't always guarantee unique, non-empty
                // values (an ignore sentinel, a blank header), so `value` alone
                // can't be trusted as a React key.
                key={`${index}-${option.value}`}
                value={option.value}
              >
                <BaseSelect.ItemText className="inline-flex min-w-0 items-center gap-1.5">{option.icon}<span className="truncate">{option.label}</span></BaseSelect.ItemText>
                <BaseSelect.ItemIndicator className="shrink-0 text-cms-accent">
                  <Check size={13} />
                </BaseSelect.ItemIndicator>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}

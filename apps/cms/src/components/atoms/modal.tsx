import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Dialog } from "@base-ui-components/react/dialog";
import { cn } from "@three-acts/utils";
import { BareIconButton } from "./bare-icon-button";
import { panelHeaderClass, popupClass } from "./styles";

type ModalProps = {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function Modal({ children, className, footer, onClose, open, title }: ModalProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-cms-scrim/70" />
        <Dialog.Popup
          className={cn(
            popupClass,
            "fixed left-1/2 top-1/2 z-50 flex max-h-modal-max-h w-140 max-w-viewport -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden bg-cms-bg",
            className
          )}
        >
          <header className={cn(panelHeaderClass, "justify-between")}>
            <Dialog.Title className="text-ui-lg font-semibold">{title}</Dialog.Title>
            <BareIconButton aria-label="Close" onClick={onClose}>
              <X size={15} />
            </BareIconButton>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 text-ui">
            {children}
          </div>
          {footer ? <footer className="flex shrink-0 justify-end gap-1.5 border-t border-cms-line px-3 py-2.5">{footer}</footer> : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

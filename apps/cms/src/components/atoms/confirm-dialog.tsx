import { AlertDialog } from "@base-ui-components/react/alert-dialog";
import { cn } from "@three-acts/utils";
import { Button } from "./button";
import { popupClass } from "./styles";

type ConfirmDialogProps = {
  confirmLabel?: string;
  description: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
};

/**
 * Base UI AlertDialog for destructive confirmations. Unlike `Modal` (Dialog) it
 * traps focus inside the popup and cannot be dismissed by clicking away, so a
 * delete is always an explicit choice. No `initialFocus` override is set, so
 * Base UI's default lands focus on the first focusable control — Cancel, not
 * the danger button. This is the only place a solid danger fill appears — the
 * weight belongs at the point of no return.
 */
export function ConfirmDialog({ confirmLabel = "Delete", description, onConfirm, onOpenChange, open, title }: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-cms-scrim/70" />
        <AlertDialog.Popup
          className={cn(
            popupClass,
            "fixed left-1/2 top-1/2 z-50 w-95 max-w-viewport -translate-x-1/2 -translate-y-1/2 bg-cms-bg p-4"
          )}
        >
          <AlertDialog.Title className="m-0 text-ui-lg font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mb-4 mt-2 text-ui leading-5 text-cms-muted">{description}</AlertDialog.Description>
          <div className="flex justify-end gap-1.5">
            <AlertDialog.Close render={<Button />}>Cancel</AlertDialog.Close>
            <Button
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              variant="danger"
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

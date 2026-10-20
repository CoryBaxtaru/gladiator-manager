import { useEffect, useId, useRef, type ReactNode } from "react";

interface ModalProps {
  children: ReactNode;
  className?: string;
  /** Called on Escape (and on a backdrop click when closeOnBackdrop is set). Omit it
   * for a decision the player has to actually make -- Escape then does nothing. */
  onClose?: () => void;
  /** Only for low-stakes dialogs (menus, pickers, confirmations), never for results
   * or required decisions, which a stray click shouldn't be able to dismiss. */
  closeOnBackdrop?: boolean;
  /** Accessible name when the dialog has no heading of its own (otherwise its first
   * h2/h3 names it). */
  label?: string;
}

/**
 * Every modal in the game goes through this: a native <dialog> opened with
 * showModal(), which gives a real focus trap, inert page behind it, top-layer
 * stacking and Escape handling for free. React state still decides whether it's
 * mounted -- the dialog never closes itself.
 */
export function Modal({ children, className, onClose, closeOnBackdrop = false, label }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const unmountingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const headingId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    unmountingRef.current = false;
    if (!dialog.open) dialog.showModal();

    const heading = label ? null : dialog.querySelector("h2, h3");
    if (heading) {
      if (!heading.id) heading.id = headingId;
      dialog.setAttribute("aria-labelledby", heading.id);
    }

    return () => {
      unmountingRef.current = true;
      if (dialog.open) dialog.close();
    };
  }, [headingId, label]);

  return (
    <dialog
      ref={dialogRef}
      className="modal-dialog"
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onCloseRef.current?.();
      }}
      // Browsers can force-close a dialog after repeated cancels; a required
      // decision must stay on screen until React unmounts it.
      onClose={() => {
        const dialog = dialogRef.current;
        if (!unmountingRef.current && dialog && !dialog.open) dialog.showModal();
      }}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onCloseRef.current?.();
      }}
    >
      <div className={`modal ${className ?? ""}`}>{children}</div>
    </dialog>
  );
}

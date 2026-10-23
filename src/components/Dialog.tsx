import { useEffect, useRef, type ReactNode } from 'react';

interface DialogProps {
  title: string;
  children: ReactNode;
  /** Buttons, laid out side by side. */
  actions: ReactNode;
  /** Escape / backdrop click. Without it the dialog can only be left through its actions. */
  onCancel?: () => void;
  /** Makes the dialog a form: Enter in a field, or a submit button, calls this. */
  onSubmit?: () => void;
}

/** A modal built on the native <dialog>, which gives focus trapping and Escape handling for free. */
export function Dialog({ title, children, actions, onCancel, onSubmit }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const body = (
    <>
      <h2 id="dialog-title" className="dialog__title">
        {title}
      </h2>
      <div className="dialog__message">{children}</div>
      <div className="dialog__actions">{actions}</div>
    </>
  );

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel?.();
      }}
      // A click whose target is the <dialog> itself landed on the backdrop.
      onClick={(event) => event.target === event.currentTarget && onCancel?.()}
    >
      {onSubmit ? (
        <form
          className="dialog__body"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {body}
        </form>
      ) : (
        <div className="dialog__body">{body}</div>
      )}
    </dialog>
  );
}

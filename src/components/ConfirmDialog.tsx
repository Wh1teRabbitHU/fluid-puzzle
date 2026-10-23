import { Dialog } from './Dialog';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog
      title={title}
      onCancel={onCancel}
      actions={
        <>
          <button className="menu__button" onClick={onCancel} autoFocus>
            Cancel
          </button>
          <button className="menu__button menu__button--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </Dialog>
  );
}

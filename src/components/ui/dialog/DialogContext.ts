import { createContext, useContext } from 'react';

interface DialogContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
}

export const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialogContext() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialogContext must be used within a Dialog');
  }
  return context;
}

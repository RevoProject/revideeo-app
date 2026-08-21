import type { AlertModalVariant } from './AlertModal';

interface AlertModalState {
  open: boolean;
  title: string;
  message: string;
  variant: AlertModalVariant;
}

let _setAlertState: ((state: AlertModalState) => void) | null = null;

export const registerAlertSetter = (setter: (state: AlertModalState) => void): void => {
  _setAlertState = setter;
};

export const unregisterAlertSetter = (): void => {
  _setAlertState = null;
};

export const showAlert = (title: string, message: string, variant: AlertModalVariant = 'error'): void => {
  _setAlertState?.({ open: true, title, message, variant });
};

/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

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

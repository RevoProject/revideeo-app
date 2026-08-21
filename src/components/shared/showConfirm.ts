interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

let _confirmSetter: ((opts: ConfirmOptions & { resolve: (v: boolean) => void }) => void) | null = null;

export const registerConfirmSetter = (setter: (opts: ConfirmOptions & { resolve: (v: boolean) => void }) => void): void => {
  _confirmSetter = setter;
};

export const unregisterConfirmSetter = (): void => {
  _confirmSetter = null;
};

export const showConfirm = (options: ConfirmOptions): Promise<boolean> => {
  if (!_confirmSetter) return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    _confirmSetter!({ ...options, resolve });
  });
};

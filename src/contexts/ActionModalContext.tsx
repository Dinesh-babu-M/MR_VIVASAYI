import React, { createContext, useContext, useState, useCallback } from 'react';
import { ActionProgressModal, ActionModalOptions } from '../components/common/ActionProgressModal';
import { ConfirmationModal, ConfirmModalOptions } from '../components/common/ConfirmationModal';

export type { ActionModalOptions } from '../components/common/ActionProgressModal';
export type { ConfirmModalOptions } from '../components/common/ConfirmationModal';

interface ActionModalContextValue {
  showActionModal: (options: ActionModalOptions) => void;
  closeActionModal: () => void;
  showConfirmModal: (options: ConfirmModalOptions) => void;
  closeConfirmModal: () => void;
  confirmAndExecute: <T>(
    confirmOptions: Omit<ConfirmModalOptions, 'onConfirm'>,
    actionOptions: ActionModalOptions,
    actionFn?: () => Promise<T> | T
  ) => void;
  executeAction: <T>(
    options: ActionModalOptions,
    actionFn?: () => Promise<T> | T
  ) => Promise<T | void>;
}

const ActionModalContext = createContext<ActionModalContextValue | undefined>(undefined);

export const ActionModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalOptions, setModalOptions] = useState<ActionModalOptions>({});

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmModalOptions | null>(null);

  const showActionModal = useCallback((options: ActionModalOptions) => {
    setModalOptions(options);
    setIsOpen(true);
  }, []);

  const closeActionModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const showConfirmModal = useCallback((options: ConfirmModalOptions) => {
    setConfirmOptions(options);
    setIsConfirmOpen(true);
  }, []);

  const closeConfirmModal = useCallback(() => {
    setIsConfirmOpen(false);
    setConfirmOptions(null);
  }, []);

  const confirmAndExecute = useCallback(
    <T,>(
      confirmOpts: Omit<ConfirmModalOptions, 'onConfirm'>,
      actionOpts: ActionModalOptions,
      actionFn?: () => Promise<T> | T
    ) => {
      showConfirmModal({
        ...confirmOpts,
        onConfirm: async () => {
          showActionModal({
            ...actionOpts,
            onComplete: async () => {
              if (actionFn) {
                try {
                  await actionFn();
                } catch (e) {
                  console.error(e);
                }
              }
              if (actionOpts.onComplete) {
                actionOpts.onComplete();
              }
            }
          });
        }
      });
    },
    [showConfirmModal, showActionModal]
  );

  const executeAction = useCallback(
    async <T,>(
      options: ActionModalOptions,
      actionFn?: () => Promise<T> | T
    ): Promise<T | void> => {
      return new Promise<T | void>((resolve, reject) => {
        showActionModal({
          ...options,
          onComplete: async () => {
            try {
              if (actionFn) {
                const res = await actionFn();
                if (options.onComplete) options.onComplete();
                resolve(res);
              } else {
                if (options.onComplete) options.onComplete();
                resolve();
              }
            } catch (err) {
              reject(err);
            }
          }
        });
      });
    },
    [showActionModal]
  );

  return (
    <ActionModalContext.Provider
      value={{
        showActionModal,
        closeActionModal,
        showConfirmModal,
        closeConfirmModal,
        confirmAndExecute,
        executeAction
      }}
    >
      {children}
      <ActionProgressModal
        isOpen={isOpen}
        options={modalOptions}
        onClose={closeActionModal}
      />
      <ConfirmationModal
        isOpen={isConfirmOpen}
        options={confirmOptions}
        onClose={closeConfirmModal}
      />
    </ActionModalContext.Provider>
  );
};

export const useActionModal = (): ActionModalContextValue => {
  const context = useContext(ActionModalContext);
  if (!context) {
    throw new Error('useActionModal must be used within an ActionModalProvider');
  }
  return context;
};

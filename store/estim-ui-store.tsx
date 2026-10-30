'use client';

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
}

interface EstimUiState {
  toasts: ToastMessage[];
  activeModal: string | null;
  modalPayload: unknown;
  activeDrawerId: string | null;
}

type EstimUiAction =
  | { type: 'PUSH_TOAST'; toast: ToastMessage }
  | { type: 'DISMISS_TOAST'; id: string }
  | { type: 'OPEN_MODAL'; modal: string; payload?: unknown }
  | { type: 'CLOSE_MODAL' }
  | { type: 'OPEN_DRAWER'; drawerId: string }
  | { type: 'CLOSE_DRAWER' };

const initialState: EstimUiState = {
  toasts: [],
  activeModal: null,
  modalPayload: null,
  activeDrawerId: null,
};

function uiReducer(state: EstimUiState, action: EstimUiAction): EstimUiState {
  switch (action.type) {
    case 'PUSH_TOAST': {
      // Keep up to 3 most recent toasts to prevent notification clutter
      const filtered = state.toasts.filter((t) => t.id !== action.toast.id);
      return {
        ...state,
        toasts: [action.toast, ...filtered].slice(0, 3),
      };
    }
    case 'DISMISS_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };
    case 'OPEN_MODAL':
      return {
        ...state,
        activeModal: action.modal,
        modalPayload: action.payload ?? null,
      };
    case 'CLOSE_MODAL':
      return {
        ...state,
        activeModal: null,
        modalPayload: null,
      };
    case 'OPEN_DRAWER':
      return {
        ...state,
        activeDrawerId: action.drawerId,
      };
    case 'CLOSE_DRAWER':
      return {
        ...state,
        activeDrawerId: null,
      };
    default:
      return state;
  }
}

export interface EstimUiContextValue extends EstimUiState {
  pushToast: (input: {
    title: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
  }) => string;
  dismissToast: (id: string) => void;
  openModal: (modal: string, payload?: unknown) => void;
  closeModal: () => void;
  openDrawer: (drawerId: string) => void;
  closeDrawer: () => void;
  toast: {
    success: (title: string, description?: string) => string;
    error: (title: string, description?: string) => string;
    warning: (title: string, description?: string) => string;
    info: (title: string, description?: string) => string;
  };
}

const EstimUiContext = createContext<EstimUiContextValue | undefined>(undefined);

export function EstimUiProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(uiReducer, initialState);

  const dismissToast = useCallback((id: string) => {
    dispatch({ type: 'DISMISS_TOAST', id });
  }, []);

  const pushToast = useCallback(
    ({
      title,
      description,
      variant = 'info',
      duration,
    }: {
      title: string;
      description?: string;
      variant?: ToastVariant;
      duration?: number;
    }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      dispatch({
        type: 'PUSH_TOAST',
        toast: { id, title, description, variant, duration },
      });
      return id;
    },
    [],
  );

  const openModal = useCallback((modal: string, payload?: unknown) => {
    dispatch({ type: 'OPEN_MODAL', modal, payload });
  }, []);

  const closeModal = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL' });
  }, []);

  const openDrawer = useCallback((drawerId: string) => {
    dispatch({ type: 'OPEN_DRAWER', drawerId });
  }, []);

  const closeDrawer = useCallback(() => {
    dispatch({ type: 'CLOSE_DRAWER' });
  }, []);

  const toastHelpers = useMemo(
    () => ({
      success: (title: string, description?: string) =>
        pushToast({ title, description, variant: 'success' }),
      error: (title: string, description?: string) =>
        pushToast({ title, description, variant: 'error' }),
      warning: (title: string, description?: string) =>
        pushToast({ title, description, variant: 'warning' }),
      info: (title: string, description?: string) =>
        pushToast({ title, description, variant: 'info' }),
    }),
    [pushToast],
  );

  const value = useMemo<EstimUiContextValue>(
    () => ({
      ...state,
      pushToast,
      dismissToast,
      openModal,
      closeModal,
      openDrawer,
      closeDrawer,
      toast: toastHelpers,
    }),
    [state, pushToast, dismissToast, openModal, closeModal, openDrawer, closeDrawer, toastHelpers],
  );

  return <EstimUiContext.Provider value={value}>{children}</EstimUiContext.Provider>;
}

export function useEstimUi(): EstimUiContextValue {
  const context = useContext(EstimUiContext);
  if (!context) {
    throw new Error('useEstimUi must be used within an EstimUiProvider');
  }
  return context;
}

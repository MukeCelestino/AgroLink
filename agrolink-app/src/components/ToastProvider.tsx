import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';

import { EcoColors, EcoFonts } from '../constants/ecoTheme';

// react-native-web's Alert.alert() is a documented no-op — it does nothing
// at all in a browser. Since this app targets web (GitHub Pages) as much as
// native, every Alert.alert(title, message) call in the app was silently
// invisible on web. This is the cross-platform replacement: same
// (title, message) shape, but backed by an in-app banner that actually
// renders everywhere.

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastState {
  id: number;
  title: string;
  message?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showAlert: (title: string, message?: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// Most call sites don't pass a variant explicitly (they're straight
// Alert.alert(title, message) swaps), so we colorize by sniffing the title —
// covers the existing "Error"/"Could not ..."/"Missing ..." vs
// "Success"/"... submitted"/"Approved" conventions already used everywhere.
const ERROR_HINTS = /error|failed|missing|could not|denied|too much/i;
const SUCCESS_HINTS = /success|saved|submitted|approved|created|updated|logged in/i;

function inferVariant(title: string): ToastVariant {
  if (ERROR_HINTS.test(title)) return 'error';
  if (SUCCESS_HINTS.test(title)) return 'success';
  return 'info';
}

const AUTO_DISMISS_MS = 4500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const showAlert = useCallback((title: string, message?: string, variant?: ToastVariant) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    idRef.current += 1;
    setToast({ id: idRef.current, title, message, variant: variant || inferVariant(title) });
    timerRef.current = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
  }, []);

  const variant = toast?.variant || 'info';
  const accent =
    variant === 'error' ? '#ef4444' : variant === 'success' ? EcoColors.lime : EcoColors.sky;
  const icon = variant === 'error' ? 'alert-circle' : variant === 'success' ? 'check-circle' : 'info';

  return (
    <ToastContext.Provider value={{ showAlert }}>
      {children}
      {toast && (
        <View style={[styles.wrap, { top: insets.top + 12 }]} pointerEvents="box-none">
          <Pressable
            style={[styles.card, { borderLeftColor: accent }]}
            onPress={dismiss}
          >
            <Feather name={icon} size={18} color={accent} />
            <View style={styles.textCol}>
              <Text style={styles.title}>{toast.title}</Text>
              {toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}
            </View>
          </Pressable>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
    paddingHorizontal: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    maxWidth: 420,
    width: '100%',
    backgroundColor: EcoColors.cardBgActive,
    borderWidth: 1,
    borderColor: EcoColors.borderStrong,
    borderLeftWidth: 4,
    borderRadius: 16,
    padding: 14,
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(0,0,0,0.35)' },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      },
    }),
  },
  textCol: { flex: 1 },
  title: { fontFamily: EcoFonts.bodyBold, fontSize: 14, color: EcoColors.text },
  message: { fontFamily: EcoFonts.body, fontSize: 12, color: EcoColors.muted, marginTop: 3 },
});

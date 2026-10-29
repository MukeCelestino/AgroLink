import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { loginUser, getAuthErrorMessage, resetPassword } from '../services/authService';
import { useToast } from '../components/ToastProvider';
import { EcoColors, EcoFonts } from '../constants/ecoTheme';

export default function LoginScreen() {
  const { showAlert } = useToast();
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetSending, setResetSending] = useState(false);

  const handleLogin = async () => {
    try {
      await loginUser(email, password);
      showAlert('Success', 'Logged in successfully', 'success');
      router.replace('/dashboard');
    } catch (error: any) {
      showAlert('Login failed', getAuthErrorMessage(error), 'error');
    }
  };

  // Shows the same "check your inbox" outcome whether or not the email is
  // actually registered — never reveal which emails have accounts.
  const handleResetPassword = async () => {
    if (!email) {
      showAlert('Missing email', 'Enter the email address on your account.', 'error');
      return;
    }
    setResetSending(true);
    try {
      await resetPassword(email);
      showAlert(
        'Check your inbox',
        "If an account exists for that email, we've sent a password reset link.",
        'success'
      );
      setMode('login');
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') {
        showAlert(
          'Check your inbox',
          "If an account exists for that email, we've sent a password reset link.",
          'success'
        );
        setMode('login');
      } else {
        showAlert('Could not send reset email', getAuthErrorMessage(error), 'error');
      }
    } finally {
      setResetSending(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.glowTopLeft} pointerEvents="none">
        <LinearGradient
          colors={['rgba(184,243,74,0.16)', 'rgba(184,243,74,0)']}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={styles.glowBottomRight} pointerEvents="none">
        <LinearGradient
          colors={['rgba(37,91,52,0.35)', 'rgba(37,91,52,0)']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              entering={FadeInUp.duration(450)}
              style={styles.card}
            >
              <View style={styles.logoRow}>
                <View style={styles.logoBadge}>
                  <MaterialCommunityIcons
                    name="leaf"
                    size={22}
                    color={EcoColors.onLime}
                  />
                </View>
                <Text style={styles.logoText}>
                  Agro<Text style={{ color: EcoColors.lime }}>Link</Text>
                </Text>
              </View>

              {mode === 'login' ? (
                <>
                  <Text style={styles.eyebrow}>Welcome back</Text>
                  <Text style={styles.heading}>Sign in to your market.</Text>
                  <Text style={styles.subtext}>
                    Your produce, partners, and deliveries are waiting.
                  </Text>

                  <View style={styles.form}>
                    <Field label="Email address" icon="mail">
                      <TextInput
                        style={styles.input}
                        placeholder="you@example.com"
                        placeholderTextColor={EcoColors.placeholder}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                      />
                    </Field>

                    <Field label="Password" icon="lock">
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor={EcoColors.placeholder}
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                      />
                    </Field>

                    <Pressable onPress={() => setMode('reset')} style={styles.forgotLink}>
                      <Text style={styles.forgotLinkText}>Forgot password?</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.submitButton,
                        pressed && styles.submitButtonPressed,
                      ]}
                      onPress={handleLogin}
                    >
                      <Text style={styles.submitButtonText}>Sign in</Text>
                    </Pressable>
                  </View>

                  <View style={styles.footerRow}>
                    <Text style={styles.footerText}>New to AgroLink? </Text>
                    <Pressable onPress={() => router.push('/register')}>
                      <Text style={styles.footerLink}>Create an account</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.eyebrow}>Account recovery</Text>
                  <Text style={styles.heading}>Reset your password.</Text>
                  <Text style={styles.subtext}>
                    Enter your account email and we'll send you a reset link.
                  </Text>

                  <View style={styles.form}>
                    <Field label="Email address" icon="mail">
                      <TextInput
                        style={styles.input}
                        placeholder="you@example.com"
                        placeholderTextColor={EcoColors.placeholder}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                        editable={!resetSending}
                      />
                    </Field>

                    <Pressable
                      style={({ pressed }) => [
                        styles.submitButton,
                        pressed && styles.submitButtonPressed,
                        resetSending && styles.submitButtonDisabled,
                      ]}
                      onPress={handleResetPassword}
                      disabled={resetSending}
                    >
                      <Text style={styles.submitButtonText}>
                        {resetSending ? 'Sending…' : 'Send reset link'}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.footerRow}>
                    <Pressable onPress={() => setMode('login')}>
                      <Text style={styles.footerLink}>Back to sign in</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldWrap}>
        <Feather
          name={icon}
          size={16}
          color={EcoColors.lime}
          style={styles.fieldIcon}
        />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: EcoColors.void,
  },
  glowTopLeft: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    overflow: 'hidden',
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 40,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: EcoColors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoText: {
    fontFamily: EcoFonts.headingExtraBold,
    fontSize: 20,
    color: EcoColors.text,
  },
  eyebrow: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: EcoColors.lime,
    textAlign: 'center',
  },
  heading: {
    fontFamily: EcoFonts.headingExtraBold,
    fontSize: 30,
    color: EcoColors.text,
    textAlign: 'center',
    marginTop: 10,
  },
  subtext: {
    fontFamily: EcoFonts.body,
    fontSize: 15,
    color: EcoColors.muted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 21,
  },
  form: {
    marginTop: 32,
    gap: 18,
  },
  fieldLabel: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 13,
    color: EcoColors.cream,
    marginBottom: 8,
  },
  fieldWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  fieldIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  input: {
    fontFamily: EcoFonts.body,
    color: EcoColors.text,
    backgroundColor: EcoColors.fieldBg,
    borderWidth: 1,
    borderColor: EcoColors.line,
    borderRadius: 14,
    paddingVertical: 14,
    paddingLeft: 44,
    paddingRight: 16,
    fontSize: 15,
  },
  submitButton: {
    backgroundColor: EcoColors.lime,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  submitButtonPressed: {
    backgroundColor: EcoColors.limeDeep,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 15,
    color: EcoColors.onLime,
  },
  forgotLink: {
    alignSelf: 'flex-end',
  },
  forgotLinkText: {
    fontFamily: EcoFonts.bodySemiBold,
    fontSize: 13,
    color: EcoColors.lime,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontFamily: EcoFonts.body,
    fontSize: 14,
    color: EcoColors.muted,
  },
  footerLink: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 14,
    color: EcoColors.lime,
    textDecorationLine: 'underline',
  },
});

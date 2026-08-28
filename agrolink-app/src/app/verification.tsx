import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { auth } from '../firebase/config';
import { getUserProfile } from '../services/authService';
import {
  VerifiableRole,
  VerificationRequest,
  PickedDocument,
  pickImageDocument,
  pickFileDocument,
  submitVerificationRequest,
  subscribeToMyVerificationRequests,
} from '../services/verificationService';
import { ROLE_LABELS } from '../store/MarketStore';
import { EcoColors, EcoFonts } from '../constants/ecoTheme';

const VERIFIABLE_ROLES: VerifiableRole[] = ['seller', 'transporter'];

export default function VerificationScreen() {
  const [uid, setUid] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);

  const [openRole, setOpenRole] = useState<VerifiableRole | null>(null);
  const [files, setFiles] = useState<PickedDocument[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }
    setUid(user.uid);
    getUserProfile(user.uid)
      .then((profile: any) => {
        if (profile?.personalInfo) {
          setUserName(`${profile.personalInfo.firstName} ${profile.personalInfo.lastName}`.trim());
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeToMyVerificationRequests(uid, setRequests);
    return unsubscribe;
  }, [uid]);

  // Most recent request per role — drives the status pill and whether
  // re-applying is offered (only once the last attempt was rejected).
  const latestByRole = useMemo(() => {
    const map: Partial<Record<VerifiableRole, VerificationRequest>> = {};
    for (const req of requests) {
      const existing = map[req.role];
      if (!existing || new Date(req.createdAt) > new Date(existing.createdAt)) {
        map[req.role] = req;
      }
    }
    return map;
  }, [requests]);

  const resetForm = () => {
    setFiles([]);
    setNotes('');
    setOpenRole(null);
  };

  const handleAddImage = async () => {
    try {
      const picked = await pickImageDocument();
      if (picked) setFiles((prev) => [...prev, picked]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleAddFile = async () => {
    try {
      const picked = await pickFileDocument();
      if (picked) setFiles((prev) => [...prev, picked]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (role: VerifiableRole) => {
    if (!uid) return;
    if (files.length === 0) {
      Alert.alert('Add a document', 'Attach at least one photo or file before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await submitVerificationRequest(uid, userName || 'AgroLink user', role, files, notes);
      Alert.alert('Request submitted', 'An admin will review your documents shortly.');
      resetForm();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={EcoColors.lime} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={EcoColors.muted} />
          </Pressable>
          <Text style={styles.title}>Get verified</Text>
          <View style={{ width: 20 }} />
        </View>

        <Text style={styles.intro}>
          Sellers and transporters must be verified before they can list produce or
          accept deliveries. Upload the relevant documents and an admin will review
          your request.
        </Text>

        {VERIFIABLE_ROLES.map((role) => {
          const latest = latestByRole[role];
          const isOpen = openRole === role;
          const canRequest = !latest || latest.status === 'rejected';

          return (
            <View key={role} style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>{ROLE_LABELS[role]}</Text>
                <StatusPill status={latest?.status} />
              </View>

              {latest?.status === 'rejected' && latest.reviewerNotes ? (
                <Text style={styles.rejectionReason}>Reason: {latest.reviewerNotes}</Text>
              ) : null}

              {latest?.status === 'pending' ? (
                <Text style={styles.pendingHint}>
                  Submitted {new Date(latest.createdAt).toLocaleDateString()} · waiting on an
                  admin to review your documents.
                </Text>
              ) : null}

              {canRequest && !isOpen && (
                <Pressable
                  style={styles.requestButton}
                  onPress={() => {
                    resetForm();
                    setOpenRole(role);
                  }}
                >
                  <Text style={styles.requestButtonText}>
                    {latest?.status === 'rejected' ? 'Re-apply' : 'Request verification'}
                  </Text>
                </Pressable>
              )}

              {canRequest && isOpen && (
                <View style={styles.form}>
                  <Text style={styles.fieldLabel}>Documents</Text>
                  {files.length > 0 && (
                    <View style={styles.fileList}>
                      {files.map((file, index) => (
                        <View key={`${file.uri}-${index}`} style={styles.fileRow}>
                          <Feather
                            name={file.type === 'image' ? 'image' : 'file-text'}
                            size={14}
                            color={EcoColors.lime}
                          />
                          <Text style={styles.fileName} numberOfLines={1}>
                            {file.name}
                          </Text>
                          <Pressable onPress={() => handleRemoveFile(index)}>
                            <Feather name="x" size={14} color={EcoColors.muted} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={styles.pickerRow}>
                    <Pressable style={styles.pickerButton} onPress={handleAddImage}>
                      <Feather name="camera" size={14} color={EcoColors.lime} />
                      <Text style={styles.pickerButtonText}>Add photo</Text>
                    </Pressable>
                    <Pressable style={styles.pickerButton} onPress={handleAddFile}>
                      <Feather name="paperclip" size={14} color={EcoColors.lime} />
                      <Text style={styles.pickerButtonText}>Add file</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.fieldLabel}>Notes (optional)</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Anything the reviewer should know"
                    placeholderTextColor={EcoColors.placeholder}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    editable={!submitting}
                  />

                  <View style={styles.formActions}>
                    <Pressable style={styles.cancelButton} onPress={resetForm} disabled={submitting}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                      onPress={() => handleSubmit(role)}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator color={EcoColors.onLime} />
                      ) : (
                        <Text style={styles.submitButtonText}>Submit for review</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusPill({ status }: { status?: string }) {
  const label =
    status === 'approved'
      ? 'Verified'
      : status === 'pending'
        ? 'Pending review'
        : status === 'rejected'
          ? 'Rejected'
          : 'Not requested';
  const color =
    status === 'approved'
      ? EcoColors.lime
      : status === 'pending'
        ? EcoColors.amber
        : status === 'rejected'
          ? '#fca5a5'
          : EcoColors.muted;
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: EcoColors.void },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: EcoColors.void,
  },
  container: { flexGrow: 1, padding: 20, paddingBottom: 40, gap: 14 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { fontFamily: EcoFonts.headingBold, fontSize: 18, color: EcoColors.text },
  intro: {
    fontFamily: EcoFonts.body,
    fontSize: 13,
    color: EcoColors.muted,
    lineHeight: 19,
    marginBottom: 6,
  },
  card: {
    backgroundColor: EcoColors.cardBg,
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
    borderRadius: 20,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { fontFamily: EcoFonts.bodyBold, fontSize: 15, color: EcoColors.text },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  pillText: { fontFamily: EcoFonts.bodyBold, fontSize: 11 },
  rejectionReason: {
    fontFamily: EcoFonts.body,
    fontSize: 12,
    color: '#fca5a5',
    marginTop: 10,
  },
  pendingHint: {
    fontFamily: EcoFonts.body,
    fontSize: 12,
    color: EcoColors.muted,
    marginTop: 10,
  },
  requestButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: EcoColors.lime,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
  },
  requestButtonText: { fontFamily: EcoFonts.bodyBold, fontSize: 13, color: EcoColors.lime },
  form: { marginTop: 14, gap: 10 },
  fieldLabel: {
    fontFamily: EcoFonts.bodyBold,
    fontSize: 12,
    color: EcoColors.cream,
  },
  fileList: { gap: 6 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: EcoColors.cardBgActive,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  fileName: { flex: 1, fontFamily: EcoFonts.body, fontSize: 12, color: EcoColors.text },
  pickerRow: { flexDirection: 'row', gap: 10 },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: EcoColors.borderStrong,
    backgroundColor: EcoColors.cardBgActive,
    borderRadius: 12,
    paddingVertical: 10,
  },
  pickerButtonText: { fontFamily: EcoFonts.bodyBold, fontSize: 12, color: EcoColors.lime },
  notesInput: {
    fontFamily: EcoFonts.body,
    color: EcoColors.text,
    backgroundColor: EcoColors.fieldBg,
    borderWidth: 1,
    borderColor: EcoColors.line,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
  },
  cancelButtonText: { fontFamily: EcoFonts.bodyBold, fontSize: 13, color: EcoColors.muted },
  submitButton: {
    flex: 2,
    backgroundColor: EcoColors.lime,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontFamily: EcoFonts.bodyBold, fontSize: 13, color: EcoColors.onLime },
});

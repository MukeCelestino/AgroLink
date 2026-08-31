import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Feather from '@expo/vector-icons/Feather';

import { auth } from '../../firebase/config';
import { getUserProfile } from '../../services/authService';
import {
  VerificationRequest,
  getVerificationRequest,
  reviewVerificationRequest,
} from '../../services/verificationService';
import { ROLE_LABELS } from '../../store/MarketStore';
import { useToast } from '../../components/ToastProvider';
import { EcoColors, EcoFonts } from '../../constants/ecoTheme';

export default function AdminVerificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showAlert } = useToast();

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reviewerId, setReviewerId] = useState('');
  const [reviewerName, setReviewerName] = useState('');

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [applicant, setApplicant] = useState<any>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [deciding, setDeciding] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/login');
      return;
    }
    getUserProfile(user.uid)
      .then((profile: any) => {
        if (profile?.isAdmin === true) {
          setIsAdmin(true);
          setReviewerId(user.uid);
          setReviewerName(
            profile.personalInfo
              ? `${profile.personalInfo.firstName} ${profile.personalInfo.lastName}`.trim()
              : 'Admin'
          );
        } else {
          router.replace('/dashboard');
        }
      })
      .finally(() => setCheckingAccess(false));
  }, []);

  useEffect(() => {
    if (!isAdmin || !id) return;
    loadRequest();
  }, [isAdmin, id]);

  const loadRequest = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const req = await getVerificationRequest(id);
      setRequest(req);
      if (req) {
        const profile = await getUserProfile(req.userId);
        setApplicant(profile);
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load request.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (approve: boolean) => {
    if (!request) return;
    if (!approve && !reviewerNotes.trim()) {
      showAlert('Add a reason', 'Let the applicant know why the request was rejected.', 'error');
      return;
    }
    setDeciding(approve ? 'approve' : 'reject');
    try {
      await reviewVerificationRequest(request, {
        approve,
        reviewerId,
        reviewerName,
        reviewerNotes: reviewerNotes.trim(),
      });
      showAlert(
        approve ? 'Approved' : 'Rejected',
        `${request.userName} has been notified.`,
        'success'
      );
      router.replace('/admin');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to submit decision.', 'error');
    } finally {
      setDeciding(null);
    }
  };

  if (checkingAccess || !isAdmin || loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={EcoColors.lime} />
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.emptyText}>This request no longer exists.</Text>
        <Pressable onPress={() => router.replace('/admin')}>
          <Text style={styles.backLink}>Back to requests</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const alreadyDecided = request.status !== 'pending';

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.replace('/admin')}>
            <Feather name="arrow-left" size={20} color={EcoColors.muted} />
          </Pressable>
          <Text style={styles.title}>Review request</Text>
          <View style={{ width: 20 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.applicantName}>{request.userName}</Text>
          <Text style={styles.applicantMeta}>
            Requesting {ROLE_LABELS[request.role]} access
          </Text>
          {applicant?.email ? <Text style={styles.applicantMeta}>{applicant.email}</Text> : null}
          {applicant?.phoneNumber ? (
            <Text style={styles.applicantMeta}>{applicant.phoneNumber}</Text>
          ) : null}
          {applicant?.personalInfo ? (
            <Text style={styles.applicantMeta}>
              {[applicant.personalInfo.city, applicant.personalInfo.province, applicant.personalInfo.country]
                .filter(Boolean)
                .join(', ')}
            </Text>
          ) : null}
          <Text style={styles.applicantMeta}>
            Submitted {new Date(request.createdAt).toLocaleString()}
          </Text>
        </View>

        {request.notes ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Applicant notes</Text>
            <Text style={styles.notesText}>{request.notes}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Documents ({request.documents.length})</Text>
          <View style={styles.docGrid}>
            {request.documents.map((docItem, index) => (
              <Pressable
                key={docItem.path}
                style={styles.docTile}
                onPress={() => WebBrowser.openBrowserAsync(docItem.url)}
              >
                {docItem.type === 'image' ? (
                  <Image source={{ uri: docItem.url }} style={styles.docImage} />
                ) : (
                  <View style={styles.docFilePlaceholder}>
                    <Feather name="file-text" size={22} color={EcoColors.lime} />
                  </View>
                )}
                <Text style={styles.docName} numberOfLines={1}>
                  {docItem.name || `Document ${index + 1}`}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {alreadyDecided ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Decision</Text>
            <Text style={styles.notesText}>
              {request.status === 'approved' ? 'Approved' : 'Rejected'} by{' '}
              {request.reviewedByName || 'an admin'} on{' '}
              {request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : ''}
            </Text>
            {request.reviewerNotes ? (
              <Text style={styles.notesText}>Note: {request.reviewerNotes}</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Decision notes</Text>
            <Text style={styles.helperText}>Required if you reject this request.</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Reason, or any note for the applicant"
              placeholderTextColor={EcoColors.placeholder}
              value={reviewerNotes}
              onChangeText={setReviewerNotes}
              multiline
              editable={deciding === null}
            />
            <View style={styles.decisionRow}>
              <Pressable
                style={[styles.rejectButton, deciding !== null && styles.buttonDisabled]}
                onPress={() => handleDecision(false)}
                disabled={deciding !== null}
              >
                {deciding === 'reject' ? (
                  <ActivityIndicator color="#fca5a5" />
                ) : (
                  <Text style={styles.rejectButtonText}>Reject</Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.approveButton, deciding !== null && styles.buttonDisabled]}
                onPress={() => handleDecision(true)}
                disabled={deciding !== null}
              >
                {deciding === 'approve' ? (
                  <ActivityIndicator color={EcoColors.onLime} />
                ) : (
                  <Text style={styles.approveButtonText}>Approve</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: EcoColors.void },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: EcoColors.void,
    gap: 10,
  },
  container: { flexGrow: 1, padding: 20, paddingBottom: 40, gap: 14 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontFamily: EcoFonts.headingBold, fontSize: 18, color: EcoColors.text },
  emptyText: { fontFamily: EcoFonts.body, fontSize: 14, color: EcoColors.muted },
  backLink: { fontFamily: EcoFonts.bodyBold, fontSize: 14, color: EcoColors.lime },
  card: {
    backgroundColor: EcoColors.cardBg,
    borderWidth: 1,
    borderColor: EcoColors.borderSubtle,
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  applicantName: { fontFamily: EcoFonts.headingBold, fontSize: 17, color: EcoColors.text },
  applicantMeta: { fontFamily: EcoFonts.body, fontSize: 13, color: EcoColors.muted },
  sectionTitle: { fontFamily: EcoFonts.bodyBold, fontSize: 14, color: EcoColors.text },
  helperText: { fontFamily: EcoFonts.body, fontSize: 11, color: EcoColors.muted },
  notesText: { fontFamily: EcoFonts.body, fontSize: 13, color: EcoColors.cream, lineHeight: 19 },
  docGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  docTile: { width: 96 },
  docImage: {
    width: 96,
    height: 96,
    borderRadius: 14,
    backgroundColor: EcoColors.cardBgActive,
  },
  docFilePlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 14,
    backgroundColor: EcoColors.cardBgActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docName: {
    fontFamily: EcoFonts.body,
    fontSize: 10,
    color: EcoColors.muted,
    marginTop: 4,
  },
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
  decisionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  rejectButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  rejectButtonText: { fontFamily: EcoFonts.bodyBold, fontSize: 13, color: '#fca5a5' },
  approveButton: {
    flex: 1,
    backgroundColor: EcoColors.lime,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  approveButtonText: { fontFamily: EcoFonts.bodyBold, fontSize: 13, color: EcoColors.onLime },
  buttonDisabled: { opacity: 0.7 },
});

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';
import { ApiServices } from '../api/client';
import { AppStorage, StorageKeys } from '../storage';

export const ChatScreen = ({ route, navigation }: any) => {
  const [coachCode, setCoachCode] = useState('');
  const [coachMessages, setCoachMessages] = useState<any[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [coachInfo, setCoachInfo] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const scrollRef = useRef<ScrollView>(null);

  // If we came from CoachDashboard, we have a clientId
  const isCoachMode = route?.params?.clientId ? true : false;
  const clientTargetId = route?.params?.clientId;
  const clientTargetName = route?.params?.clientName;

  const loadMessages = async () => {
    const u = await AppStorage.get(StorageKeys.USER);
    if (!u) return;
    setUser(u);

    try {
      if (isCoachMode) {
        // Coach chatting with client
        const m = await ApiServices.getMessages(u.user_id, clientTargetId);
        if (m && m.messages) setCoachMessages(m.messages);
        await ApiServices.markMessagesRead(u.user_id, clientTargetId);
      } else {
        // Client side
        const c = await ApiServices.getCoach(u.user_id);
        if (c && c.data) {
          setCoachInfo(c.data);
          const targetCoachId = c.data.coach_id || c.data.user_id;
          const m = await ApiServices.getMessages(u.user_id, targetCoachId);
          if (m && m.messages) setCoachMessages(m.messages);
          await ApiServices.markMessagesRead(u.user_id, targetCoachId);
        }
      }
    } catch (e) {
      console.log('Error loading messages:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMessages();
      const interval = setInterval(loadMessages, 10000);
      return () => clearInterval(interval);
    }, [isCoachMode, clientTargetId])
  );

  const handleLinkCoach = async () => {
    if (!coachCode) {
      Alert.alert('Error', 'Please enter a coach invitation code');
      return;
    }
    try {
      const res = await ApiServices.linkCoach(user.user_id, coachCode);
      if (res.success) {
        Alert.alert('Success', 'Coach linked successfully!');
        loadMessages();
      } else {
        Alert.alert('Link Failed', res.message || 'Invalid coach code');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to link coach');
    }
  };

  const handleSend = async () => {
    if (!inputMsg.trim() || !user) return;
    const text = inputMsg;
    setInputMsg('');

    // Send to Coach or Client
    const targetId = isCoachMode ? clientTargetId : (coachInfo?.coach_id || coachInfo?.user_id);
    if (!targetId) {
      Alert.alert('Error', 'No trainer linked. Please link a trainer first.');
      return;
    }

    const msgType = isCoachMode ? 'suggestion' : 'message';
    const newMsg = {
      sender_id: user.user_id,
      content: text,
      msg_type: msgType,
      timestamp: new Date().toISOString()
    };

    setCoachMessages(prev => [...prev, newMsg]);
    try {
      await ApiServices.sendMessage(user.user_id, targetId, text, msgType);
    } catch (e) {
      console.log('Send message error:', e);
    }
  };

  const currentMessages = coachMessages;

  return (
    <LinearGradient colors={[Colors.bgRadialCore, Colors.bgMain]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 4 }}>
            <Text style={{ color: Colors.blueLight, fontSize: 12, fontWeight: '700' }}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isCoachMode ? `Client ${clientTargetName}` : coachInfo ? `Coach ${coachInfo.name}` : '← Coach Offline'}
          </Text>
          <Text style={styles.headerSub}>
            {isCoachMode ? 'Connected' : coachInfo ? 'Trainer linked' : 'No trainer linked'}
          </Text>
        </View>

        {/* CONTENT */}
        <View style={styles.contentArea}>
          {!coachInfo && !isCoachMode ? (
            <ScrollView contentContainerStyle={styles.unlinkedScroll}>
              <GlassCard style={styles.unlinkedCard}>
                <Text style={styles.handEmoji}>🤝</Text>
                <Text style={styles.unlinkedTitle}>Connect with a Personal Trainer</Text>
                <Text style={styles.unlinkedSub}>
                  Enter your coach's invitation code to link accounts. Your coach will be able to review your workouts, risk levels, and send personalized recommendations.
                </Text>

                <View style={styles.codeBox}>
                  <Text style={styles.codeLabel}>COACH INVITATION CODE</Text>
                  <TextInput
                    style={styles.codeInput}
                    placeholder="E.G. A4F8B3"
                    placeholderTextColor={Colors.textTertiary}
                    value={coachCode}
                    onChangeText={setCoachCode}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity onPress={handleLinkCoach} activeOpacity={0.8} style={[styles.linkBtn, { backgroundColor: Colors.blue }]}>
                    <Text style={styles.linkBtnText}>LINK TRAINER</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            </ScrollView>
          ) : (
            <View style={styles.chatArea}>
              <ScrollView
                contentContainerStyle={styles.msgList}
                ref={scrollRef}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
              >
                {currentMessages.map((m, i) => {
                  const isSent = m.sender_id === user?.user_id;
                  const isSuggestion = m.msg_type === 'suggestion';
                  return (
                    <View
                      key={m._id || i}
                      style={[
                        styles.bubble,
                        isSent ? styles.bubbleUser : styles.bubbleOther,
                        isSuggestion && !isSent && styles.bubbleSuggestion
                      ]}
                    >
                      {isSuggestion && !isSent && (
                        <Text style={styles.suggestionLabel}>COACH SUGGESTION</Text>
                      )}
                      <Text style={styles.bubbleText}>{m.content}</Text>
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.inputBar}>
                <TextInput
                  style={styles.msgInput}
                  placeholder="Type a message..."
                  placeholderTextColor={Colors.textTertiary}
                  value={inputMsg}
                  onChangeText={setInputMsg}
                  multiline
                />
                <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
                  <Text style={styles.sendBtnText}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  headerSub: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  contentArea: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  unlinkedScroll: { paddingBottom: 100 },
  unlinkedCard: { alignItems: 'center', padding: 20 },
  handEmoji: { fontSize: 50, marginBottom: 16 },
  unlinkedTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 10 },
  unlinkedSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  codeBox: { width: '100%', marginTop: 8 },
  codeLabel: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, marginBottom: 6 },
  codeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: Colors.glassBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 14,
  },
  linkBtn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  linkBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  chatArea: { flex: 1, paddingBottom: 20 },
  msgList: { paddingVertical: 12 },
  bubble: { padding: 12, borderRadius: 14, maxWidth: '80%', marginBottom: 8 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: Colors.blue },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.08)' },
  bubbleSuggestion: { borderColor: Colors.yellow, borderWidth: 1, backgroundColor: 'rgba(255, 214, 10, 0.05)' },
  suggestionLabel: { fontSize: 9, fontWeight: '800', color: Colors.yellow, marginBottom: 4 },
  bubbleText: { color: '#FFF', fontSize: 14 },
  inputBar: { flexDirection: 'row', gap: 8, paddingVertical: 8 },
  msgInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: Colors.glassBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    color: Colors.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: Colors.blue,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: { color: '#FFF', fontWeight: '800' },
});

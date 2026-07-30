import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';
import { ApiServices } from '../api/client';
import { AppStorage, StorageKeys } from '../storage';
import { PLANS, DayPlan } from '../constants/plans';

export const DashboardScreen = ({ navigation }: any) => {
  const [profile, setProfile] = useState<any>(null);
  const [latestResult, setLatestResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [coachInfo, setCoachInfo] = useState<any>(null);
  const [coachCode, setCoachCode] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const user = await AppStorage.get(StorageKeys.USER);
    if (!user) return;

    try {
      const p = await ApiServices.getProfile(user.user_id);
      if (p && p.data) {
        setProfile(p.data);
        await AppStorage.set(StorageKeys.PROFILE, p.data);
      }

      const h = await ApiServices.getHistory(user.user_id);
      if (h && h.data) {
        setHistory(h.data);
        if (h.data.length > 0) {
          setLatestResult(h.data[0]);
        }
      }

      const c = await ApiServices.getCoach(user.user_id);
      if (c && c.data) {
        setCoachInfo(c.data);
      } else {
        setCoachInfo(null);
      }
    } catch (err) {
      console.log('Dashboard load error:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleLinkCoach = async () => {
    if (!coachCode.trim()) return;
    const user = await AppStorage.get(StorageKeys.USER);
    try {
      const res = await ApiServices.linkCoach(user.user_id, coachCode);
      if (res.success) {
        Alert.alert('Success', res.message);
        setCoachCode('');
        loadData();
      } else {
        Alert.alert('Error', res.message || 'Link failed');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to link coach');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const name = profile?.name || 'Anes md';
  const weight = profile?.weight || 75;
  const goalWeight = profile?.goal_weight || 68;
  const initials = name ? name.substring(0, 2).toUpperCase() : 'MG';

  const riskLabel = latestResult?.risk_label || 'SAFE ZONE';
  const probs = latestResult?.probabilities || [0.94, 0.04, 0.02];
  const lowPct = Math.round(probs[0] * 100);
  const modPct = Math.round(probs[1] * 100);
  const highPct = Math.round(probs[2] * 100);

  // Advanced Metrics
  const lowRiskDays = history.filter(h => {
    const p = h.probabilities || [0.33, 0.33, 0.33];
    const s = p[0] * 0 + p[1] * 50 + p[2] * 100;
    return s < 30;
  }).length;
  const streak = Math.max(lowRiskDays, 1);

  const hrVal = latestResult?.avg_heart_rate || 120;
  const intVal = latestResult?.avg_intensity || 5;
  const recIndex = Math.max(Math.min(100 - Math.round((hrVal - 60) * 0.15 + (intVal - 5) * 3), 98), 55);

  const riskLevel = String(latestResult?.risk_level ?? '0');
  const prefEx = latestResult?.exercise || 'Mixed';
  const planKey = `${riskLevel}-${prefEx}`;
  const activePlan = PLANS[planKey] || PLANS['0-Mixed'];
  const todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
  const todayWorkout = activePlan.find(d => d.day === todayName) || activePlan[0];

  // Coaching & Focus Logic
  let coachMsg = "Log today's workout in the Workout Tab to get real-time risk assessment.";
  let focusMsg = todayWorkout.ex.length > 0 
    ? `Today's Focus: ${todayWorkout.focus}. Stick to your prescribed plan for optimal muscle preservation.`
    : `Rest Day. Focus on hydration, light stretching, and letting your muscle fibers recover.`;

  if (latestResult) {
    if ((latestResult.avg_intensity || 0) < 4 && latestResult.avg_intensity > 0) {
      coachMsg = "Gym intensity is on the lower side. Make sure to hit your prescribed reps today to maintain protein synthesis.";
    } else if (latestResult.weight_loss_rate > 0.2) {
      coachMsg = "Aggressive weight loss detected! High risk of muscle catabolism. Increase protein intake.";
      const prot = (latestResult.protein_intake || 150).toFixed(0);
      focusMsg = `Protein Target: Consume at least ${prot}g of protein today to preserve muscle fibers, while following your ${todayWorkout.focus} plan.`;
    } else if (history.length > 0) {
      coachMsg = "Excellent anabolic balance! You are in the premium Muscle Preservation Zone. Keep it up.";
    }

    // Weather-based suggestions
    const weather = latestResult.weather || 'Sunny';
    let weatherAdvice = "";
    if (weather === 'Sunny') {
      weatherAdvice = "\n\n☀️ It's sunny today! Ensure extra hydration (add 500ml) to maintain peak performance during your session.";
    } else if (weather === 'Cloudy') {
      weatherAdvice = "\n\n☁️ Cloudy skies detected. Ideal temperature for a steady-state cardio session or extending your workout duration by 10%.";
    } else if (weather === 'Rainy') {
      weatherAdvice = "\n\n🌧️ Rainy day. Stick to your indoor routine. Focus on high-intensity intervals to maximize metabolic rate.";
    }
    focusMsg += weatherAdvice;
  }

  return (
    <LinearGradient colors={[Colors.bgRadialCore, Colors.bgMain]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
        >
          {/* USER HEADER CARD */}
          <GlassCard style={{ marginBottom: 16, padding: 12 }}>
            <View style={styles.userHeader}>
              <View style={styles.userLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{name}</Text>
                  <Text style={styles.userStatus}>Existing User</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => navigation.navigate('Profile')}
              >
                <Text style={styles.editBtnText}>⚙️ Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* STATS ROW */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <GlassCard style={{ flex: 1, padding: 12, marginBottom: 0 }}>
              <Text style={styles.statLabel}>CURRENT WEIGHT</Text>
              <View style={styles.statValRow}>
                <Text style={styles.statValue}>{weight}</Text>
                <Text style={styles.statUnit}>kg</Text>
              </View>
            </GlassCard>
            <GlassCard style={{ flex: 1, padding: 12, marginBottom: 0 }}>
              <Text style={styles.statLabel}>GOAL TARGET</Text>
              <View style={styles.statValRow}>
                <Text style={styles.statValue}>{goalWeight}</Text>
                <Text style={styles.statUnit}>kg</Text>
              </View>
            </GlassCard>
          </View>

          {/* HERO GAUGE PANEL */}
          <GlassCard style={styles.heroPanel}>
            <Text style={styles.statusHeader}>MUSCLE GUARD STATUS</Text>

            {/* SCORE DISPLAY (Mimicking Gauge) */}
            <View style={styles.scoreCircleContainer}>
              <View style={[styles.scoreCircle, { borderColor: riskLevel === '0' ? Colors.green : riskLevel === '1' ? Colors.yellow : Colors.red }]}>
                <Text style={styles.scoreNumber}>
                  {Math.max(lowPct, modPct, highPct)}%
                </Text>
                <Text style={{color: Colors.textTertiary, fontSize: 10, fontWeight: '700'}}>
                  {lowPct >= modPct && lowPct >= highPct ? 'SAFE' : modPct >= highPct ? 'MODERATE' : 'HIGH'}
                </Text>
              </View>
            </View>

            {/* RISK BANNER PILL */}
            <View style={[
              styles.riskBanner,
              {
                backgroundColor: riskLevel === '0' ? 'rgba(48, 209, 88, 0.15)' : riskLevel === '1' ? 'rgba(255, 214, 10, 0.15)' : 'rgba(255, 69, 58, 0.15)',
                borderColor: riskLevel === '0' ? 'rgba(48, 209, 88, 0.4)' : riskLevel === '1' ? 'rgba(255, 214, 10, 0.4)' : 'rgba(255, 69, 58, 0.4)',
              }
            ]}>
              <Text style={[
                styles.riskBannerText,
                { color: riskLevel === '0' ? Colors.green : riskLevel === '1' ? Colors.yellow : Colors.red }
              ]}>{riskLabel.toUpperCase()}</Text>
            </View>

            {/* RISK PROBABILITY BREAKDOWN */}
            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownTitle}>📊 RISK PROBABILITY BREAKDOWN</Text>
              
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressSeg, { flex: Math.max(lowPct, 1), backgroundColor: Colors.green }]} />
                <View style={[styles.progressSeg, { flex: Math.max(modPct, 1), backgroundColor: Colors.yellow }]} />
                <View style={[styles.progressSeg, { flex: Math.max(highPct, 1), backgroundColor: Colors.red }]} />
              </View>

              <View style={styles.breakdownLabels}>
                <Text style={[styles.probText, { color: Colors.green }]}>🟢 Low: {lowPct}%</Text>
                <Text style={[styles.probText, { color: Colors.yellow }]}>🟡 Moderate: {modPct}%</Text>
                <Text style={[styles.probText, { color: Colors.red }]}>🔴 High: {highPct}%</Text>
              </View>
            </View>
          </GlassCard>

          {/* TODAY'S PRESCRIBED WORKOUT */}
          <GlassCard style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.statLabel}>🏋️ TODAY'S PRESCRIBED WORKOUT</Text>
              <View style={[styles.badge, { backgroundColor: todayWorkout.active ? 'rgba(48, 209, 88, 0.2)' : 'rgba(255, 214, 10, 0.2)' }]}>
                <Text style={[styles.badgeText, { color: todayWorkout.active ? Colors.green : Colors.yellow }]}>{todayWorkout.focus.toUpperCase()}</Text>
              </View>
            </View>
            {todayWorkout.ex.length > 0 ? (
              todayWorkout.ex.map((ex, i) => (
                <View key={i} style={styles.exRow}>
                  <Text style={styles.exName}>💪 {ex.name}</Text>
                  <Text style={styles.exScheme}>{ex.scheme}</Text>
                </View>
              ))
            ) : (
              <Text style={{ color: Colors.textTertiary, fontSize: 13, textAlign: 'center', marginVertical: 8 }}>🧘 Rest Day - Gentle recovery only</Text>
            )}
          </GlassCard>

          {/* COACHING BOX */}
          <Text style={styles.sectionTitle}>Coaching</Text>
          <View style={styles.coachCard}>
            <Text style={styles.coachCardText}>{coachMsg}</Text>
          </View>

          {/* AI METABOLISM INSIGHTS */}
          <Text style={styles.sectionTitle}>Metabolism Insights</Text>
          <GlassCard style={{ padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 24, marginRight: 12 }}>🔥</Text>
            <View>
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
                Anabolic Streak: <Text style={{ color: Colors.blue }}>{streak} Day{streak > 1 ? 's' : ''}</Text>
              </Text>
              <Text style={{ color: Colors.textTertiary, fontSize: 11, marginTop: 2 }}>Consecutive Safe Zone Days</Text>
            </View>
          </GlassCard>

          <GlassCard style={{ padding: 12, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>⚡ Metabolic Recovery Index</Text>
              <Text style={{ color: Colors.blue, fontWeight: '700', fontSize: 12 }}>{recIndex}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <LinearGradient
                colors={[Colors.blueLight, Colors.indigo]}
                style={{ width: `${recIndex}%`, height: '100%', borderRadius: 4 }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
          </GlassCard>

          <GlassCard style={{ padding: 12, marginBottom: 12 }}>
            <Text style={{ fontSize: 11, color: Colors.textTertiary, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 }}>
              💡 PERSONALIZED FOCUS
            </Text>
            <Text style={{ color: Colors.textPrimary, fontSize: 13, lineHeight: 20 }}>
              {focusMsg}
            </Text>
          </GlassCard>

          {/* MY COACH SECTION */}
          <Text style={styles.sectionTitle}>My Coach</Text>
          {coachInfo ? (
            <GlassCard style={{ padding: 12, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.avatar, { width: 36, height: 36, borderRadius: 18 }]}>
                  <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 12 }}>{coachInfo.name.substring(0,2).toUpperCase()}</Text>
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Coach {coachInfo.name}</Text>
                  <Text style={{ color: Colors.textTertiary, fontSize: 11 }}>Linked via code: {coachInfo.coach_code}</Text>
                </View>
              </View>
            </GlassCard>
          ) : (
            <GlassCard style={{ padding: 12, marginBottom: 12 }}>
              <Text style={{ color: Colors.textTertiary, fontSize: 12, marginBottom: 10 }}>No coach connected yet.</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1, height: 40, paddingVertical: 0 }]}
                  placeholder="Coach Code"
                  placeholderTextColor={Colors.textTertiary}
                  value={coachCode}
                  onChangeText={setCoachCode}
                  autoCapitalize="characters"
                />
                <TouchableOpacity onPress={handleLinkCoach} style={[styles.editBtn, { backgroundColor: Colors.blue, borderColor: Colors.blue }]}>
                  <Text style={[styles.editBtnText, { color: '#FFF' }]}>Link</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: Colors.glassBorder, borderWidth: 1, marginBottom: 40 }]}
            onPress={() => navigation.navigate('Chat')}
          >
            <Text style={[styles.saveBtnText, { color: Colors.textPrimary }]}>💬 CHAT & ASSISTANT</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  userInfo: { marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  userStatus: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: Colors.glassBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: Colors.textPrimary,
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  editBtnText: { color: Colors.textPrimary, fontSize: 12, fontWeight: '600' },
  statLabel: { fontSize: 11, color: Colors.textTertiary, fontWeight: '700', letterSpacing: 1 },
  statValRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  statValue: { fontSize: 28, fontWeight: '900', color: Colors.textPrimary },
  statUnit: { fontSize: 14, color: Colors.textTertiary, marginLeft: 4 },
  statusHeader: {
    textAlign: 'center',
    color: Colors.blueLight,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  coachCard: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: Colors.blueLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  coachCardText: {
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  heroPanel: {
    marginBottom: 24,
    paddingTop: 16,
  },
  scoreCircleContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  scoreNumber: { fontSize: 36, fontWeight: '900', color: '#FFF' },
  riskBanner: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  riskBannerText: { fontSize: 16, fontWeight: '900', letterSpacing: 1.5 },
  breakdownBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: Colors.glassBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  breakdownTitle: { fontSize: 11, color: Colors.textTertiary, fontWeight: '700', marginBottom: 8 },
  progressBarTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 8,
  },
  progressSeg: { height: '100%' },
  breakdownLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  probText: { fontSize: 11, fontWeight: '700' },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  exName: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },
  exScheme: { fontSize: 13, color: Colors.blueLight, fontWeight: '700' },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  dayCard: {
    width: '100%',
    padding: 16,
    marginBottom: 12,
  },
  dayCardToday: {
    borderColor: Colors.blueLight,
    borderWidth: 2,
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 8,
  },
  dayCardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  miniBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  miniExText: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  restText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});

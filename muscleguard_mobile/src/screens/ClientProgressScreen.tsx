import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';
import { ApiServices } from '../api/client';
import { PLANS } from '../constants/plans';

export const ClientProgressScreen = ({ route, navigation }: any) => {
  const { clientId, clientName } = route.params;
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const res = await ApiServices.getClientProgress(clientId);
      if (res.success) {
        setProfile(res.profile);
        setHistory(res.history || []);
      }
    } catch (e) {
      console.log('Failed to load client progress', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.blueLight} />
      </SafeAreaView>
    );
  }

  const latest = history[0] || {};

  // Robust value formatting helper
  const formatVal = (val: any, suffix: string = '', decimals: number = 0) => {
    if (val === undefined || val === null || val === '') return '—';
    const num = parseFloat(val);
    if (isNaN(num)) return '—';
    return decimals > 0 ? num.toFixed(decimals) + suffix : Math.round(num) + suffix;
  };

  // BMI Calculation Fallback
  let displayBmi = formatVal(latest.bmi, '', 1);
  if (displayBmi === '—' && profile?.weight && profile?.height) {
    const w = parseFloat(profile.weight);
    const h = parseFloat(profile.height);
    if (h > 0) displayBmi = (w / ((h / 100) ** 2)).toFixed(1);
  }

  const probs = latest.probabilities || [0.33, 0.33, 0.34];
  const lowPct = Math.round(probs[0] * 100);
  const modPct = Math.round(probs[1] * 100);
  const highPct = Math.round(probs[2] * 100);

  const score = (probs[0] * 0 + probs[1] * 50 + probs[2] * 100);
  const riskLabel = score < 30 ? 'SAFE ZONE' : score < 70 ? 'MODERATE CAUTION' : 'CRITICAL RISK';
  const riskColor = score < 30 ? Colors.green : score < 70 ? Colors.yellow : Colors.red;

  const riskLevel = String(latest.risk_level ?? '0');
  const prefEx = latest.exercise || 'Mixed';
  const planKey = `${riskLevel}-${prefEx}`;
  const activePlan = PLANS[planKey] || PLANS['1-Mixed'];
  const todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
  const todayWorkout = activePlan.find(d => d.day === todayName) || activePlan[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blueLight} />}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back to Dashboard</Text>
        </TouchableOpacity>

        <View style={styles.clientHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(profile?.name || clientName || 'CL').substring(0,2).toUpperCase()}</Text>
          </View>
          <View style={{ marginLeft: 16 }}>
            <Text style={styles.clientName}>{profile?.name || clientName}</Text>
            <Text style={styles.clientSub}>{profile?.gender || '—'} • {profile?.age || '—'} years old</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>Weight</Text>
            <Text style={styles.statValue}>{formatVal(profile?.weight)}kg</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>Goal</Text>
            <Text style={styles.statValue}>{formatVal(profile?.goal_weight)}kg</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>BMI</Text>
            <Text style={styles.statValue}>{displayBmi}</Text>
          </GlassCard>
        </View>

        {/* Risk Gauge Section */}
        <GlassCard style={styles.gaugeSection}>
          <Text style={styles.sectionHeader}>MUSCLE RISK STATUS</Text>

          <View style={styles.scoreCircleContainer}>
            <View style={[styles.scoreCircle, { borderColor: riskColor }]}>
              <Text style={styles.scoreNumber}>{Math.max(lowPct, modPct, highPct)}%</Text>
              <Text style={{ color: Colors.textTertiary, fontSize: 10, fontWeight: '700' }}>
                {lowPct >= modPct && lowPct >= highPct ? 'LOW' : modPct >= highPct ? 'MOD' : 'HIGH'}
              </Text>
            </View>
          </View>

          <View style={[styles.riskBanner, { backgroundColor: riskColor + '26', borderColor: riskColor + '66' }]}>
            <Text style={[styles.riskBannerText, { color: riskColor }]}>{riskLabel}</Text>
          </View>

          <View style={styles.breakdownBox}>
            <Text style={styles.breakdownTitle}>📊 RISK PROBABILITY BREAKDOWN</Text>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressSeg, { flex: Math.max(lowPct, 1), backgroundColor: Colors.green }]} />
              <View style={[styles.progressSeg, { flex: Math.max(modPct, 1), backgroundColor: Colors.yellow }]} />
              <View style={[styles.progressSeg, { flex: Math.max(highPct, 1), backgroundColor: Colors.red }]} />
            </View>
            <View style={styles.breakdownLabels}>
              <Text style={[styles.probText, { color: Colors.green }]}>🟢 Low: {lowPct}%</Text>
              <Text style={[styles.probText, { color: Colors.yellow }]}>🟡 Mod: {modPct}%</Text>
              <Text style={[styles.probText, { color: Colors.red }]}>🔴 High: {highPct}%</Text>
            </View>
          </View>
        </GlassCard>

        {/* Prescribed Workout */}
        <GlassCard style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.statLabel}>🏋️ TODAY'S PRESCRIBED WORKOUT</Text>
              {latest.weather && (
                <View style={[styles.weatherBadge, { marginLeft: 8 }]}>
                  <Text style={styles.weatherBadgeText}>
                    {latest.weather === 'Sunny' ? '☀️' : latest.weather === 'Cloudy' ? '☁️' : '🌧️'} {latest.weather.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
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

        {/* Historical Stats */}
        <Text style={styles.sectionHeaderTitle}>Average Workout Metrics (Last 7 Days)</Text>
        {history.length === 0 ? (
          <GlassCard style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: Colors.textTertiary, fontSize: 13 }}>No historical predictions logged yet.</Text>
          </GlassCard>
        ) : (
          <View style={styles.metricsGrid}>
            <GlassCard style={styles.metricCard}>
              <Text style={styles.metricLabel}>Calories</Text>
              <Text style={styles.metricValue}>{formatVal(latest.avg_calories, ' kcal')}</Text>
            </GlassCard>
            <GlassCard style={styles.metricCard}>
              <Text style={styles.metricLabel}>Duration</Text>
              <Text style={styles.metricValue}>{formatVal(latest.avg_duration, ' min')}</Text>
            </GlassCard>
            <GlassCard style={styles.metricCard}>
              <Text style={styles.metricLabel}>Heart Rate</Text>
              <Text style={styles.metricValue}>{formatVal(latest.avg_heart_rate, ' bpm')}</Text>
            </GlassCard>
            <GlassCard style={styles.metricCard}>
              <Text style={styles.metricLabel}>Intensity</Text>
              <Text style={styles.metricValue}>{formatVal(latest.avg_intensity, '/10', 1)}</Text>
            </GlassCard>
            <GlassCard style={styles.metricCard}>
              <Text style={styles.metricLabel}>Protein</Text>
              <Text style={styles.metricValue}>{formatVal(latest.protein_intake, ' g')}</Text>
            </GlassCard>
            <GlassCard style={styles.metricCard}>
              <Text style={styles.metricLabel}>Loss Rate</Text>
              <Text style={styles.metricValue}>{formatVal(latest.weight_loss_rate, ' kg/d', 2)}</Text>
            </GlassCard>
          </View>
        )}

        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => navigation.navigate('Chat', { clientId, clientName })}
        >
          <Text style={styles.chatBtnText}>💬 Send Coaching Suggestion</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.bgMain,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: { flex: 1, backgroundColor: Colors.bgMain },
  scroll: { padding: 20 },
  backBtn: { marginBottom: 20 },
  backBtnText: { color: Colors.blueLight, fontWeight: '700', fontSize: 14 },
  clientHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatar: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  clientName: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  clientSub: { color: Colors.textTertiary, fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, padding: 12, alignItems: 'center', marginBottom: 0 },
  statLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#FFF', marginTop: 4 },
  gaugeSection: { padding: 16 },
  sectionHeader: { textAlign: 'center', color: Colors.blueLight, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  scoreCircleContainer: { alignItems: 'center', marginBottom: 16 },
  scoreCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  scoreNumber: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  riskBanner: { borderWidth: 1, borderRadius: 12, paddingVertical: 8, alignItems: 'center', marginBottom: 16 },
  riskBannerText: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  breakdownBox: { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: Colors.glassBorder, borderWidth: 1, borderRadius: 12, padding: 10 },
  breakdownTitle: { fontSize: 10, color: Colors.textTertiary, fontWeight: '700', marginBottom: 6 },
  progressBarTrack: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 6 },
  progressSeg: { height: '100%' },
  breakdownLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  probText: { fontSize: 10, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  exName: { fontSize: 13, color: Colors.textPrimary },
  exScheme: { fontSize: 13, color: Colors.blueLight, fontWeight: '700' },
  sectionHeaderTitle: { color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 16, marginTop: 12 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricCard: { width: '31.5%', padding: 10, alignItems: 'center', marginBottom: 0 },
  metricLabel: { fontSize: 9, color: Colors.textTertiary, fontWeight: '700' },
  metricValue: { fontSize: 12, fontWeight: '700', color: '#FFF', marginTop: 2 },
  chatBtn: { backgroundColor: Colors.blue, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  chatBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  weatherBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  weatherBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textTertiary,
  },
});

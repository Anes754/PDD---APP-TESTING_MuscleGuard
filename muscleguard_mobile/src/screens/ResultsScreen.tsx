import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';
import { ApiServices } from '../api/client';
import { AppStorage, StorageKeys } from '../storage';

export const ResultsScreen = () => {
  const [latestResult, setLatestResult] = useState<any>(null);
  const [prevResult, setPrevResult] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const user = await AppStorage.get(StorageKeys.USER);
      if (!user) return;
      const p = await AppStorage.get(StorageKeys.PROFILE);
      if (p) setProfile(p);

      const history = await ApiServices.getHistory(user.user_id);
      if (history && history.data && history.data.length > 0) {
        setLatestResult(history.data[0]);
        if (history.data.length > 1) {
          setPrevResult(history.data[1]);
        }
      }
    })();
  }, []);

  const riskLabelRaw = latestResult?.risk_label || 'Low';
  const riskLabel = riskLabelRaw.toUpperCase();
  const riskColor = (riskLabel.includes('SAFE') || riskLabel === 'LOW')
    ? Colors.green
    : (riskLabel.includes('MODERATE') || riskLabel.includes('CAUTION'))
      ? Colors.yellow
      : Colors.red;

  const bmiVal = latestResult?.bmi || 25.9;
  const proteinVal = latestResult?.protein_intake || 120;
  const avgCalVal = latestResult?.avg_calories || 154;
  const avgHrVal = latestResult?.avg_heart_rate || 79;
  const avgIntVal = latestResult?.avg_intensity || 2.1;

  const renderDiff = (key: string, current: number, decimals: number = 0) => {
    if (!prevResult || prevResult[key] === undefined) return null;
    const diff = current - prevResult[key];
    if (diff === 0) return <Text style={styles.statSubText}> (=)</Text>;
    const color = diff > 0 ? Colors.green : Colors.red;
    return <Text style={{ color, fontSize: 12, fontWeight: '600' }}> ({diff > 0 ? '+' : ''}{diff.toFixed(decimals)})</Text>;
  };

  const probs = latestResult?.probabilities || [0.10, 0.04, 0.86];
  const lowPct = Math.round(probs[0] * 100);
  const modPct = Math.round(probs[1] * 100);
  const highPct = Math.round(probs[2] * 100);

  const userName = (profile?.name || 'ANES MD').toUpperCase();

  const currentWeight = parseFloat(profile?.weight) || 0;
  const goalWeight = parseFloat(profile?.goal_weight) || 0;
  const weightRemaining = Math.max(0, currentWeight - goalWeight);
  const wlr = Math.abs(latestResult?.weight_loss_rate || 0);
  const weeklyWLR = wlr * 7;
  const estWeeks = weeklyWLR > 0 ? Math.ceil(weightRemaining / weeklyWLR) : 0;

  return (
    <LinearGradient colors={[Colors.bgRadialCore, Colors.bgMain]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* STEPPER HEADER */}
          <View style={styles.stepperHeader}>
            <Text style={styles.logoText}>💪 MUSCLEGUARD</Text>
            <View style={styles.stepperRow}>
              <View style={styles.stepGreen}><Text style={styles.stepGreenText}>✓ PROFILE</Text></View>
              <View style={styles.stepGreen}><Text style={styles.stepGreenText}>✓ WORKOUTS</Text></View>
              <View style={styles.stepBlue}><Text style={styles.stepBlueText}>03 RESULTS</Text></View>
            </View>
          </View>

          {/* ANALYSIS SUMMARY CARD */}
          <GlassCard>
            <View style={styles.heroRow}>
              <View style={styles.heroLeft}>
                <Text style={styles.assessTitle}>MUSCLE LOSS RISK ASSESSMENT · {userName}</Text>
                <Text style={styles.summaryTitle}>ANALYSIS SUMMARY</Text>
                {latestResult?.weather && (
                  <View style={[styles.weatherBadge, { marginLeft: 0, marginTop: 4, alignSelf: 'flex-start' }]}>
                    <Text style={styles.weatherText}>
                      {latestResult.weather === 'Sunny' ? '☀️' : latestResult.weather === 'Cloudy' ? '☁️' : '🌧️'} {latestResult.weather.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={[styles.highRiskPill, { borderColor: riskColor + '88', backgroundColor: riskColor + '33' }]}>
                <Text style={[styles.highRiskText, { color: riskColor }]}>{riskLabel.replace(' RISK', '')}</Text>
                <Text style={[styles.highRiskText, { color: riskColor }]}>RISK</Text>
              </View>
            </View>
          </GlassCard>

          {/* STATS LIST */}
          <GlassCard>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>BMI</Text>
              <Text style={styles.statMainVal}>{bmiVal.toFixed(1)}{renderDiff('bmi', bmiVal, 1)}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Protein Target</Text>
              <Text style={styles.statMainVal}>{Math.round(proteinVal)} g / day{renderDiff('protein_intake', proteinVal)}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Avg Calories</Text>
              <Text style={styles.statMainVal}>{Math.round(avgCalVal)} kcal{renderDiff('avg_calories', avgCalVal)}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Avg Heart Rate</Text>
              <Text style={styles.statMainVal}>{Math.round(avgHrVal)} bpm{renderDiff('avg_heart_rate', avgHrVal)}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Avg Intensity</Text>
              <Text style={styles.statMainVal}>{avgIntVal.toFixed(1)} / 10{renderDiff('avg_intensity', avgIntVal, 1)}</Text>
            </View>
          </GlassCard>

          {/* GOAL PROGRESS CARD */}
          <GlassCard style={styles.goalCard}>
            <Text style={styles.goalHeaderTitle}>🎯 GOAL WEIGHT PROGRESS</Text>

            <View style={styles.goalGrid}>
              <View style={styles.goalCol}>
                <Text style={styles.goalLabel}>CURRENT</Text>
                <Text style={styles.goalValMain}>{currentWeight}kg</Text>
              </View>
              <View style={styles.goalDivider} />
              <View style={styles.goalCol}>
                <Text style={styles.goalLabel}>TARGET</Text>
                <Text style={[styles.goalValMain, { color: Colors.blueLight }]}>{goalWeight}kg</Text>
              </View>
            </View>

            <View style={styles.projectionBox}>
              <View style={styles.projRow}>
                <Text style={styles.projLabel}>Weight Remaining:</Text>
                <Text style={styles.projVal}>{weightRemaining.toFixed(1)} kg</Text>
              </View>
              <View style={styles.projRow}>
                <Text style={styles.projLabel}>Estimated Time:</Text>
                <Text style={styles.projVal}>{estWeeks > 0 ? `~${estWeeks} Weeks` : 'N/A'}</Text>
              </View>
            </View>

            <Text style={styles.motivationalText}>
              {weightRemaining > 0
                ? `Steady progress! Keep your protein high and stay consistent to reach your ${goalWeight}kg target.`
                : "Goal reached! Focus on muscle maintenance and metabolic health."}
            </Text>
          </GlassCard>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  stepperHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  logoText: { fontSize: 13, fontWeight: '900', color: Colors.blueLight },
  stepperRow: { flexDirection: 'row', gap: 4 },
  stepGreen: { backgroundColor: 'rgba(48, 209, 88, 0.15)', borderColor: 'rgba(48, 209, 88, 0.3)', borderWidth: 1, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 3 },
  stepGreenText: { color: Colors.green, fontSize: 10, fontWeight: '800' },
  stepBlue: { backgroundColor: Colors.blue, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 3 },
  stepBlueText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLeft: { flex: 1, marginRight: 12 },
  assessTitle: { fontSize: 10, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5 },
  summaryTitle: { fontSize: 18, fontWeight: '900', color: Colors.textPrimary, marginTop: 4 },
  highRiskPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  highRiskText: { fontSize: 11, fontWeight: '900' },
  statItem: { paddingVertical: 8 },
  statLabel: { fontSize: 11, color: Colors.textTertiary, marginBottom: 2 },
  statMainVal: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  statSubText: { fontSize: 12, color: Colors.textTertiary, fontWeight: '400' },
  statGreenText: { fontSize: 12, color: Colors.green, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.glassBorder, marginVertical: 4 },

  goalCard: { padding: 16, marginBottom: 20 },
  goalHeaderTitle: { fontSize: 12, fontWeight: '900', color: Colors.textPrimary, marginBottom: 16, letterSpacing: 1 },
  goalGrid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 20 },
  goalCol: { alignItems: 'center' },
  goalLabel: { fontSize: 9, color: Colors.textTertiary, fontWeight: '800', letterSpacing: 1 },
  goalValMain: { fontSize: 24, fontWeight: '900', color: Colors.textPrimary, marginTop: 4 },
  goalDivider: { width: 1, height: 40, backgroundColor: Colors.glassBorder },
  projectionBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 16
  },
  projRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  projLabel: { fontSize: 12, color: Colors.textTertiary, fontWeight: '600' },
  projVal: { fontSize: 12, color: Colors.textPrimary, fontWeight: '800' },
  motivationalText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, fontStyle: 'italic', textAlign: 'center' },

  weatherBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginLeft: 10,
  },
  weatherText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textTertiary,
  },
});

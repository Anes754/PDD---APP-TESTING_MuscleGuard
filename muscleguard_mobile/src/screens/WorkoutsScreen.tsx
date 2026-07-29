import React, { useState, useCallback, useEffect } from 'react';
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
import { PLANS, DayPlan } from '../constants/plans';

export const WorkoutsScreen = () => {
  const [exercise, setExercise] = useState('Cardio');
  const [weather, setWeather] = useState('Sunny');
  const [calories, setCalories] = useState('263');
  const [duration, setDuration] = useState('30');
  const [heartRate, setHeartRate] = useState('120');
  const [intensity, setIntensity] = useState('5');
  const [loading, setLoading] = useState(false);
  const [profileWeight, setProfileWeight] = useState(75);
  const [todayWorkout, setTodayWorkout] = useState<DayPlan | null>(null);
  const [activePlan, setActivePlan] = useState<DayPlan[]>([]);
  const todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];

  const loadInitialData = async () => {
    const p = await AppStorage.get(StorageKeys.PROFILE);
    if (p && p.weight) setProfileWeight(parseFloat(p.weight) || 75);

    const user = await AppStorage.get(StorageKeys.USER);
    if (user) {
      try {
        const historyRes = await ApiServices.getHistory(user.user_id);
        const history = historyRes.data || [];
        if (history.length > 0) {
          const latest = history[0];
          const riskLevel = String(latest.risk_level ?? '0');
          const prefEx = latest.exercise || 'Mixed';
          const planKey = `${riskLevel}-${prefEx}`;
          const activePlanData = PLANS[planKey] || PLANS['0-Mixed'];
          const workout = activePlanData.find(d => d.day === todayName) || activePlanData[0];
          setActivePlan(activePlanData);
          setTodayWorkout(workout);

          // Pre-populate today's logging with preferences
          setExercise(prefEx);
          setWeather(latest.weather || 'Sunny');
        }
      } catch (e) {
        console.log("Error loading workout plan:", e);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [])
  );

  useEffect(() => {
    const type = exercise.toLowerCase();
    const intVal = parseFloat(intensity) || 5;
    const durVal = parseFloat(duration) || 0;
    
    let met = 3.0;
    if (type.includes('cardio')) {
      met = 3.0 + (intVal - 1) * 1.0;
    } else if (type.includes('strength')) {
      met = 3.0 + (intVal - 1) * 0.33;
    } else {
      met = 3.0 + (intVal - 1) * 0.67;
    }
    
    const cal = Math.round(met * profileWeight * (durVal / 60));
    setCalories(cal.toString());
  }, [exercise, duration, intensity, profileWeight]);

  const handleSave = async () => {
    const user = await AppStorage.get(StorageKeys.USER);
    const profile = await AppStorage.get(StorageKeys.PROFILE);
    if (!user) return;

    setLoading(true);
    try {
      const historyRes = await ApiServices.getHistory(user.user_id);
      const history = historyRes.data || [];

      const workoutDay = {
        calories: parseFloat(calories) || 263,
        duration: parseFloat(duration) || 30,
        heart_rate: parseFloat(heartRate) || 120,
        intensity: parseFloat(intensity) || 5,
      };

      // Construct weekly data: today + last 6 days of history
      const weekly_data = [
        workoutDay,
        ...history.slice(0, 6).map((h: any) => ({
          calories: h.avg_calories || 0,
          duration: h.avg_duration || 0,
          heart_rate: h.avg_heart_rate || 70,
          intensity: h.avg_intensity || 1,
        })),
      ];

      // Pad with zeros if less than 7 days total
      while (weekly_data.length < 7) {
        weekly_data.push({ calories: 0, duration: 0, heart_rate: 70, intensity: 1 });
      }

      const predictReq = {
        user_id: String(user.user_id),
        name: profile?.name || 'User',
        age: parseInt(profile?.age) || 25,
        height: parseFloat(profile?.height) || 170,
        weight: parseFloat(profile?.weight) || 75,
        goal_weight: parseFloat(profile?.goal_weight) || 68,
        gender: profile?.gender || 'Male',
        exercise,
        weather,
        weekly_data,
      };

      const res = await ApiServices.predict(predictReq);
      if (res.success) {
        await ApiServices.saveResult({
          ...predictReq,
          ...res.data,
        });
        Alert.alert('Saved!', 'Performance logged and risk analysis updated.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save performance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[Colors.bgRadialCore, Colors.bgMain]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* WEEKLY TRAINING SCHEDULE */}
          <Text style={styles.sectionTitle}>Weekly Training Schedule</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {activePlan.map((dayPlan, idx) => {
              const isToday = dayPlan.day === todayName;
              return (
                <GlassCard key={idx} style={{ ...styles.dayCard, ...(isToday ? styles.dayCardToday : {}) }}>
                  <View style={styles.dayCardHeader}>
                    <Text style={[styles.dayCardTitle, isToday && { color: Colors.blueLight }]}>{dayPlan.day}</Text>
                    <View style={[styles.miniBadge, { backgroundColor: dayPlan.active ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255,255,255,0.05)' }]}>
                      <Text style={[styles.miniBadgeText, { color: dayPlan.active ? Colors.green : Colors.textTertiary }]}>
                        {dayPlan.focus.split(' ')[0]}
                      </Text>
                    </View>
                  </View>
                  {dayPlan.ex.length > 0 ? (
                    dayPlan.ex.map((ex, i) => (
                      <Text key={i} style={styles.miniExText} numberOfLines={1}>• {ex.name}</Text>
                    ))
                  ) : (
                    <Text style={styles.miniExText}>Rest Day</Text>
                  )}
                </GlassCard>
              );
            })}
          </ScrollView>
          {/* TODAY'S PRESCRIBED WORKOUT CARD */}
          {todayWorkout && (
            <GlassCard>
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>{todayWorkout.day} • TODAY</Text>
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
          )}

          {/* LOG TODAY'S PERFORMANCE */}
          <GlassCard>
            <Text style={styles.sectionTitle}>📝 Log Today's Performance</Text>

            <View style={styles.rowTwo}>
              <View style={styles.colHalf}>
                <Text style={styles.label}>🏃 EXERCISE TYPE DONE</Text>
                <View style={styles.selectRow}>
                  {['Cardio', 'Strength', 'Mixed'].map((ex) => (
                    <TouchableOpacity
                      key={ex}
                      style={[styles.chip, exercise === ex && styles.chipActive]}
                      onPress={() => setExercise(ex)}
                    >
                      <Text style={[styles.chipText, exercise === ex && styles.chipTextActive]}>{ex}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={[styles.rowTwo, { marginTop: 12 }]}>
              <View style={styles.colHalf}>
                <Text style={styles.label}>🌞 TODAY'S WEATHER</Text>
                <View style={styles.selectRow}>
                  {['Sunny', 'Cloudy', 'Rainy'].map((w) => (
                    <TouchableOpacity
                      key={w}
                      style={[styles.chip, weather === w && styles.chipActive]}
                      onPress={() => setWeather(w)}
                    >
                      <Text style={[styles.chipText, weather === w && styles.chipTextActive]}>{w}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={styles.inputCol}>
                <Text style={styles.label}>🔥 CALORIES BURNED</Text>
                <TextInput
                  style={styles.input}
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.label}>⏱️ DURATION (MINS)</Text>
                <TextInput
                  style={styles.input}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={styles.inputCol}>
                <Text style={styles.label}>💗 AVG HEART RATE</Text>
                <TextInput
                  style={styles.input}
                  value={heartRate}
                  onChangeText={setHeartRate}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.label}>💪 GYM INTENSITY (1-10)</Text>
                <TextInput
                  style={styles.input}
                  value={intensity}
                  onChangeText={setIntensity}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </GlassCard>

          {/* SAVE BUTTON */}
          <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.8} style={[styles.saveBtn, { backgroundColor: Colors.blue }]}>
            <Text style={styles.saveBtnText}>💾 SAVE TODAY'S PERFORMANCE</Text>
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
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dayTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  badgeBlue: { backgroundColor: 'rgba(10, 132, 255, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeBlueText: { color: Colors.blueLight, fontSize: 10, fontWeight: '800' },
  badgeGray: { backgroundColor: 'rgba(255, 255, 255, 0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeGrayText: { color: Colors.textTertiary, fontSize: 10, fontWeight: '800' },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  exName: { fontSize: 13, color: Colors.textPrimary },
  exScheme: { fontSize: 13, color: Colors.blueLight, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 14 },
  rowTwo: { width: '100%' },
  colHalf: { width: '100%' },
  label: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, marginBottom: 6 },
  selectRow: { flexDirection: 'row', gap: 6 },
  chip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: Colors.glassBorder,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: Colors.blue },
  chipText: { fontSize: 12, color: Colors.textSecondary },
  chipTextActive: { color: '#FFF', fontWeight: '800' },
  rowInputs: { flexDirection: 'row', gap: 10, marginTop: 12 },
  inputCol: { flex: 1 },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: Colors.glassBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  saveBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  dayCard: {
    width: 140,
    marginRight: 12,
    padding: 12,
    marginBottom: 0,
    minHeight: 110,
  },
  dayCardToday: {
    borderColor: Colors.blueLight,
    borderWidth: 1.5,
    backgroundColor: 'rgba(96, 165, 250, 0.05)',
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  miniBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniBadgeText: {
    fontSize: 8,
    fontWeight: '900',
  },
  miniExText: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 2,
  },
});

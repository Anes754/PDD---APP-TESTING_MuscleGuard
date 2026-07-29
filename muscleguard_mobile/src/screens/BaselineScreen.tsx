import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';
import { ApiServices } from '../api/client';
import { AppStorage, StorageKeys } from '../storage';

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES = ["DAY 1 — MON", "DAY 2 — TUE", "DAY 3 — WED", "DAY 4 — THU", "DAY 5 — FRI", "DAY 6 — SAT", "DAY 7 — SUN"];

interface DayData {
  calories: string;
  duration: string;
  heart_rate: string;
  intensity: string;
}

export const BaselineScreen = ({ navigation }: any) => {
  const [exercise, setExercise] = useState('Cardio');
  const [weather, setWeather] = useState('Sunny');
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  const [weeklyData, setWeeklyData] = useState<DayData[]>(
    Array.from({ length: 7 }, () => ({
      calories: '0',
      duration: '0',
      heart_rate: '70',
      intensity: '5',
    }))
  );

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await AppStorage.get(StorageKeys.PROFILE);
      if (p) setProfile(p);
    })();
  }, []);

  const getMET = (exType: string, intensity: number) => {
    const type = exType.toLowerCase();
    let met = 3.0;
    if (type.includes('cardio')) {
      met = 3.0 + (intensity - 1) * 1.0;
    } else if (type.includes('strength')) {
      met = 3.0 + (intensity - 1) * 0.33;
    } else {
      met = 3.0 + (intensity - 1) * 0.67;
    }
    return met;
  };

  const calculateCalories = (day: DayData, currentExercise: string) => {
    const weight = profile?.weight || 75;
    const durVal = parseFloat(day.duration) || 0;
    const intVal = parseFloat(day.intensity) || 1;
    const met = getMET(currentExercise, intVal);
    return Math.round(met * weight * (durVal / 60)).toString();
  };

  const updateCurrentDay = (field: keyof DayData, value: string) => {
    const newWeekly = [...weeklyData];
    const updatedDay = { ...newWeekly[selectedDayIdx], [field]: value };

    // Auto-recalculate calories if inputs change
    if (field === 'duration' || field === 'intensity') {
      updatedDay.calories = calculateCalories(updatedDay, exercise);
    }

    newWeekly[selectedDayIdx] = updatedDay;
    setWeeklyData(newWeekly);
  };

  const handleExerciseChange = (newEx: string) => {
    setExercise(newEx);
    // Update calories for all days based on new exercise type
    const newWeekly = weeklyData.map(day => ({
      ...day,
      calories: calculateCalories(day, newEx)
    }));
    setWeeklyData(newWeekly);
  };

  const currentDay = weeklyData[selectedDayIdx];

  const handleFinish = async () => {
    const user = await AppStorage.get(StorageKeys.USER);
    if (!user || !profile) return;

    setLoading(true);
    try {
      const payload = {
        user_id: String(user.user_id),
        profile: profile,
        exercise: exercise,
        weather: weather,
        weekly_data: weeklyData.map(d => ({
          calories: parseFloat(d.calories) || 0,
          duration: parseFloat(d.duration) || 0,
          heart_rate: parseFloat(d.heart_rate) || 70,
          intensity: parseFloat(d.intensity) || 1
        })),
      };

      const res = await ApiServices.onboard(payload);
      if (res.success) {
        Alert.alert('Success', 'Baseline calibration complete! Welcome to MuscleGuard.');
        navigation.replace('MainTabs');
      } else {
        Alert.alert('Error', res.message || 'Calibration failed');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[Colors.bgRadialCore, Colors.bgMain]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.stepper}>
            <View style={styles.stepDone}><Text style={styles.stepTextDone}>✓ PROFILE</Text></View>
            <View style={styles.stepActive}><Text style={styles.stepTextActive}>02 WORKOUTS</Text></View>
            <View style={styles.stepInactive}><Text style={styles.stepTextInactive}>03 RESULTS</Text></View>
          </View>

          <Text style={styles.heroTitle}>STEP 2: BASELINE DATA</Text>
          <Text style={styles.heroSub}>Please enter your workout data for the last 7 days to calibrate your risk profile.</Text>

          <GlassCard>
            <Text style={styles.sectionTitle}>7-DAY CONFIGURATION</Text>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>🏃 EXERCISE TYPE</Text>
                <View style={styles.selectRow}>
                  {['Cardio', 'Strength', 'Mixed'].map((ex) => (
                    <TouchableOpacity
                      key={ex}
                      style={[styles.chip, exercise === ex && styles.chipActive]}
                      onPress={() => handleExerciseChange(ex)}
                    >
                      <Text style={[styles.chipText, exercise === ex && styles.chipTextActive]}>{ex}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={[styles.row, { marginTop: 12 }]}>
              <View style={styles.col}>
                <Text style={styles.label}>📅 SELECT DAY TO LOG</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
                  {DAY_NAMES.map((name, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.dayChip, selectedDayIdx === idx && styles.dayChipActive]}
                      onPress={() => setSelectedDayIdx(idx)}
                    >
                      <Text style={[styles.dayChipText, selectedDayIdx === idx && styles.dayChipTextActive]}>
                        {DAYS[idx]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </GlassCard>

          <GlassCard>
            <Text style={styles.sectionTitle}>{DAY_NAMES[selectedDayIdx]}</Text>

            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.label}>🔥 CALORIES</Text>
                <TextInput
                  style={[styles.input, styles.readOnlyInput]}
                  value={currentDay.calories}
                  editable={false}
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.label}>⏱️ DURATION (MIN)</Text>
                <TextInput
                  style={styles.input}
                  value={currentDay.duration}
                  onChangeText={(v) => updateCurrentDay('duration', v)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.label}>❤️ HEART RATE</Text>
                <TextInput
                  style={styles.input}
                  value={currentDay.heart_rate}
                  onChangeText={(v) => updateCurrentDay('heart_rate', v)}
                  keyboardType="numeric"
                  placeholder="70"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.label}>💪 INTENSITY (1-10)</Text>
                <TextInput
                  style={styles.input}
                  value={currentDay.intensity}
                  onChangeText={(v) => updateCurrentDay('intensity', v)}
                  keyboardType="numeric"
                  placeholder="5"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
            </View>
          </GlassCard>

          <TouchableOpacity
            style={[styles.finishBtn, { backgroundColor: Colors.blue }]}
            onPress={handleFinish}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.finishBtnText}>🚀 FINISH SETUP</Text>}
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
  stepper: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  stepDone: { backgroundColor: 'rgba(48, 209, 88, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  stepTextDone: { color: Colors.green, fontSize: 10, fontWeight: '800' },
  stepActive: { backgroundColor: Colors.blue, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  stepTextActive: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  stepInactive: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  stepTextInactive: { color: Colors.textTertiary, fontSize: 10, fontWeight: '800' },
  heroTitle: { fontSize: 20, fontWeight: '900', color: Colors.textPrimary, textAlign: 'center' },
  heroSub: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 18 },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: Colors.textPrimary, marginBottom: 16 },
  row: { width: '100%' },
  col: { width: '100%' },
  label: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, marginBottom: 6 },
  selectRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  chipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  chipText: { fontSize: 12, color: Colors.textSecondary },
  chipTextActive: { color: '#FFF', fontWeight: '800' },
  daysScroll: { marginTop: 4 },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  dayChipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  dayChipText: { color: Colors.textTertiary, fontSize: 12, fontWeight: '600' },
  dayChipTextActive: { color: '#FFF', fontWeight: '800' },
  inputRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
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
  readOnlyInput: { color: Colors.textTertiary },
  finishBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  finishBtnText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
});

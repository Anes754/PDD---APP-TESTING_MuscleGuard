import React, { useEffect, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';
import { ApiServices } from '../api/client';
import { AppStorage, StorageKeys } from '../storage';

export const ProfileScreen = ({ navigation, route }: any) => {
  const isNewUser = route.params?.isNewUser || false;
  const [name, setName] = useState('Anes md');
  const [age, setAge] = useState('25');
  const [gender, setGender] = useState('Male');
  const [height, setHeight] = useState('170');
  const [weight, setWeight] = useState('75');
  const [goalWeight, setGoalWeight] = useState(68);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const u = await AppStorage.get(StorageKeys.USER);
      if (u) setUser(u);
      const p = await AppStorage.get(StorageKeys.PROFILE);
      if (p) {
        if (p.name) setName(p.name);
        if (p.age) setAge(String(p.age));
        if (p.gender) setGender(p.gender);
        if (p.height) setHeight(String(p.height));
        if (p.weight) setWeight(String(p.weight));
        if (p.goal_weight) setGoalWeight(p.goal_weight);
      }
    })();
  }, []);

  const wNum = parseFloat(weight) || 75;
  const hNum = parseFloat(height) || 170;
  const bmi = hNum > 0 ? wNum / ((hNum / 100) * (hNum / 100)) : 0;
  let bmiCategory = 'Overweight range';
  let bmiColor = Colors.yellow;
  if (bmi < 18.5) {
    bmiCategory = 'Underweight range';
    bmiColor = Colors.blueLight;
  } else if (bmi < 25) {
    bmiCategory = 'Normal range';
    bmiColor = Colors.green;
  } else if (bmi >= 30) {
    bmiCategory = 'Obese range';
    bmiColor = Colors.red;
  }

  const handleSave = async () => {
    if (!user) return;
    const profileData = {
      user_id: user.user_id,
      name,
      age: parseInt(age) || 25,
      gender,
      height: parseFloat(height) || 170,
      weight: parseFloat(weight) || 75,
      goal_weight: goalWeight,
    };

    try {
      await ApiServices.saveProfile(profileData);
      await AppStorage.set(StorageKeys.PROFILE, profileData);

      if (isNewUser) {
        navigation.navigate('Baseline');
      } else {
        Alert.alert('Success', 'Profile updated!');
        navigation.replace('MainTabs');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save profile');
    }
  };

  const handleLogout = async () => {
    await AppStorage.clear();
    navigation.replace('Login');
  };

  return (
    <LinearGradient colors={[Colors.bgRadialCore, Colors.bgMain]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* TOPBAR */}
          <View style={styles.topbar}>
            <Text style={styles.logo}>💪 MUSCLEGUARD AI</Text>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.replace('MainTabs')}
            >
              <Text style={styles.backBtnText}>⬅ DASHBOARD</Text>
            </TouchableOpacity>
          </View>

          {/* HERO CARD */}
          <GlassCard>
            <Text style={styles.heroTitle}>PROFILE SETTINGS</Text>
            <Text style={styles.heroSub}>Update your personal details and muscle targets</Text>
          </GlassCard>

          {/* FORM CARD */}
          <GlassCard>
            <Text style={styles.sectionTitle}>PERSONAL INFORMATION</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>👤 FULL NAME</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>🎂 AGE</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
              />
            </View>

            {/* GENDER TOGGLE */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>🚻 GENDER</Text>
              <View style={styles.genderToggle}>
                <TouchableOpacity
                  style={[styles.genderBtn, gender === 'Male' && styles.genderBtnActive]}
                  onPress={() => setGender('Male')}
                >
                  <Text style={[styles.genderText, gender === 'Male' && styles.genderTextActive]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderBtn, gender === 'Female' && styles.genderBtnActive]}
                  onPress={() => setGender('Female')}
                >
                  <Text style={[styles.genderText, gender === 'Female' && styles.genderTextActive]}>Female</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>📏 HEIGHT (CM)</Text>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>⚖️ CURRENT WEIGHT (KG)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
              />
            </View>

            {/* GOAL WEIGHT */}
            <View style={styles.fieldGroup}>
              <View style={styles.goalHeader}>
                <Text style={styles.label}>🎯 GOAL WEIGHT (KG)</Text>
                <Text style={styles.goalVal}>{goalWeight} kg</Text>
              </View>
              <View style={styles.goalRow}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setGoalWeight((g) => Math.max(40, g - 1))}
                >
                  <Text style={styles.stepBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.goalDisplay}>{goalWeight} KG</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setGoalWeight((g) => Math.min(120, g + 1))}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* LIVE BMI */}
            <View style={styles.bmiBox}>
              <Text style={styles.bmiLabel}>LIVE BMI</Text>
              <Text style={[styles.bmiNumber, { color: bmiColor }]}>{bmi.toFixed(1)}</Text>
              <Text style={styles.bmiCat}>{bmiCategory}</Text>
            </View>
          </GlassCard>

          {/* SAVE BUTTON */}
          <TouchableOpacity onPress={handleSave} activeOpacity={0.8} style={[styles.saveBtn, { backgroundColor: Colors.blue }]}>
            <Text style={styles.saveBtnText}>SAVE PROFILE ➜</Text>
          </TouchableOpacity>

          {/* LOGOUT BUTTON */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>🔓 LOG OUT</Text>
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
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  logo: { fontSize: 16, fontWeight: '900', color: Colors.blueLight },
  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  backBtnText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  heroTitle: { fontSize: 18, fontWeight: '900', color: Colors.blueLight },
  heroSub: { fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: Colors.textPrimary, marginBottom: 16 },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: Colors.glassBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  genderToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: Colors.glassBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
  },
  genderBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  genderBtnActive: { backgroundColor: 'rgba(10, 132, 255, 0.3)' },
  genderText: { color: Colors.textSecondary, fontSize: 14 },
  genderTextActive: { color: Colors.textPrimary, fontWeight: '700' },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalVal: { color: Colors.blueLight, fontWeight: '700', fontSize: 13 },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  goalDisplay: { fontSize: 18, fontWeight: '900', color: Colors.textPrimary },
  bmiBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: Colors.glassBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  bmiLabel: { fontSize: 12, fontWeight: '700', color: Colors.textTertiary },
  bmiNumber: { fontSize: 20, fontWeight: '900' },
  bmiCat: { fontSize: 12, color: Colors.textSecondary },
  saveBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  logoutBtn: {
    height: 48,
    borderRadius: 12,
    borderColor: 'rgba(255, 69, 58, 0.4)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  logoutBtnText: { color: Colors.red, fontSize: 14, fontWeight: '800' },
});

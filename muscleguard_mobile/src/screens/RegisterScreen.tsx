import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';
import { ApiServices } from '../api/client';
import { AppStorage, StorageKeys } from '../storage';

export const RegisterScreen = ({ navigation }: any) => {
  const [role, setRole] = useState<'client' | 'coach'>('client');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [coachCode, setCoachCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const res = await ApiServices.register(username, password, role);
      if (res.success) {
        await AppStorage.set(StorageKeys.USER, res.user);
        if (role === 'client' && coachCode) {
          try {
            await ApiServices.linkCoach(res.user.user_id, coachCode);
          } catch (e) {
            console.log('Coach link error:', e);
          }
        }
        if (role === 'coach') {
          navigation.replace('CoachDashboard');
        } else {
          navigation.replace('Onboarding', { isNewUser: true });
        }
      } else {
        Alert.alert('Registration Failed', res.message || 'Error creating account');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[Colors.bgRadialCore, Colors.bgMain]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <GlassCard style={styles.card}>
            <Text style={styles.logo}>💪 MUSCLEGUARD AI</Text>
            <Text style={styles.title}>Create Account</Text>

            {/* Role Toggle */}
            <View style={styles.roleToggle}>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'client' && styles.roleBtnActive]}
                onPress={() => setRole('client')}
              >
                <Text style={[styles.roleText, role === 'client' && styles.roleTextActive]}>Client</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'coach' && styles.roleBtnActive]}
                onPress={() => setRole('coach')}
              >
                <Text style={[styles.roleText, role === 'coach' && styles.roleTextActive]}>Coach</Text>
              </TouchableOpacity>
            </View>

            {/* Username Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>CHOOSE USERNAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter username"
                placeholderTextColor={Colors.textTertiary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            {/* Password Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>CREATE PASSWORD</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {/* Optional Coach Code Field */}
            {role === 'client' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>COACH CODE (OPTIONAL)</Text>
                <TextInput
                  style={[styles.input, { textTransform: 'uppercase' }]}
                  placeholder="E.G. ABCDEF"
                  placeholderTextColor={Colors.textTertiary}
                  value={coachCode}
                  onChangeText={setCoachCode}
                  autoCapitalize="characters"
                />
              </View>
            )}

            {/* Register Button */}
            <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.8} style={[styles.primaryBtn, { backgroundColor: Colors.blue }]}>
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>CREATE ACCOUNT</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>
                Already have an account? <Text style={styles.linkHighlight}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  logo: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.blueLight,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 24,
  },
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: Colors.glassBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    width: '100%',
    marginBottom: 20,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  roleBtnActive: {
    backgroundColor: Colors.blue,
  },
  roleText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  roleTextActive: {
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  fieldGroup: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textTertiary,
    marginBottom: 6,
    letterSpacing: 1,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: Colors.glassBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  primaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerLink: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 20,
  },
  linkHighlight: {
    color: Colors.blueLight,
    fontWeight: '700',
  },
});

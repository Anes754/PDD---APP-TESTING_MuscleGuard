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

export const LoginScreen = ({ navigation }: any) => {
  const [role, setRole] = useState<'client' | 'coach'>('client');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      const res = await ApiServices.login(username, password);
      if (res.success) {
        await AppStorage.set(StorageKeys.USER, res.user);
        if (res.user.role === 'coach') {
          navigation.replace('CoachDashboard');
        } else if (res.profile_exists) {
          navigation.replace('MainTabs');
        } else {
          navigation.replace('Onboarding', { isNewUser: true });
        }
      } else {
        Alert.alert('Login Failed', res.message || 'Invalid credentials');
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
            <Text style={styles.logo}>💪 MUSCLEGUARD</Text>
            <Text style={styles.title}>Welcome Back</Text>

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
              <Text style={styles.label}>USERNAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your username"
                placeholderTextColor={Colors.textTertiary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            {/* Password Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {/* Existing User Login Button */}
            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.8} style={[styles.primaryBtn, { backgroundColor: Colors.blue }]}>
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>EXISTING USER LOGIN</Text>
              )}
            </TouchableOpacity>

            {/* New User Register Link Button */}
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.secondaryBtnText}>NEW USER? GET STARTED</Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>Secure fitness monitoring</Text>
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
  secondaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    borderColor: Colors.glassBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryBtnText: {
    color: Colors.blueLight,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 24,
  },
});

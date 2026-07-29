import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';
import { ApiServices } from '../api/client';
import { AppStorage, StorageKeys } from '../storage';

export const CoachDashboardScreen = ({ navigation }: any) => {
  const [user, setUser] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const u = await AppStorage.get(StorageKeys.USER);
      if (u) {
        setUser(u);
        const res = await ApiServices.getCoachClients(u.user_id);
        if (res.success) {
          console.log('Fetched clients with unread counts:', res.clients.map((c: any) => ({ name: c.profile?.name, unread: c.unread_count })));
          setClients(res.clients || []);
        }
      }
    } catch (e) {
      console.log('Failed to load coach clients', e);
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
      const interval = setInterval(loadData, 10000); // Poll every 10s for new messages/risk updates
      return () => clearInterval(interval);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleLogout = async () => {
    await AppStorage.clear();
    navigation.replace('Login');
  };

  const totalClients = clients.length;
  const highRiskCount = clients.filter(c => (c.latest_prediction?.risk_label || 'Low') === 'High').length;
  const modRiskCount = clients.filter(c => (c.latest_prediction?.risk_label || 'Low') === 'Moderate').length;
  const lowRiskCount = clients.filter(c => (c.latest_prediction?.risk_label || 'Low') === 'Low').length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blueLight} />}
      >
        <View style={styles.coachHeader}>
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.gradientHeaderTitle}>Coach Dashboard</Text>
            <Text style={styles.headerSubtitle}>Welcome back, <Text style={{ color: '#FFF', fontWeight: '700' }}>{user?.name || 'Coach'}</Text></Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={styles.coachCodeBadge}>
              <Text style={{ color: Colors.blueLight, fontSize: 13, fontWeight: '700' }}>Code: {user?.coach_code || '------'}</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.ghostBtn}>
              <Text style={styles.ghostBtnText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <GlassCard style={{ ...styles.statCardMobile, width: '48%' }}>
            <Text style={styles.statLabelSm}>Total Clients</Text>
            <Text style={styles.statValueLg}>{totalClients}</Text>
          </GlassCard>
          <GlassCard style={{ ...styles.statCardMobile, width: '48%', borderTopWidth: 3, borderTopColor: Colors.red }}>
            <Text style={styles.statLabelSm}>High Risk</Text>
            <Text style={[styles.statValueLg, { color: Colors.red }]}>{highRiskCount}</Text>
          </GlassCard>
          <GlassCard style={{ ...styles.statCardMobile, width: '48%', borderTopWidth: 3, borderTopColor: Colors.yellow }}>
            <Text style={styles.statLabelSm}>Moderate Risk</Text>
            <Text style={[styles.statValueLg, { color: Colors.yellow }]}>{modRiskCount}</Text>
          </GlassCard>
          <GlassCard style={{ ...styles.statCardMobile, width: '48%', borderTopWidth: 3, borderTopColor: Colors.green }}>
            <Text style={styles.statLabelSm}>Low Risk</Text>
            <Text style={[styles.statValueLg, { color: Colors.green }]}>{lowRiskCount}</Text>
          </GlassCard>
        </View>

        <Text style={styles.sectionTitle}>Active Clients</Text>
        
        {loading ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyStateIcon}>⏳</Text>
            <Text style={styles.emptyTitle}>Loading Clients...</Text>
          </GlassCard>
        ) : clients.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyStateIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Clients Yet</Text>
            <Text style={styles.emptySubText}>Share your Coach Code <Text style={{ color: Colors.blueLight, fontWeight: '700' }}>{user?.coach_code}</Text> with your clients to link them to your dashboard.</Text>
          </GlassCard>
        ) : (
          clients.map((client) => {
            const risk_label = client.latest_prediction?.risk_label || 'Low';
            const risk_color = risk_label === 'High' ? Colors.red : risk_label === 'Moderate' ? Colors.yellow : Colors.green;
            const unreadCount = client.unread_count || 0;

            const p = client.profile || {};
            const weight = p.weight ? `${p.weight}kg` : "—";
            const goal = p.goal_weight ? `${p.goal_weight}kg` : "—";
            const bmi = client.latest_prediction?.bmi ? client.latest_prediction.bmi.toFixed(1) : "—";

            return (
              <GlassCard key={client.client_id} style={styles.clientCard}>
                <View style={styles.clientHeader}>
                  <Text style={styles.clientName}>{p.name || 'Unknown Client'}</Text>
                  <View style={[styles.badge, { backgroundColor: risk_color + '33', borderColor: risk_color, borderWidth: 1 }]}>
                    <Text style={[styles.badgeText, { color: risk_color }]}>{risk_label.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.clientStatsRow}>
                  <View style={styles.clientStat}>
                    <Text style={styles.clientStatLabel}>Weight</Text>
                    <Text style={styles.clientStatVal}>{weight}</Text>
                  </View>
                  <View style={styles.clientStat}>
                    <Text style={styles.clientStatLabel}>Goal</Text>
                    <Text style={styles.clientStatVal}>{goal}</Text>
                  </View>
                  <View style={styles.clientStat}>
                    <Text style={styles.clientStatLabel}>BMI</Text>
                    <Text style={styles.clientStatVal}>{bmi}</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('ClientProgress', { clientId: client.client_id, clientName: client.profile?.name })}
                  >
                    <Text style={styles.actionText}>📊 View Progress</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('Chat', { clientId: client.client_id, clientName: client.profile?.name })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.actionText}>💬 Message</Text>
                    </View>
                    {unreadCount > 0 && (
                      <View style={styles.clientBadge}>
                        <Text style={styles.clientBadgeText}>{unreadCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </GlassCard>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgMain,
  },
  scroll: {
    padding: 20,
    paddingTop: 40,
  },
  coachHeader: {
    marginBottom: 24,
    width: '100%',
  },
  gradientHeaderTitle: {
    color: Colors.blueLight, // Approximating the gradient text
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: Colors.textTertiary,
    fontSize: 14,
    marginTop: 4,
  },
  coachCodeBadge: {
    flex: 1,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    borderColor: 'rgba(10, 132, 255, 0.25)',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  ghostBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCardMobile: {
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  statLabelSm: {
    fontSize: 11,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
    textAlign: 'center',
  },
  statValueLg: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 4,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 8,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 30,
    marginTop: 20,
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
  },
  emptySubText: {
    color: Colors.textTertiary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  clientCard: {
    marginBottom: 16,
    padding: 16,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  clientStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 10,
  },
  clientStat: {
    alignItems: 'center',
    flex: 1,
  },
  clientStatLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  clientStatVal: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '700',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    position: 'relative',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  clientBadge: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: Colors.red,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  clientBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
});

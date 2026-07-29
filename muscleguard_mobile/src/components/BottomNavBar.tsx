import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

interface BottomNavBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ state, descriptors, navigation }) => {
  const tabs = [
    { name: 'Home', emoji: '🏠' },
    { name: 'Profile', emoji: '👤' },
    { name: 'Workout', emoji: '💪' },
    { name: 'Results', emoji: '📊' },
    { name: 'Chat', emoji: '💬' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const tabInfo = tabs.find((t) => t.name === route.name) || { name: route.name, emoji: '📱' };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[styles.tabItem, isFocused && styles.tabItemFocused]}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{tabInfo.emoji}</Text>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}>
                {tabInfo.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(18, 18, 24, 0.8)',
    borderRadius: 20,
    padding: 6,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    borderRadius: 12,
  },
  tabItemFocused: {
    backgroundColor: 'rgba(10, 132, 255, 0.14)',
  },
  emoji: {
    fontSize: 15,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    color: '#a1a1aa', // Muted
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tabLabelFocused: {
    color: '#60a5fa', // Active blue
  },
});

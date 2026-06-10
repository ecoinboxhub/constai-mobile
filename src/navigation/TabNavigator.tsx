import React, { useRef, useEffect } from "react";
import { View, TouchableOpacity, Text, StyleSheet, Animated } from "react-native";
import { NavProvider, useNav } from "./NavContext";

interface Tab {
  key: string;
  label: string;
  icon: string;
}

interface TabNavigatorProps {
  tabs: Tab[];
  screens: Record<string, React.FC>;
}

function TabBar({ tabs }: { tabs: Tab[] }) {
  const { activeTab, navigate } = useNav();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const idx = tabs.findIndex((t) => t.key === activeTab);

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: idx, friction: 8, tension: 60, useNativeDriver: true }).start();
  }, [activeTab]);

  const indicatorWidth = 100 / tabs.length;

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={styles.tab}
          onPress={() => navigate(tab.key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === tab.key && styles.tabIconActive]}>{tab.icon}</Text>
          <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
      <Animated.View
        style={[styles.activeIndicator, { width: `${indicatorWidth}%`, transform: [{ translateX: slideAnim.interpolate({ inputRange: [0, tabs.length - 1], outputRange: [0, (tabs.length - 1) * indicatorWidth] }) }] }]}
      />
    </View>
  );
}

export default function TabNavigator({ tabs, screens }: TabNavigatorProps) {
  return (
    <NavProvider>
      <TabNavigatorInner tabs={tabs} screens={screens} />
    </NavProvider>
  );
}

function TabNavigatorInner({ tabs, screens }: TabNavigatorProps) {
  const { activeTab } = useNav();
  const Screen = screens[activeTab];
  return (
    <View style={styles.container}>
      <View style={styles.screenArea} key={activeTab}>
        {Screen ? <Screen /> : null}
      </View>
      <TabBar tabs={tabs} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  screenArea: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingBottom: 24,
    paddingTop: 8,
    position: "relative",
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 4, zIndex: 2 },
  tabIcon: { fontSize: 16, color: "#64748b" },
  tabIconActive: { color: "#3b82f6" },
  tabLabel: { fontSize: 9, color: "#64748b", marginTop: 2 },
  tabLabelActive: { color: "#fff", fontWeight: "600" },
  activeIndicator: { position: "absolute", top: 0, height: 2, backgroundColor: "#3b82f6", borderRadius: 1, zIndex: 1 },
});

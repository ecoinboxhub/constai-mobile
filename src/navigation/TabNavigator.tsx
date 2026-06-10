import React, { useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";

interface Tab {
  key: string;
  label: string;
  icon: string;
}

interface TabNavigatorProps {
  tabs: Tab[];
  screens: Record<string, React.FC>;
}

export default function TabNavigator({ tabs, screens }: TabNavigatorProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? "");

  const Screen = screens[activeTab];

  return (
    <View style={styles.container}>
      <View style={styles.screenArea}>
        {Screen ? <Screen /> : null}
      </View>
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabIcon, activeTab === tab.key && styles.tabIconActive]}>
              {tab.icon}
            </Text>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 4 },
  tabActive: {},
  tabIcon: { fontSize: 18, color: "#64748b" },
  tabIconActive: { color: "#3b82f6" },
  tabLabel: { fontSize: 10, color: "#64748b", marginTop: 2 },
  tabLabelActive: { color: "#3b82f6", fontWeight: "600" },
});

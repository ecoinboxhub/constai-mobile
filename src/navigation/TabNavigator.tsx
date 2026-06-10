import React, { useState, useRef, useEffect } from "react";
import { View, TouchableOpacity, Text, StyleSheet, Animated } from "react-native";

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
  const slideAnim = useRef(new Animated.Value(0)).current;
  const prevTab = useRef(activeTab);

  useEffect(() => {
    const idx = tabs.findIndex((t) => t.key === activeTab);
    Animated.spring(slideAnim, {
      toValue: idx,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
    prevTab.current = activeTab;
  }, [activeTab, tabs]);

  const Screen = screens[activeTab];
  const indicatorWidth = 100 / tabs.length;

  return (
    <View style={styles.container}>
      <Animated.View style={styles.screenArea} key={activeTab}>
        {Screen ? <Screen /> : null}
      </Animated.View>
      <View style={styles.tabBar}>
        {tabs.map((tab, i) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabIcon,
                activeTab === tab.key && styles.tabIconActive,
              ]}
            >
              {tab.icon}
            </Text>
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.key && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
        <Animated.View
          style={[
            styles.activeIndicator,
            {
              width: `${indicatorWidth}%`,
              transform: [
                {
                  translateX: slideAnim.interpolate({
                    inputRange: [0, tabs.length - 1],
                    outputRange: [0, (tabs.length - 1) * indicatorWidth],
                  }),
                },
              ],
            },
          ]}
        />
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
    position: "relative",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    zIndex: 2,
  },
  tabIcon: { fontSize: 18, color: "#64748b" },
  tabIconActive: { color: "#3b82f6" },
  tabLabel: { fontSize: 10, color: "#64748b", marginTop: 2 },
  tabLabelActive: { color: "#fff", fontWeight: "600" },
  activeIndicator: {
    position: "absolute",
    top: 0,
    height: 2,
    backgroundColor: "#3b82f6",
    borderRadius: 1,
    zIndex: 1,
  },
});

import React from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native";

export function LoadingState({ message }: { message?: string }) {
  return (
    <View style={stateStyles.center}>
      <ActivityIndicator size="large" color="#3b82f6" />
      {message && <Text style={stateStyles.message}>{message}</Text>}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={stateStyles.center}>
      <Text style={stateStyles.errorIcon}>⚠️</Text>
      <Text style={stateStyles.title}>Something went wrong</Text>
      <Text style={stateStyles.message}>{message || "An unexpected error occurred."}</Text>
      {onRetry && (
        <TouchableOpacity style={stateStyles.retryBtn} onPress={onRetry}>
          <Text style={stateStyles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function EmptyState({ title, description }: { title?: string; description?: string }) {
  return (
    <View style={stateStyles.center}>
      <Text style={stateStyles.errorIcon}>📭</Text>
      <Text style={stateStyles.title}>{title || "Nothing here yet"}</Text>
      <Text style={stateStyles.message}>{description || "No data available."}</Text>
    </View>
  );
}

const stateStyles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  errorIcon: { fontSize: 40, marginBottom: 12 },
  title: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  message: { color: "#64748b", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 16 },
  retryBtn: { backgroundColor: "#3b82f6", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

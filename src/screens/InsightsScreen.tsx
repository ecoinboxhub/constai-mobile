import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
  Animated, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { API_BASE_URL } from "../config";

type Tab = "chat" | "rag" | "predict";

interface Message {
  role: "user" | "ai";
  content: string;
}

function ChatTab({ session }: { session: any }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hello! Ask me anything about your construction projects, risks, or portfolio." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/project-tracker/chat`, { message: input }, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      const aiContent = res.data?.response || res.data?.answer || res.data?.message || JSON.stringify(res.data);
      setMessages((prev) => [...prev, { role: "ai", content: aiContent }]);
    } catch {
      setMessages((prev) => [...prev, { role: "ai", content: "⚠️ Failed to get response. Check your connection." }]);
    } finally {
      setLoading(false);
    }
  }, [input, session]);

  return (
    <View style={tabStyles.container}>
      <ScrollView ref={scrollRef} style={tabStyles.chatArea} onContentSizeChange={() => scrollRef.current?.scrollToEnd()}>
        {messages.map((msg, i) => (
          <View key={i} style={[tabStyles.bubble, msg.role === "user" ? tabStyles.userBubble : tabStyles.aiBubble]}>
            <Text style={tabStyles.bubbleText}>{msg.content}</Text>
          </View>
        ))}
        {loading && (
          <View style={[tabStyles.bubble, tabStyles.aiBubble]}>
            <ActivityIndicator color="#3b82f6" size="small" />
          </View>
        )}
      </ScrollView>
      <View style={tabStyles.inputRow}>
        <TextInput
          style={tabStyles.chatInput}
          placeholder="Ask the AI..."
          placeholderTextColor="#475569"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity style={tabStyles.sendBtn} onPress={sendMessage} disabled={loading || !input.trim()}>
          <Text style={tabStyles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RAGTab({ session }: { session: any }) {
  const [projectId, setProjectId] = useState("");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!question.trim() || !projectId) { Alert.alert("Validation", "Project ID and question required."); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/project-tracker/rag/query`,
        { project_id: parseInt(projectId, 10), question },
        { headers: { Authorization: `Bearer ${session?.accessToken}` } },
      );
      setResult(res.data);
    } catch {
      Alert.alert("Error", "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={tabStyles.container}>
      <Text style={tabStyles.sectionTitle}>Knowledge Base Search</Text>
      <Text style={tabStyles.sectionDesc}>Search indexed project documents for specific clauses, specs, or guidelines.</Text>
      <TextInput style={tabStyles.projectInput} placeholder="Project ID" placeholderTextColor="#475569" value={projectId} onChangeText={setProjectId} keyboardType="numeric" />
      <TextInput style={tabStyles.projectInput} placeholder="e.g. What is the concrete curing time?" placeholderTextColor="#475569" value={question} onChangeText={setQuestion} />
      <TouchableOpacity style={tabStyles.actionBtn} onPress={search} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={tabStyles.actionBtnText}>Search Documents</Text>}
      </TouchableOpacity>
      {result?.answer && (
        <View style={tabStyles.resultCard}>
          <Text style={tabStyles.resultLabel}>Answer</Text>
          <Text style={tabStyles.resultText}>{result.answer}</Text>
        </View>
      )}
      {result?.sources?.map((s: any, i: number) => (
        <View key={i} style={tabStyles.sourceCard}>
          <Text style={tabStyles.sourceTitle}>{s.title || s.filename || `Source ${i + 1}`}</Text>
          <Text style={tabStyles.sourceSnippet}>{s.snippet || s.content?.substring(0, 200) || ""}</Text>
        </View>
      ))}
      {result?.source_count != null && <Text style={tabStyles.detail}>{result.source_count} sources found</Text>}
    </ScrollView>
  );
}

function PredictTab({ session }: { session: any }) {
  const [projectId, setProjectId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const predict = async () => {
    if (!projectId) { Alert.alert("Validation", "Enter a Project ID."); return; }
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/project-tracker/predictions/${projectId}`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      setResult(res.data);
    } catch {
      Alert.alert("Error", "Prediction failed. Check the Project ID and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={tabStyles.container}>
      <Text style={tabStyles.sectionTitle}>Project Predictions</Text>
      <Text style={tabStyles.sectionDesc}>AI-powered delay and budget overrun predictions for any project.</Text>
      <TextInput style={tabStyles.projectInput} placeholder="Project ID" placeholderTextColor="#475569" value={projectId} onChangeText={setProjectId} keyboardType="numeric" />
      <TouchableOpacity style={tabStyles.actionBtn} onPress={predict} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={tabStyles.actionBtnText}>Predict</Text>}
      </TouchableOpacity>
      {result && (
        <View style={tabStyles.resultCard}>
          <Text style={tabStyles.resultLabel}>Prediction Results</Text>
          {result.delay_probability != null && (
            <Text style={tabStyles.resultText}>
              Delay Risk: {(result.delay_probability * 100).toFixed(1)}%
            </Text>
          )}
          {result.budget_overrun_probability != null && (
            <Text style={tabStyles.resultText}>
              Budget Overrun Risk: {(result.budget_overrun_probability * 100).toFixed(1)}%
            </Text>
          )}
          {result.risk_classification && (
            <Text style={tabStyles.resultText}>Risk Level: {result.risk_classification}</Text>
          )}
          {result.estimated_completion_date && (
            <Text style={tabStyles.resultText}>
              Est. Completion: {result.estimated_completion_date}
            </Text>
          )}
          {result.completion_forecast != null && (
            <Text style={tabStyles.resultText}>
              Completion Forecast: {result.completion_forecast.toFixed(1)}%
            </Text>
          )}
          {result.cost_trend != null && (
            <Text style={tabStyles.resultText}>
              Cost Trend: {(result.cost_trend * 100).toFixed(1)}%
            </Text>
          )}
          {result.delay_model_version && (
            <Text style={tabStyles.detail}>Model: {result.delay_model_version}</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

export default function InsightsScreen() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "chat", label: "AI Chat" },
    { key: "rag", label: "Knowledge" },
    { key: "predict", label: "Predict" },
  ];

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
        </View>
        <View style={styles.tabBar}>
          {tabs.map((t) => (
            <TouchableOpacity key={t.key} style={[styles.tab, activeTab === t.key && styles.tabActive]} onPress={() => setActiveTab(t.key)}>
              <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {activeTab === "chat" && <ChatTab session={session} />}
        {activeTab === "rag" && <RAGTab session={session} />}
        {activeTab === "predict" && <PredictTab session={session} />}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  header: { paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12 },
  title: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  tabBar: { flexDirection: "row", marginHorizontal: 16, marginBottom: 8, backgroundColor: "#1e293b", borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: "#3b82f6" },
  tabText: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  tabTextActive: { color: "#fff" },
});

const tabStyles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  projectInput: { backgroundColor: "#0f172a", borderRadius: 10, padding: 12, color: "#fff", fontSize: 13, borderWidth: 1, borderColor: "#334155", marginBottom: 8 },
  chatArea: { flex: 1, marginBottom: 8 },
  bubble: { maxWidth: "85%", padding: 12, borderRadius: 14, marginBottom: 8 },
  userBubble: { backgroundColor: "#3b82f6", alignSelf: "flex-end", borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: "#1e293b", alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  bubbleText: { color: "#fff", fontSize: 14, lineHeight: 20 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  chatInput: { flex: 1, backgroundColor: "#1e293b", borderRadius: 10, padding: 12, color: "#fff", fontSize: 14, borderWidth: 1, borderColor: "#334155" },
  sendBtn: { backgroundColor: "#3b82f6", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18 },
  sendText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  sectionTitle: { color: "#fff", fontSize: 17, fontWeight: "600", marginBottom: 6 },
  sectionDesc: { color: "#64748b", fontSize: 12, marginBottom: 16, lineHeight: 18 },
  actionBtn: { backgroundColor: "#3b82f6", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginBottom: 16 },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  resultCard: { backgroundColor: "#1e293b", borderRadius: 12, padding: 14, marginBottom: 12 },
  resultLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginBottom: 6 },
  resultText: { color: "#e2e8f0", fontSize: 14, lineHeight: 22, marginBottom: 4 },
  sourceCard: { backgroundColor: "#1e293b", borderRadius: 8, padding: 10, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: "#3b82f6" },
  sourceTitle: { color: "#fff", fontSize: 12, fontWeight: "600" },
  sourceSnippet: { color: "#64748b", fontSize: 11, marginTop: 4 },
  recommendation: { color: "#f59e0b", fontSize: 13, marginTop: 6, lineHeight: 18 },
  detail: { color: "#64748b", fontSize: 12, marginTop: 4 },
});

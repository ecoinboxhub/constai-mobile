import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput,
  Animated, ActivityIndicator, Alert,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { API_BASE_URL } from "../config";

interface Worker {
  id: number;
  first_name: string;
  last_name: string;
  role_type: string;
  status: string;
  phone?: string;
}

export default function WorkforceScreen() {
  const { session } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roleType, setRoleType] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/workforce/`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      setWorkers(Array.isArray(res.data) ? res.data : res.data?.workers || []);
    } catch {
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  const addWorker = async () => {
    if (!firstName || !lastName || !roleType) { Alert.alert("Validation", "First name, last name, and role required."); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/workforce/`, { first_name: firstName, last_name: lastName, role_type: roleType, phone }, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      Alert.alert("Success", "Worker added.");
      setFirstName(""); setLastName(""); setRoleType(""); setPhone("");
      setShowForm(false);
      fetchWorkers();
    } catch {
      Alert.alert("Error", "Failed to add worker.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, padding: 16 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Workforce</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(!showForm)}>
            <Text style={styles.addBtnText}>{showForm ? "Cancel" : "+ Add"}</Text>
          </TouchableOpacity>
        </View>

        {showForm && (
          <View style={styles.formCard}>
            <TextInput style={styles.input} placeholder="First Name" placeholderTextColor="#475569" value={firstName} onChangeText={setFirstName} />
            <TextInput style={styles.input} placeholder="Last Name" placeholderTextColor="#475569" value={lastName} onChangeText={setLastName} />
            <TextInput style={styles.input} placeholder="Role (e.g. mason, supervisor)" placeholderTextColor="#475569" value={roleType} onChangeText={setRoleType} />
            <TextInput style={styles.input} placeholder="Phone (optional)" placeholderTextColor="#475569" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <TouchableOpacity style={styles.btn} onPress={addWorker} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Add Worker</Text>}
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />
        ) : workers.length === 0 ? (
          <Text style={styles.empty}>No workforce members yet.</Text>
        ) : (
          workers.map((w) => (
            <View key={w.id} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardName}>{w.first_name} {w.last_name}</Text>
                  <Text style={styles.cardRole}>{w.role_type}</Text>
                  {w.phone ? <Text style={styles.cardPhone}>{w.phone}</Text> : null}
                </View>
                <View style={[styles.statusBadge, w.status === "active" ? styles.activeStatus : styles.inactiveStatus]}>
                  <Text style={styles.statusText}>{w.status}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 48, marginBottom: 16 },
  title: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  addBtn: { backgroundColor: "#3b82f6", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  formCard: { backgroundColor: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 16 },
  input: { backgroundColor: "#0f172a", borderRadius: 10, padding: 12, color: "#fff", marginBottom: 10, fontSize: 14, borderWidth: 1, borderColor: "#334155" },
  btn: { backgroundColor: "#3b82f6", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  card: { backgroundColor: "#1e293b", borderRadius: 12, padding: 14, marginBottom: 8 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLeft: { flex: 1 },
  cardName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  cardRole: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  cardPhone: { color: "#64748b", fontSize: 11, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  activeStatus: { backgroundColor: "rgba(34,197,94,0.2)" },
  inactiveStatus: { backgroundColor: "rgba(239,68,68,0.2)" },
  statusText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  empty: { color: "#64748b", fontSize: 13, textAlign: "center", marginTop: 40 },
});

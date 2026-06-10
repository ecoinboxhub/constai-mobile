import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { getDbConnection } from "../../services/dbService";
import { capturePhotoOnSite, selectGalleryPhoto, selectDocumentFile, VoiceNoteRecorder } from "../../services/mediaService";
import { getUploadQueueSummary } from "../../services/uploadService";
import { ProjectDTO } from "../../shared/types";

const recorder = new VoiceNoteRecorder();

export default function MediaScreen() {
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadSummary, setUploadSummary] = useState({ pending: 0, uploading: 0, synced: 0, failed: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const db = await getDbConnection();
      const rows = await db.getAllAsync<ProjectDTO>("SELECT * FROM projects ORDER BY id DESC;");
      setProjects(rows);
      const summary = await getUploadQueueSummary();
      setUploadSummary(summary);
    } catch (err) {
      console.error("Failed to load", err);
    }
  };

  const requireProject = () => {
    if (!selectedId) {
      Alert.alert("Required", "Select a project first.");
      return false;
    }
    return true;
  };

  const handlePhoto = async () => {
    if (!requireProject()) return;
    try {
      const result = await capturePhotoOnSite(selectedId!.toString());
      if (result) {
        Alert.alert("Success", "Photo captured and queued.");
        await loadData();
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleGallery = async () => {
    if (!requireProject()) return;
    try {
      const result = await selectGalleryPhoto(selectedId!.toString());
      if (result) {
        Alert.alert("Success", "Photo queued.");
        await loadData();
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleDocument = async () => {
    if (!requireProject()) return;
    try {
      const result = await selectDocumentFile(selectedId!.toString());
      if (result) {
        Alert.alert("Success", "Document queued.");
        await loadData();
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleVoice = async () => {
    if (!requireProject()) return;
    try {
      if (!isRecording) {
        await recorder.startRecording();
        setIsRecording(true);
      } else {
        const result = await recorder.stopRecording(selectedId!.toString());
        setIsRecording(false);
        if (result) {
          Alert.alert("Success", "Voice note queued.");
          await loadData();
        }
      }
    } catch (err: any) {
      setIsRecording(false);
      Alert.alert("Error", err.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Media</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Select Project</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {projects.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.chip, selectedId === p.id && styles.chipActive]}
              onPress={() => setSelectedId(p.id)}
            >
              <Text style={[styles.chipText, selectedId === p.id && styles.chipTextActive]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Actions</Text>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.actionBtn} onPress={handlePhoto}>
            <Text style={styles.actionBtnText}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleGallery}>
            <Text style={styles.actionBtnText}>Gallery</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleDocument}>
            <Text style={styles.actionBtnText}>Document</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, isRecording && styles.activeBtn]}
            onPress={handleVoice}
          >
            <Text style={styles.actionBtnText}>{isRecording ? "Stop" : "Voice"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upload Queue</Text>
        <Text style={styles.queueText}>{uploadSummary.pending} pending &middot; {uploadSummary.uploading} uploading &middot; {uploadSummary.failed} failed</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  header: { paddingTop: 48, marginBottom: 16 },
  title: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  card: { backgroundColor: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { color: "#fff", fontSize: 14, fontWeight: "600", marginBottom: 12 },
  chip: { backgroundColor: "#0f172a", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: "#334155" },
  chipActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  chipText: { color: "#64748b", fontSize: 12 },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  grid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  actionBtn: { backgroundColor: "#0f172a", flex: 0.48, borderRadius: 8, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#334155" },
  activeBtn: { backgroundColor: "#ef4444", borderColor: "#ef4444" },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  queueText: { color: "#94a3b8", fontSize: 13 },
});

import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import axios from "axios";
import { API_BASE_URL } from "../config";

interface Project {
  id: number;
  name: string;
  location: string;
}

interface ProjectPickerProps {
  session: any;
  selectedProjectId: number | null;
  onSelect: (projectId: number) => void;
  label?: string;
}

export default function ProjectPicker({ session, selectedProjectId, onSelect, label }: ProjectPickerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/project-tracker/projects`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      setProjects(res.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const selected = projects.find((p) => p.id === selectedProjectId);

  return (
    <View>
      <TouchableOpacity style={pickerStyles.selector} onPress={() => setVisible(true)}>
        <Text style={pickerStyles.selectorText}>
          {loading ? "Loading..." : selected ? `${selected.name} (ID: ${selected.id})` : label || "Select a project..."}
        </Text>
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="slide">
        <View style={pickerStyles.overlay}>
          <View style={pickerStyles.modal}>
            <Text style={pickerStyles.modalTitle}>Select Project</Text>
            {loading && <ActivityIndicator color="#3b82f6" />}
            <FlatList
              data={projects}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={pickerStyles.item}
                  onPress={() => {
                    onSelect(item.id);
                    setVisible(false);
                  }}
                >
                  <Text style={pickerStyles.itemName}>{item.name}</Text>
                  <Text style={pickerStyles.itemLocation}>{item.location}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={pickerStyles.empty}>No projects found</Text>}
            />
            <TouchableOpacity style={pickerStyles.closeBtn} onPress={() => setVisible(false)}>
              <Text style={pickerStyles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  selector: { backgroundColor: "#1e293b", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#334155", marginBottom: 8 },
  selectorText: { color: "#e2e8f0", fontSize: 13 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#0f172a", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: "70%" },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 12 },
  item: { paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  itemName: { color: "#e2e8f0", fontSize: 15, fontWeight: "600" },
  itemLocation: { color: "#64748b", fontSize: 12, marginTop: 2 },
  empty: { color: "#64748b", textAlign: "center", padding: 20 },
  closeBtn: { marginTop: 12, paddingVertical: 12, alignItems: "center" },
  closeText: { color: "#3b82f6", fontSize: 16, fontWeight: "600" },
});

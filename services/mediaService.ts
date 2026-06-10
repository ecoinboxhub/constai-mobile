import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { Platform } from "react-native";
import { queueOfflineUpload } from "./uploadService";

// Check and request media camera/gallery permissions
export async function requestMediaPermissions(): Promise<boolean> {
  if (Platform.OS !== "web") {
    const cameraRes = await ImagePicker.requestCameraPermissionsAsync();
    const libraryRes = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const audioRes = await Audio.requestPermissionsAsync();
    
    return (
      cameraRes.status === "granted" &&
      libraryRes.status === "granted" &&
      audioRes.status === "granted"
    );
  }
  return true;
}

// 1. Capture direct photo from device camera
export async function capturePhotoOnSite(projectId: string): Promise<string | null> {
  const permitted = await requestMediaPermissions();
  if (!permitted) {
    throw new Error("Permissions for camera or audio access denied.");
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.6, // Client-side image scaling to optimize bandwidth
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const fileUuid = `upload-img-${Date.now()}`;
  
  // Enqueue file locally
  await queueOfflineUpload({
    id: fileUuid,
    project_id: projectId,
    file_name: `${fileUuid}.jpg`,
    file_uri: asset.uri,
    file_type: "image/jpeg",
  });

  return fileUuid;
}

// 2. Select image from device gallery
export async function selectGalleryPhoto(projectId: string): Promise<string | null> {
  const permitted = await requestMediaPermissions();
  if (!permitted) {
    throw new Error("Permissions denied.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.6,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const fileUuid = `upload-img-${Date.now()}`;
  
  await queueOfflineUpload({
    id: fileUuid,
    project_id: projectId,
    file_name: `${fileUuid}.jpg`,
    file_uri: asset.uri,
    file_type: "image/jpeg",
  });

  return fileUuid;
}

// 3. Browse and upload structural PDF/BOQ documents
export async function selectDocumentFile(projectId: string): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "text/plain"],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  
  // Validate maximum 15MB file size constraint to protect low-bandwidth sites
  const maxBytes = 15 * 1024 * 1024;
  if (asset.size && asset.size > maxBytes) {
    throw new Error("File exceeds the maximum size constraint (15MB).");
  }

  const fileUuid = `upload-doc-${Date.now()}`;
  
  await queueOfflineUpload({
    id: fileUuid,
    project_id: projectId,
    file_name: asset.name,
    file_uri: asset.uri,
    file_type: asset.mimeType || "application/pdf",
  });

  return fileUuid;
}

// 4. Site Voice Note Recorder session
export class VoiceNoteRecorder {
  private recording: Audio.Recording | null = null;

  async startRecording() {
    try {
      const permitted = await requestMediaPermissions();
      if (!permitted) throw new Error("Audio permissions denied.");

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      this.recording = recording;
      console.log("Voice recorder: Session recording started.");
    } catch (err) {
      console.error("Failed to start audio recording", err);
      throw err;
    }
  }

  async stopRecording(projectId: string): Promise<string | null> {
    if (!this.recording) return null;

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;

      if (!uri) return null;

      const fileUuid = `upload-audio-${Date.now()}`;
      
      // Enqueue voice note for background transcription
      await queueOfflineUpload({
        id: fileUuid,
        project_id: projectId,
        file_name: `${fileUuid}.m4a`,
        file_uri: uri,
        file_type: "audio/m4a",
      });

      return fileUuid;
    } catch (err) {
      console.error("Failed to stop voice recording", err);
      throw err;
    }
  }
}

import { launchCamera, launchImageLibrary, requestCameraPermission, requestMediaLibraryPermission, Permission } from "react-native-image-picker";
import DocumentPicker from "react-native-document-picker";
import { Platform, PermissionsAndroid } from "react-native";
import { queueOfflineUpload } from "./uploadService";

async function requestAudioPermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        { title: "Microphone Permission", message: "ConstAI needs access to your microphone to record voice notes." }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }
  return true;
}

export async function requestMediaPermissions(): Promise<boolean> {
  if (Platform.OS !== "web") {
    const cameraRes = await requestCameraPermission();
    const libraryRes = await requestMediaLibraryPermission();
    const audioRes = await requestAudioPermission();
    return (
      cameraRes === "granted" || cameraRes === true &&
      libraryRes === "granted" || libraryRes === true &&
      audioRes
    );
  }
  return true;
}

export async function capturePhotoOnSite(projectId: string): Promise<string | null> {
  const result = await launchCamera({
    mediaType: "photo",
    quality: 0.6,
  });

  if (result.didCancel || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const fileUuid = `upload-img-${Date.now()}`;
  
  await queueOfflineUpload({
    id: fileUuid,
    project_id: projectId,
    file_name: `${fileUuid}.jpg`,
    file_uri: asset.uri || "",
    file_type: asset.type || "image/jpeg",
  });

  return fileUuid;
}

export async function selectGalleryPhoto(projectId: string): Promise<string | null> {
  const result = await launchImageLibrary({
    mediaType: "photo",
    quality: 0.6,
  });

  if (result.didCancel || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const fileUuid = `upload-img-${Date.now()}`;
  
  await queueOfflineUpload({
    id: fileUuid,
    project_id: projectId,
    file_name: `${fileUuid}.jpg`,
    file_uri: asset.uri || "",
    file_type: asset.type || "image/jpeg",
  });

  return fileUuid;
}

export async function selectDocumentFile(projectId: string): Promise<string | null> {
  const result = await DocumentPicker.pick({
    type: [DocumentPicker.types.pdf, DocumentPicker.types.plainText],
  });

  if (!result || result.length === 0) {
    return null;
  }

  const asset = result[0];
  
  const maxBytes = 15 * 1024 * 1024;
  if (asset.size && asset.size > maxBytes) {
    throw new Error("File exceeds the maximum size constraint (15MB).");
  }

  const fileUuid = `upload-doc-${Date.now()}`;
  
  await queueOfflineUpload({
    id: fileUuid,
    project_id: projectId,
    file_name: asset.name || `${fileUuid}.pdf`,
    file_uri: asset.uri,
    file_type: asset.type || "application/pdf",
  });

  return fileUuid;
}

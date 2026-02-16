import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";

import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from "react-native";


const STORAGE_KEY = "HANGUPFX_SELECTED_SOUND_V1";

type SavedSound = {
  name: string;
  uri: string; // local file uri inside app sandbox
};

export default function HomeScreen() {
  const [saved, setSaved] = useState<SavedSound | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setSaved(JSON.parse(raw));
      } catch {}
    })();

    return () => {
      // unload on exit
      sound?.unloadAsync().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasSelection = useMemo(() => !!saved?.uri, [saved]);

  async function pickAndSaveSound() {
  try {
   async function pickAndSaveSound() {
  try {
    setLoading(true);

    const result = await DocumentPicker.getDocumentAsync({
  type: ["audio/*"],
  copyToCacheDirectory: true,
  multiple: false,
});


    if (result.canceled) return;

    const file = result.assets?.[0];
    if (!file?.uri) {
      Alert.alert("No file selected", "Try again and pick a sound file.");
      return;
    }

    // Make an app folder to store user sounds
    const dir = FileSystem.documentDirectory + "hangupfx/";
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

    // Copy file into app storage with a stable name
    const safeName = (file.name || "sound").replace(/[^a-z0-9._-]/gi, "_").slice(0, 80);
    const dest = `${dir}${Date.now()}_${safeName}`;

    await FileSystem.copyAsync({ from: file.uri, to: dest });

    const newSaved: SavedSound = { name: file.name || safeName, uri: dest };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSaved));
    setSaved(newSaved);

    // unload any previous sound
    if (sound) {
      await sound.unloadAsync().catch(() => {});
      setSound(null);
    }

    Alert.alert("Saved!", "Your sound is now ready to use.");
  } catch (e: any) {
    Alert.alert("Upload failed", e?.message || "Something went wrong.");
  } finally {
    setLoading(false);
  }
}


      

      
       
         
         
          
       
       
      

      
      
      if (!file?.uri) {
        Alert.alert("No file selected", "Try again and choose an audio file.");
        return;
      }

      // Make an app folder to store user sounds
      const dir = FileSystem.documentDirectory + "hangupfx/";
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

      // Copy file into app storage with a stable name
      const safeName = (file.name || "sound")
        .replace(/[^a-z0-9._-]/gi, "_")
        .slice(0, 80);

      const dest = `${dir}${Date.now()}_${safeName}`;

      await FileSystem.copyAsync({ from: file.uri, to: dest });

      const newSaved: SavedSound = { name: file.name || safeName, uri: dest };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSaved));
      setSaved(newSaved);

      // unload any previous sound
      if (sound) {
        await sound.unloadAsync().catch(() => {});
        setSound(null);
      }

      Alert.alert("Saved!", "Your sound is now ready to use.");
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function playSlam() {
    if (!saved?.uri) {
      Alert.alert("No sound selected", "Tap “Choose Sound” first.");
      return;
    }

    try {
      setLoading(true);
      setPlaying(true);

      // Request audio mode so it plays properly
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // If we already have a loaded sound, reuse it (faster)
      let s = sound;
      if (!s) {
        const created = await Audio.Sound.createAsync(
          { uri: saved.uri },
          { shouldPlay: false, volume: 1.0 }
        );
        s = created.sound;
        setSound(s);
      }

      // Replay from start
      await s.setPositionAsync(0);
      await s.playAsync();

      // Optional “END CALL” reminder (since apps cannot hang up real calls)
      // You can remove this if you don’t want it.
      setTimeout(() => {
        Alert.alert("Hang Up", "Now tap End Call on your phone screen.");
      }, 350);
    } catch (e: any) {
      Alert.alert("Play failed", e?.message || "Could not play this file.");
      // If the file is bad, clear it
    } finally {
      setLoading(false);
      setTimeout(() => setPlaying(false), 400);
    }
  }

  async function clearSelection() {
    try {
      if (sound) {
        await sound.unloadAsync().catch(() => {});
        setSound(null);
      }
      await AsyncStorage.removeItem(STORAGE_KEY);
      setSaved(null);
    } catch {}
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brand}>
        <Text style={styles.title}>HangUpFX</Text>
        <Text style={styles.subtitle}>
          Pick a sound, then hit SLAM to fake a real “hang up”.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Selected sound</Text>
        <Text style={styles.value} numberOfLines={2}>
          {hasSelection ? saved!.name : "None yet"}
        </Text>

        <View style={styles.row}>
          <Pressable
            onPress={pickAndSaveSound}
            disabled={loading}
            style={({ pressed }) => [
              styles.smallBtn,
              pressed && styles.pressed,
              loading && styles.disabled,
            ]}
          >
            <Text style={styles.smallBtnText}>
              {loading ? "Working..." : "Choose Sound"}
            </Text>
          </Pressable>

          <Pressable
            onPress={clearSelection}
            disabled={!hasSelection || loading}
            style={({ pressed }) => [
              styles.smallBtnOutline,
              pressed && styles.pressed,
              (!hasSelection || loading) && styles.disabled,
            ]}
          >
            <Text style={styles.smallBtnOutlineText}>Clear</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={playSlam}
        disabled={!hasSelection || loading || playing}
        style={({ pressed }) => [
          styles.slamButton,
          pressed && styles.slamButtonPressed,
          (!hasSelection || loading || playing) && styles.disabledBig,
        ]}
      >
        <Text style={styles.slamText}>SLAM!</Text>
        <Text style={styles.smallText}>
          {hasSelection ? "Tap to play your hang-up sound" : "Choose a sound first"}
        </Text>
      </Pressable>

      <Text style={styles.footer}>
        Tip: Apps can’t hang up real phone calls. This plays a sound so it *feels* like you did.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    backgroundColor: "#0b0b0f",
    justifyContent: "space-between",
  },
  brand: { marginBottom: 8 },
  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 1,
  },
  subtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
    marginTop: 6,
  },

  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    marginTop: 10,
  },
  label: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginBottom: 6 },
  value: { color: "white", fontSize: 16, fontWeight: "700" },
  row: { flexDirection: "row", gap: 12, marginTop: 14 },

  smallBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#1f63ff",
    alignItems: "center",
  },
  smallBtnText: { color: "white", fontWeight: "800" },

  smallBtnOutline: {
    width: 92,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
  },
  smallBtnOutlineText: { color: "white", fontWeight: "700" },

  pressed: { opacity: 0.85 },

  slamButton: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#8B0000",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
    shadowColor: "#FF0000",
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  slamButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
  slamText: {
    color: "white",
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 8,
  },
  smallText: { color: "rgba(255,255,255,0.75)", fontSize: 12 },

  footer: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 14,
  },

  disabled: { opacity: 0.6 },
  disabledBig: { opacity: 0.55 },
});

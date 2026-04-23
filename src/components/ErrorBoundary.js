import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRestart = () => {
    // Reset state untuk mencoba render ulang komponen
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconBox}>
              <Ionicons name="warning-outline" size={64} color="#ff4d6d" />
            </View>
            <Text style={styles.title}>Ups, Terjadi Kesalahan</Text>
            <Text style={styles.subtitle}>
              Sistem menemukan masalah saat memuat halaman ini. Jangan khawatir,
              data Anda tetap aman.
            </Text>

            <View style={styles.errorBox}>
              <Text style={styles.errorText} numberOfLines={3}>
                {this.state.error?.message || "Unknown Error"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={this.handleRestart}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.buttonText}>Muat Ulang Aplikasi</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212", // Fallback dark mode
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  iconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ff4d6d20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#a0a0a0",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  errorBox: {
    backgroundColor: "#ffffff05",
    padding: 16,
    borderRadius: 12,
    width: "100%",
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "#ffffff10",
  },
  errorText: {
    color: "#ff4d6d",
    fontFamily: "monospace",
    fontSize: 12,
  },
  button: {
    flexDirection: "row",
    backgroundColor: "#FF5800",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default ErrorBoundary;

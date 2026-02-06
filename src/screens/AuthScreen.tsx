import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBackground } from "../components/AppBackground";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { createAuthScreenStyles } from "../styles/AuthScreenStyles";
import { theme } from "../styles/theme";

export function AuthScreen() {
  const { size } = useSettings();
  const styles = useMemo(createAuthScreenStyles, [size]);
  const {
    status,
    reauthMessage,
    isAuthenticating,
    startAuth,
    clearReauthMessage,
  } = useAuth();

  const isChecking = status === "checking";

  return (
    <SafeAreaView style={styles.container}>
      <AppBackground />
      <View style={styles.card}>
        <Text style={styles.title}>Sign in to Slift</Text>
        <Text style={styles.subtitle}>
          Continue with your account to load your feed, graph, and synced
          profile data securely.
        </Text>

        {reauthMessage ? (
          <Pressable style={styles.notice} onPress={clearReauthMessage}>
            <Text style={styles.noticeText}>{reauthMessage}</Text>
          </Pressable>
        ) : null}

        {isChecking ? (
          <View style={styles.checkingWrap}>
            <ActivityIndicator color={theme.colors.accentBlue} />
            <Text style={styles.checkingText}>
              Checking existing session...
            </Text>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <Pressable
              onPress={startAuth}
              disabled={isAuthenticating}
              style={({ pressed }) => [
                styles.actionButton,
                isAuthenticating ? styles.actionButtonDisabled : null,
                pressed ? { opacity: 0.85 } : null,
              ]}
            >
              <Text style={styles.actionText}>
                {isAuthenticating ? "Signing in..." : "Continue with Google"}
              </Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.helperText}>
          If your session expires, you will be redirected here to
          re-authenticate.
        </Text>
      </View>
    </SafeAreaView>
  );
}

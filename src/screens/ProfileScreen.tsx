import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import {
  adminResetState,
  clearQueue,
  deleteAuthAccount,
  getTwitterLink,
  getTwitterSyncStatus,
  logoutAuthSession,
  syncTwitter,
} from "../api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useNodesData } from "../context/NodesDataContext";
import { useKnowledgeSelection } from "../context/KnowledgeSelectionContext";
import { useProfileData } from "../context/ProfileDataContext";
import { AppBackground } from "../components/AppBackground";
import { createProfileScreenStyles } from "../styles/ProfileScreenStyles";
import { theme } from "../styles/theme";
import { SettingsSizeSelector } from "../components/SettingsSizeSelector";
import { isForYouNodeId } from "../config/knowledgeNodes";
import {
  closeAuthPopup,
  getSyncRequiresAuth,
  getTwitterAuthUrlFromSyncResponse,
  openAuthPopup,
  openAuthUrl,
  type AuthPopupHandle,
  waitForTwitterAuthCompletion,
} from "../utils/twitterAuth";

export function ProfileScreen() {
  const { size } = useSettings();
  const navigation = useNavigation<any>();
  const { refreshNodes, clearNodes, data: nodesData } = useNodesData();
  const { setSelectedNode } = useKnowledgeSelection();
  const {
    data: profile,
    status: profileStatus,
    refreshProfile,
  } = useProfileData();
  const { signOut } = useAuth();
  const styles = useMemo(createProfileScreenStyles, [size]);
  const windowWidth = Dimensions.get("window").width;
  const isDesktop = windowWidth >= 1180;
  const showRightRail = windowWidth >= 1420;
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isClearingQueue, setIsClearingQueue] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const intro = useRef(new Animated.Value(0)).current;
  const latestProfileRef = useRef(profile);
  const latestNodesRef = useRef(nodesData);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SYNC_POLL_INTERVAL_MS = 3000;
  const MAX_SYNC_ATTEMPTS = 8;
  const MAX_RUNNING_ATTEMPTS = 20;
  const MAX_POST_FETCH_ATTEMPTS = 4;

  useEffect(() => {
    latestProfileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    latestNodesRef.current = nodesData;
  }, [nodesData]);

  const profileSignature = useCallback(
    (value: typeof profile | null) =>
      [
        value?.name,
        value?.handle,
        value?.avatar_url,
        value?.linked ? "linked" : "unlinked",
      ].join("|"),
    [],
  );

  const hasProfile = useCallback((value: typeof profile | null) => {
    if (!value) return false;
    if (value.linked) return true;
    return Boolean(value.name || value.handle || value.avatar_url);
  }, []);

  const clearSyncTimer = useCallback(() => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  const isProfileLoading = profileStatus === "loading";

  useEffect(() => {
    intro.setValue(0);
    Animated.timing(intro, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [intro]);

  useEffect(() => {
    return () => {
      clearSyncTimer();
    };
  }, [clearSyncTimer]);

  const startSyncPolling = useCallback(async () => {
    clearSyncTimer();
    const baselineSignature = profileSignature(latestProfileRef.current);
    const baselineNodesCount = latestNodesRef.current?.nodes?.length ?? 0;
    let requiresAuthStreak = 0;
    let syncReady = false;

    for (let attempt = 0; attempt < MAX_RUNNING_ATTEMPTS; attempt += 1) {
      const status = await getTwitterSyncStatus().catch(() => null);
      const isRunning = status?.running === true;

      if (status?.requires_auth === true) {
        requiresAuthStreak += 1;
      } else {
        requiresAuthStreak = 0;
      }

      const canConfirmAuthRequired = requiresAuthStreak >= 3 && attempt >= 2;
      if (canConfirmAuthRequired) {
        return { authRequired: true, updated: false };
      }

      const backendReady = !isRunning && status?.requires_auth !== true;
      if (backendReady && attempt >= 2) {
        syncReady = true;
        break;
      }

      if (!isRunning && attempt >= MAX_SYNC_ATTEMPTS) {
        break;
      }

      await new Promise<void>((resolve) => {
        syncTimerRef.current = setTimeout(resolve, SYNC_POLL_INTERVAL_MS);
      });
    }

    if (!syncReady) {
      return { authRequired: false, updated: false };
    }

    for (
      let fetchAttempt = 0;
      fetchAttempt < MAX_POST_FETCH_ATTEMPTS;
      fetchAttempt += 1
    ) {
      const shouldAwaitProfile = hasProfile(latestProfileRef.current);
      const nodesResponse = await refreshNodes().catch(() => null);
      let profileData = null;

      if (shouldAwaitProfile) {
        profileData = await refreshProfile({ refresh: true }).catch(() => null);
      } else {
        refreshProfile({ refresh: true }).catch(() => {});
      }

      const nextSignature = profileSignature(
        profileData ?? latestProfileRef.current,
      );
      const nextNodesCount =
        nodesResponse?.nodes?.length ??
        latestNodesRef.current?.nodes?.length ??
        0;
      const isLinked =
        (profileData ?? latestProfileRef.current)?.linked === true;
      const hasChanges =
        nextSignature !== baselineSignature ||
        nextNodesCount !== baselineNodesCount ||
        isLinked;

      if (hasChanges) {
        return { authRequired: false, updated: true };
      }

      await new Promise<void>((resolve) => {
        syncTimerRef.current = setTimeout(resolve, SYNC_POLL_INTERVAL_MS);
      });
    }

    return { authRequired: false, updated: false };
  }, [
    clearSyncTimer,
    hasProfile,
    MAX_POST_FETCH_ATTEMPTS,
    MAX_RUNNING_ATTEMPTS,
    MAX_SYNC_ATTEMPTS,
    SYNC_POLL_INTERVAL_MS,
    refreshNodes,
    refreshProfile,
    profileSignature,
  ]);

  const handleSyncTwitter = async () => {
    let popup: AuthPopupHandle | null = null;
    try {
      setIsSyncing(true);
      popup = openAuthPopup();
      const syncResponse = await syncTwitter();
      const requiresAuth = getSyncRequiresAuth(syncResponse);

      if (requiresAuth) {
        const authUrl = await getTwitterAuthUrlFromSyncResponse(
          syncResponse,
          getTwitterLink,
        );

        if (!authUrl) {
          closeAuthPopup(popup);
          popup = null;
          Alert.alert(
            "Sync requires auth",
            "No Twitter authorization URL was returned.",
          );
          return;
        }

        const authWindow = await openAuthUrl(authUrl, popup);
        popup = null;
        const authResult = await waitForTwitterAuthCompletion(
          authWindow,
          getTwitterSyncStatus,
        );
        if (!authResult.authorized) {
          Alert.alert(
            "Sync requires auth",
            authResult.error ?? "Twitter authorization did not complete.",
          );
          return;
        }
      }

      closeAuthPopup(popup);
      popup = null;
      const pollResult = await startSyncPolling();
      if (pollResult.authRequired) {
        Alert.alert(
          "Sync requires auth",
          "Twitter authorization is required. Please try syncing again.",
        );
        return;
      }
      if (!pollResult.updated) {
        Alert.alert(
          "Sync in progress",
          "Sync finished, but posts are not ready yet. Try again in a few seconds.",
        );
      }
      await Promise.all([
        refreshProfile({ refresh: true }),
        refreshNodes(),
      ]).catch(() => {});
    } catch {
      closeAuthPopup(popup);
      Alert.alert("Sync failed", "Could not queue Twitter sync.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearNodes = () => {
    setIsClearing(true);
    clearNodes();
    setSelectedNode(null);
    setIsClearing(false);
    Alert.alert("Cleared", "Nodes and posts were cleared. Sync to fetch new.");
  };

  const handleClearAll = async () => {
    try {
      setIsClearingQueue(true);
      await clearQueue();
      clearNodes();
      setSelectedNode(null);
      Alert.alert("Queue cleared", "Sync Twitter to fetch new posts.");
    } catch (error) {
      Alert.alert("Clear failed", "Could not clear the queue.");
    } finally {
      setIsClearingQueue(false);
    }
  };

  const handleLogoutPress = async () => {
    if (isLoggingOut || isDeletingAccount) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await logoutAuthSession();
    } catch {
      // Best effort server logout. We still clear local session below.
    }

    clearNodes();
    setSelectedNode(null);
    signOut();
  };

  const handleDeleteAccountPress = async () => {
    if (isDeletingAccount || isLoggingOut) {
      return;
    }

    let shouldResetLoading = true;
    try {
      setIsDeletingAccount(true);
      const response = await deleteAuthAccount();
      if (!response?.ok || !response?.deleted) {
        Alert.alert("Delete failed", "Could not delete your account.");
        return;
      }

      let resetFailed = false;
      try {
        const resetResponse = await adminResetState();
        if (!resetResponse?.ok) {
          resetFailed = true;
        }
      } catch {
        resetFailed = true;
      }

      clearNodes();
      setSelectedNode(null);
      signOut();

      if (resetFailed) {
        Alert.alert(
          "Account deleted",
          "Account was deleted, but backend reset could not be confirmed.",
        );
      }

      shouldResetLoading = false;
    } catch {
      Alert.alert("Delete failed", "Could not delete your account.");
    } finally {
      if (shouldResetLoading) {
        setIsDeletingAccount(false);
      }
    }
  };

  const topicsFollowed =
    nodesData?.nodes?.filter((node) => !isForYouNodeId(node.id)).length ?? 0;
  const isLinked = Boolean(profile?.linked || profile?.handle);

  return (
    <SafeAreaView style={styles.container}>
      <AppBackground />
      {isDesktop ? (
        <View style={styles.desktopShell}>
          <View style={styles.leftRail}>
            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <Text style={styles.brandIconText}>S</Text>
              </View>
              <View>
                <Text style={styles.brandTitle}>Slift</Text>
                <Text style={styles.brandSubtitle}>Knowledge Network</Text>
              </View>
            </View>

            <View style={styles.leftSearch}>
              <Text style={styles.leftSearchText}>Search topics...</Text>
            </View>

            <View style={styles.railNav}>
              {[
                { label: "Feed", active: false },
                { label: "Explore", active: false },
                { label: "Profile", active: true },
              ].map((entry) => (
                <Pressable
                  key={entry.label}
                  onPress={() => {
                    if (entry.label === "Profile") return;
                    navigation.navigate("Main");
                  }}
                  style={({ pressed }) => [
                    styles.railNavItem,
                    entry.active ? styles.railNavItemActive : null,
                    pressed ? { opacity: 0.82 } : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.railNavText,
                      entry.active ? styles.railNavTextActive : null,
                    ]}
                  >
                    {entry.label}
                  </Text>
                  {entry.active ? (
                    <Text style={styles.railNavTextActive}>*</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.railCreateButton}>
              <Text style={styles.railCreateText}>Create Post</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.profileColumn}
            contentContainerStyle={styles.profileDesktopContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.header,
                {
                  opacity: intro,
                  transform: [
                    {
                      translateY: intro.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-16, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.headerGlow} />
              <View style={styles.avatarRing}>
                <Image
                  style={styles.avatar}
                  source={{
                    uri:
                      profile?.avatar_url ?? "https://i.pravatar.cc/100?img=50",
                  }}
                />
              </View>
              <View style={styles.meta}>
                <Text style={styles.name}>
                  {profile?.name ??
                    (isProfileLoading ? "Loading..." : "Slift Member")}
                </Text>
                <Text style={styles.handle}>
                  {profile?.handle ?? (isProfileLoading ? "..." : "@slift")}
                </Text>
                {isSyncing ? (
                  <View style={styles.syncBadge}>
                    <Text style={styles.syncBadgeText}>Syncing...</Text>
                  </View>
                ) : null}
              </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.section,
                {
                  opacity: intro,
                  transform: [
                    {
                      translateY: intro.interpolate({
                        inputRange: [0, 1],
                        outputRange: [14, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.sectionTitle}>Profile Settings</Text>
              <Text style={styles.sectionBody}>
                Manage your profile preferences and app appearance below.
              </Text>
              <View style={styles.actionRow}>
                <Pressable
                  onPress={handleLogoutPress}
                  style={({ pressed }) => [
                    styles.actionButtonOutline,
                    pressed && styles.actionButtonPressed,
                    isLoggingOut && styles.actionButtonDisabled,
                  ]}
                  disabled={isLoggingOut || isDeletingAccount}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      styles.actionButtonTextLight,
                    ]}
                  >
                    {isLoggingOut ? "Logging out..." : "Log out"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleDeleteAccountPress}
                  style={({ pressed }) => [
                    styles.actionButtonDanger,
                    pressed && styles.actionButtonPressed,
                    isDeletingAccount && styles.actionButtonDisabled,
                  ]}
                  disabled={isDeletingAccount || isLoggingOut}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      styles.actionButtonTextDanger,
                    ]}
                  >
                    {isDeletingAccount ? "Deleting..." : "Delete account"}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.section,
                {
                  opacity: intro,
                  transform: [
                    {
                      translateY: intro.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.sectionTitle}>Twitter</Text>
              <Text style={styles.sectionBody}>
                Sync your Twitter likes, feed, and posts.
              </Text>
              <View style={styles.actionRow}>
                <Pressable
                  onPress={handleSyncTwitter}
                  style={({ pressed }) => [
                    styles.actionButtonSecondary,
                    pressed && styles.actionButtonPressed,
                    isSyncing && styles.actionButtonDisabled,
                  ]}
                  disabled={isSyncing}
                >
                  <View style={styles.syncActionContent}>
                    {isSyncing ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.textPrimary}
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.actionButtonText,
                        styles.actionButtonTextLight,
                      ]}
                    >
                      {isSyncing ? "Syncing..." : "Sync Twitter"}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={handleClearAll}
                  style={({ pressed }) => [
                    styles.actionButtonOutline,
                    pressed && styles.actionButtonPressed,
                    isClearingQueue && styles.actionButtonDisabled,
                  ]}
                  disabled={isClearingQueue}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      styles.actionButtonTextLight,
                    ]}
                  >
                    {isClearingQueue ? "Clearing..." : "Clear queue"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleClearNodes}
                  style={({ pressed }) => [
                    styles.actionButtonOutline,
                    pressed && styles.actionButtonPressed,
                    isClearing && styles.actionButtonDisabled,
                  ]}
                  disabled={isClearing}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      styles.actionButtonTextLight,
                    ]}
                  >
                    {isClearing ? "Clearing..." : "Clear posts"}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.section,
                {
                  opacity: intro,
                  transform: [
                    {
                      translateY: intro.interpolate({
                        inputRange: [0, 1],
                        outputRange: [26, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.sectionTitle}>App Settings</Text>
              <SettingsSizeSelector />
            </Animated.View>
          </ScrollView>

          {showRightRail ? (
            <View style={styles.rightRail}>
              <View style={styles.panelCard}>
                <Text style={styles.panelTitle}>Account</Text>
                <View style={styles.panelRow}>
                  <Text style={styles.panelLabel}>Status</Text>
                  <Text style={styles.panelValue}>
                    {isLinked ? "Connected" : "Not linked"}
                  </Text>
                </View>
                <View style={styles.panelRow}>
                  <Text style={styles.panelLabel}>Topics followed</Text>
                  <Text style={styles.panelValue}>
                    {Math.max(0, topicsFollowed)}
                  </Text>
                </View>
              </View>

              <View style={styles.panelCard}>
                <Text style={styles.panelTitle}>Sync Activity</Text>
                <View style={styles.panelRow}>
                  <Text style={styles.panelLabel}>Sync running</Text>
                  <Text style={styles.panelValue}>
                    {isSyncing ? "Yes" : "No"}
                  </Text>
                </View>
                <View style={styles.panelRow}>
                  <Text style={styles.panelLabel}>Queue clear</Text>
                  <Text style={styles.panelValue}>
                    {isClearingQueue ? "Pending" : "Idle"}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.header,
              {
                opacity: intro,
                transform: [
                  {
                    translateY: intro.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-16, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.headerGlow} />
            <View style={styles.avatarRing}>
              <Image
                style={styles.avatar}
                source={{
                  uri:
                    profile?.avatar_url ?? "https://i.pravatar.cc/100?img=50",
                }}
              />
            </View>
            <View style={styles.meta}>
              <Text style={styles.name}>
                {profile?.name ??
                  (isProfileLoading ? "Loading..." : "Slift Member")}
              </Text>
              <Text style={styles.handle}>
                {profile?.handle ?? (isProfileLoading ? "..." : "@slift")}
              </Text>
              {isSyncing ? (
                <View style={styles.syncBadge}>
                  <Text style={styles.syncBadgeText}>Syncing...</Text>
                </View>
              ) : null}
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.section,
              {
                opacity: intro,
                transform: [
                  {
                    translateY: intro.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Profile Settings</Text>
            <Text style={styles.sectionBody}>
              Manage your profile preferences and app appearance below.
            </Text>
            <View style={styles.actionRow}>
              <Pressable
                onPress={handleLogoutPress}
                style={({ pressed }) => [
                  styles.actionButtonOutline,
                  pressed && styles.actionButtonPressed,
                  isLoggingOut && styles.actionButtonDisabled,
                ]}
                disabled={isLoggingOut || isDeletingAccount}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    styles.actionButtonTextLight,
                  ]}
                >
                  {isLoggingOut ? "Logging out..." : "Log out"}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteAccountPress}
                style={({ pressed }) => [
                  styles.actionButtonDanger,
                  pressed && styles.actionButtonPressed,
                  isDeletingAccount && styles.actionButtonDisabled,
                ]}
                disabled={isDeletingAccount || isLoggingOut}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    styles.actionButtonTextDanger,
                  ]}
                >
                  {isDeletingAccount ? "Deleting..." : "Delete account"}
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.section,
              {
                opacity: intro,
                transform: [
                  {
                    translateY: intro.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Twitter</Text>
            <Text style={styles.sectionBody}>
              Sync your Twitter likes, feed, and posts.
            </Text>
            <View style={styles.actionRow}>
              <Pressable
                onPress={handleSyncTwitter}
                style={({ pressed }) => [
                  styles.actionButtonSecondary,
                  pressed && styles.actionButtonPressed,
                  isSyncing && styles.actionButtonDisabled,
                ]}
                disabled={isSyncing}
              >
                <View style={styles.syncActionContent}>
                  {isSyncing ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.textPrimary}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.actionButtonText,
                      styles.actionButtonTextLight,
                    ]}
                  >
                    {isSyncing ? "Syncing..." : "Sync Twitter"}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={handleClearAll}
                style={({ pressed }) => [
                  styles.actionButtonOutline,
                  pressed && styles.actionButtonPressed,
                  isClearingQueue && styles.actionButtonDisabled,
                ]}
                disabled={isClearingQueue}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    styles.actionButtonTextLight,
                  ]}
                >
                  {isClearingQueue ? "Clearing..." : "Clear queue"}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleClearNodes}
                style={({ pressed }) => [
                  styles.actionButtonOutline,
                  pressed && styles.actionButtonPressed,
                  isClearing && styles.actionButtonDisabled,
                ]}
                disabled={isClearing}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    styles.actionButtonTextLight,
                  ]}
                >
                  {isClearing ? "Clearing..." : "Clear posts"}
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.section,
              {
                opacity: intro,
                transform: [
                  {
                    translateY: intro.interpolate({
                      inputRange: [0, 1],
                      outputRange: [26, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>App Settings</Text>
            <SettingsSizeSelector />
          </Animated.View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

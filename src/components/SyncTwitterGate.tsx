import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { BlurView } from "expo-blur";

import { getTwitterLink, getTwitterSyncStatus, syncTwitter } from "../api";
import { useNodesData } from "../context/NodesDataContext";
import { useProfileData } from "../context/ProfileDataContext";
import { useSettings } from "../context/SettingsContext";
import { getSyncFetchLimit } from "../config/dataLimits";
import { waitForTwitterGraphReady } from "../utils/twitterSyncStatus";
import { createSyncTwitterGateStyles } from "../styles/SyncTwitterGateStyles";
import { theme } from "../styles/theme";
import {
  closeAuthPopup,
  getSyncRequiresAuth,
  getTwitterAuthUrlFromSyncResponse,
  openAuthPopup,
  openAuthUrl,
  type AuthPopupHandle,
  waitForTwitterAuthCompletion,
} from "../utils/twitterAuth";

type SyncTwitterGateProps = {
  children: React.ReactNode;
};

const DATA_REFRESH_INTERVAL_MS = 2500;
const MAX_POST_FETCH_ATTEMPTS = 4;
const MAX_SYNC_STATUS_POLLS = 10;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const hasSyncedGraphData = (
  data: ReturnType<typeof useNodesData>["data"] | null,
) => {
  if (!data?.nodes?.length) {
    return false;
  }

  const totalPosts = data.nodes.reduce(
    (sum, node) => sum + (node.posts?.length ?? 0),
    0,
  );

  return totalPosts > 0;
};

const hasProfileIdentity = (
  profile: ReturnType<typeof useProfileData>["data"] | null,
) => Boolean(profile?.name || profile?.handle || profile?.avatar_url);

export function SyncTwitterGate({ children }: SyncTwitterGateProps) {
  const { size } = useSettings();
  const styles = useMemo(createSyncTwitterGateStyles, [size]);
  const { refreshNodes, data } = useNodesData();
  const { refreshProfile } = useProfileData();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGateDismissed, setIsGateDismissed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasAnyPosts = hasSyncedGraphData(data);

  const continueSyncInBackground = useCallback(async () => {
    const syncReadiness = await waitForTwitterGraphReady(getTwitterSyncStatus, {
      maxPolls: MAX_SYNC_STATUS_POLLS,
    });
    if (syncReadiness.state === "auth_required") {
      setIsGateDismissed(false);
      setErrorMessage(
        "Twitter authorization is required. Please sync again to continue.",
      );
      return;
    }
    if (syncReadiness.state !== "ready") {
      setIsGateDismissed(false);
      setErrorMessage(
        "Twitter sync is still processing. Please wait a moment and try again.",
      );
      return;
    }

    for (
      let fetchAttempt = 0;
      fetchAttempt < MAX_POST_FETCH_ATTEMPTS;
      fetchAttempt += 1
    ) {
      const fetchLimit = getSyncFetchLimit(fetchAttempt);
      const profile = await refreshProfile().catch(() => null);
      const refreshed = await refreshNodes({
        limit: fetchLimit,
        silent: fetchAttempt > 0,
      }).catch(() => null);
      if (hasSyncedGraphData(refreshed) && hasProfileIdentity(profile)) {
        return;
      }
      await sleep(DATA_REFRESH_INTERVAL_MS);
    }

    // Final profile refresh in case posts arrived before profile hydration.
    await refreshProfile().catch(() => null);
  }, [refreshNodes, refreshProfile]);

  const handleSyncTwitter = useCallback(async () => {
    if (isSyncing || hasAnyPosts || isGateDismissed) {
      return;
    }

    setIsSyncing(true);
    setErrorMessage(null);
    let popup: AuthPopupHandle | null = null;

    try {
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
          setErrorMessage(
            "Twitter authorization is required, but no auth URL was returned.",
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
          setErrorMessage(
            authResult.error ?? "Twitter authorization did not complete.",
          );
          return;
        }
      }

      closeAuthPopup(popup);
      popup = null;
      setIsGateDismissed(true);
      void continueSyncInBackground();
    } catch {
      closeAuthPopup(popup);
      setErrorMessage("Could not start Twitter sync. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  }, [continueSyncInBackground, hasAnyPosts, isGateDismissed, isSyncing]);

  if (hasAnyPosts || isGateDismissed) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      {children}
      <View style={styles.overlay} pointerEvents="auto">
        <BlurView tint="dark" intensity={70} style={styles.blurLayer} />
        <View style={styles.card}>
          <Text style={styles.title}>Almost there</Text>
          <Text style={styles.subtitle}>
            Sync your Twitter stream to load your personalized graph and feed.
          </Text>

          {isSyncing ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.colors.accentBlue} />
              <Text style={styles.loadingText}>Syncing content...</Text>
            </View>
          ) : (
            <Pressable
              onPress={handleSyncTwitter}
              style={({ pressed }) => [
                styles.actionButton,
                pressed ? { opacity: 0.85 } : null,
              ]}
            >
              <Text style={styles.actionButtonText}>
                Sync twitter to continue
              </Text>
            </Pressable>
          )}

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

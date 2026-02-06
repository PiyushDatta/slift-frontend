import { useEffect, useRef } from "react";

import { useNodesData } from "../context/NodesDataContext";
import { useProfileData } from "../context/ProfileDataContext";

const hasProfileInfo = (profile: ReturnType<typeof useProfileData>["data"]) =>
  Boolean(profile?.name || profile?.handle || profile?.avatar_url);

export function ProfileBootstrap() {
  const { lastUpdated: nodesUpdated } = useNodesData();
  const {
    data: profile,
    status: profileStatus,
    refreshProfile,
  } = useProfileData();
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (hasTriggeredRef.current) return;
    if (!nodesUpdated) return;
    if (profileStatus === "loading") return;
    if (hasProfileInfo(profile)) return;
    hasTriggeredRef.current = true;
    refreshProfile({ refresh: true });
  }, [nodesUpdated, profile, profileStatus, refreshProfile]);

  return null;
}

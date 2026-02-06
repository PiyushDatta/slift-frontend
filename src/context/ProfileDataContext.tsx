import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getUserProfile, UserProfileResponse } from "../api";

type ProfileDataStatus = "idle" | "loading" | "ready" | "error";

type ProfileDataValue = {
  data: UserProfileResponse | null;
  status: ProfileDataStatus;
  refreshProfile: (options?: {
    userId?: string;
    refresh?: boolean;
  }) => Promise<UserProfileResponse | null>;
  lastUpdated: number | null;
};

const ProfileDataContext = createContext<ProfileDataValue | undefined>(
  undefined,
);

type ProfileDataProviderProps = {
  children: React.ReactNode;
  initialData?: UserProfileResponse;
  disableAutoLoad?: boolean;
};

export function ProfileDataProvider({
  children,
  initialData,
  disableAutoLoad = false,
}: ProfileDataProviderProps) {
  const [data, setData] = useState<UserProfileResponse | null>(
    initialData ?? null,
  );
  const [status, setStatus] = useState<ProfileDataStatus>(
    initialData ? "ready" : "idle",
  );
  const [lastUpdated, setLastUpdated] = useState<number | null>(
    initialData ? Date.now() : null,
  );

  const refreshProfile = useCallback(
    async (options?: {
      userId?: string;
      refresh?: boolean;
    }): Promise<UserProfileResponse | null> => {
      setStatus("loading");
      try {
        const response = await getUserProfile({
          userId: options?.userId,
          refresh: options?.refresh,
        });
        setData(response ?? null);
        setStatus(response ? "ready" : "error");
        setLastUpdated(Date.now());
        return response ?? null;
      } catch {
        setData(null);
        setStatus("error");
        setLastUpdated(Date.now());
        return null;
      }
    },
    [],
  );

  useEffect(() => {
    if (disableAutoLoad) return;
    if (data) return;
    refreshProfile();
  }, [data, disableAutoLoad, refreshProfile]);

  const value = useMemo(
    () => ({ data, status, refreshProfile, lastUpdated }),
    [data, status, refreshProfile, lastUpdated],
  );

  return (
    <ProfileDataContext.Provider value={value}>
      {children}
    </ProfileDataContext.Provider>
  );
}

export function useProfileData() {
  const context = useContext(ProfileDataContext);
  if (!context) {
    throw new Error("useProfileData must be used within ProfileDataProvider");
  }
  return context;
}

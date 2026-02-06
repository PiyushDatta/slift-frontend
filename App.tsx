import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { features } from "./src/config/features";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { SettingsProvider } from "./src/context/SettingsContext";
import { KnowledgeSelectionProvider } from "./src/context/KnowledgeSelectionContext";
import { NodesDataProvider } from "./src/context/NodesDataContext";
import { ProfileDataProvider } from "./src/context/ProfileDataContext";
import { AuthScreen } from "./src/screens/AuthScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ProfileBootstrap } from "./src/components/ProfileBootstrap";
import { SyncTwitterGate } from "./src/components/SyncTwitterGate";

function AppGate() {
  const { status } = useAuth();
  const TabsRoot = features.enableTabs
    ? require("./src/navigation/TabbedRoot").TabbedRoot
    : null;

  if (status !== "authenticated") {
    return <AuthScreen />;
  }

  return (
    <KnowledgeSelectionProvider>
      <NodesDataProvider>
        <ProfileDataProvider disableAutoLoad>
          <SyncTwitterGate>
            <ProfileBootstrap />
            {TabsRoot ? <TabsRoot /> : <HomeScreen />}
          </SyncTwitterGate>
        </ProfileDataProvider>
      </NodesDataProvider>
    </KnowledgeSelectionProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AuthProvider>
          <StatusBar barStyle="light-content" />
          <AppGate />
        </AuthProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

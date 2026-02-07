import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { SettingsProvider } from "./src/context/SettingsContext";
import { KnowledgeSelectionProvider } from "./src/context/KnowledgeSelectionContext";
import { NodesDataProvider } from "./src/context/NodesDataContext";
import { ProfileDataProvider } from "./src/context/ProfileDataContext";
import { AuthScreen } from "./src/screens/AuthScreen";
import { ProfileBootstrap } from "./src/components/ProfileBootstrap";
import { SyncTwitterGate } from "./src/components/SyncTwitterGate";

function AppGate() {
  const { status } = useAuth();
  const TabsRoot = require("./src/navigation/TabbedRoot").TabbedRoot;

  if (status !== "authenticated") {
    return <AuthScreen />;
  }

  return (
    <KnowledgeSelectionProvider>
      <NodesDataProvider>
        <ProfileDataProvider disableAutoLoad>
          <SyncTwitterGate>
            <ProfileBootstrap />
            <TabsRoot />
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

import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { uiTokens } from "../config/uiSettings";
import { ProfileScreen } from "../screens/ProfileScreen";
import { MediaScrollScreen } from "../screens/MediaScrollScreen";
import { useSettings } from "../context/SettingsContext";
import { createTabbedRootStyles } from "../styles/TabbedRootStyles";
import { TabsParamList } from "./types";
import { theme } from "../styles/theme";

const Tab = createBottomTabNavigator<TabsParamList>();

function SleekTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { size } = useSettings();
  const styles = useMemo(createTabbedRootStyles, [size]);
  const insets = useSafeAreaInsets();
  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key]?.options;
  const isHidden = focusedOptions?.tabBarStyle?.display === "none";

  if (isHidden) {
    return null;
  }

  const visibleRoutes = state.routes.filter((route) => {
    const options = descriptors[route.key]?.options;
    return options?.tabBarButton !== null;
  });

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.tabBarContainer,
        { paddingBottom: Math.max(insets.bottom, uiTokens.spacing(12)) },
      ]}
    >
      <View style={styles.tabBarContent}>
        {visibleRoutes.map((route: { key: string; name: string }) => {
          const isFocused =
            state.index ===
            state.routes.findIndex((r: { key: string }) => r.key === route.key);
          const iconName = getIconName(route.name, isFocused);

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={getTabLabel(route.name)}
              onPress={() => navigation.navigate(route.name)}
              style={({ pressed }) => [
                styles.tabItem,
                pressed ? styles.tabItemPressed : null,
              ]}
            >
              <View style={styles.iconAnchor}>
                {isFocused ? <View style={styles.iconGlow} /> : null}
                <View
                  style={[
                    styles.iconWrap,
                    isFocused ? styles.iconWrapActive : null,
                  ]}
                >
                  <Ionicons
                    name={iconName}
                    size={uiTokens.font(22)}
                    color={
                      isFocused
                        ? theme.colors.textPrimary
                        : theme.colors.textMuted
                    }
                  />
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function TabbedRoot() {
  return (
    <NavigationContainer>
      <Tab.Navigator tabBar={(props) => <SleekTabBar {...props} />}>
        <Tab.Screen
          name="Main"
          component={MediaScrollScreen}
          options={{ headerShown: false }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: "Profile",
            headerShown: false,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const getIconName = (routeName: string, isFocused: boolean) => {
  const iconMap: Record<string, { active: string; inactive: string }> = {
    Main: { active: "home", inactive: "home-outline" },
    Profile: { active: "person", inactive: "person-outline" },
  };

  const icon = iconMap[routeName] ?? {
    active: "ellipse",
    inactive: "ellipse-outline",
  };

  return isFocused ? icon.active : icon.inactive;
};

const getTabLabel = (routeName: string) => {
  const labels: Record<string, string> = {
    Main: "Feed",
    Profile: "Profile",
  };
  return labels[routeName] ?? routeName;
};

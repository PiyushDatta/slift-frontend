/**
 * React 18+/19 act() support
 */
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mocks are split for readability and maintenance.
import "./mocks/react-native";
import "./mocks/react-native-safe-area-context";
import "./mocks/react-navigation-native";
import "./mocks/react-navigation-bottom-tabs";
import "./mocks/slider";
import "./mocks/expo-secure-store";

import { mock } from "bun:test";

/**
 * Allow tests to switch platforms:
 *   globalThis.__TEST_PLATFORM__ = "web" | "ios" | "android"
 */
const getPlatform = () => (globalThis as any).__TEST_PLATFORM__ ?? "web";

mock.module("react-native", () => {
  const React = require("react");

  const createHost =
    (name: string) =>
    ({ children, ...props }: any) =>
      React.createElement(name, props, children);

  const View = createHost("View");
  const Text = createHost("Text");
  const TextInput = createHost("TextInput");
  const Pressable = createHost("Pressable");
  const ScrollView = createHost("ScrollView");
  const ActivityIndicator = createHost("ActivityIndicator");
  const StatusBar = createHost("StatusBar");
  const SafeAreaView = createHost("SafeAreaView");
  const Image = createHost("Image");
  const Keyboard = {
    dismiss: () => {},
    addListener: () => ({ remove: () => {} }),
    removeListener: () => {},
  };
  const Linking = {
    openURL: async () => {},
  };
  const Alert = {
    alert: () => {},
  };
  const AppState = {
    currentState: "active",
    addEventListener: () => ({ remove: () => {} }),
  };
  const Animated = {
    ValueXY: function ValueXY(this: any, value: { x: number; y: number }) {
      this.x = value.x;
      this.y = value.y;
      this.__listeners = [];
      this.setValue = (next: { x: number; y: number }) => {
        this.x = next.x;
        this.y = next.y;
        this.__listeners.forEach((listener: any) =>
          listener({ x: this.x, y: this.y }),
        );
      };
      this.addListener = (listener: any) => {
        this.__listeners.push(listener);
        return listener;
      };
      this.removeListener = (listener: any) => {
        this.__listeners = this.__listeners.filter(
          (item: any) => item !== listener,
        );
      };
      this.stopAnimation = (cb?: any) => cb?.({ x: this.x, y: this.y });
      this.getTranslateTransform = () => [
        { translateX: this.x },
        { translateY: this.y },
      ];
    },
    View: ({ children, ...props }: any) =>
      React.createElement("AnimatedView", props, children),
    Text: ({ children, ...props }: any) =>
      React.createElement("AnimatedText", props, children),
    Image: ({ children, ...props }: any) =>
      React.createElement("AnimatedImage", props, children),
    createAnimatedComponent: (Component: any) => Component,
    timing: (_value: any, { toValue }: any) => ({
      start: (cb?: any) => {
        if (_value?.setValue) {
          _value.setValue(toValue);
        }
        cb?.();
      },
    }),
    spring: (_value: any, { toValue }: any) => ({
      start: (cb?: any) => {
        if (_value?.setValue) {
          _value.setValue(toValue);
        }
        cb?.();
      },
    }),
    decay: (_value: any, { velocity }: any) => ({
      start: (cb?: any) => {
        if (_value?.setValue) {
          _value.setValue({
            x: _value.x + (velocity?.x ?? 0),
            y: _value.y + (velocity?.y ?? 0),
          });
        }
        cb?.();
      },
    }),
    Value: function Value(this: any, val: number) {
      this._value = val;
      this.setValue = (next: number) => {
        this._value = next;
      };
      this.interpolate = ({
        inputRange,
        outputRange,
      }: {
        inputRange: [number, number];
        outputRange: [number, number];
      }) => {
        const [inMin, inMax] = inputRange;
        const [outMin, outMax] = outputRange;
        if (inMax === inMin) {
          return outMin;
        }
        const ratio = (this._value - inMin) / (inMax - inMin);
        return outMin + ratio * (outMax - outMin);
      };
    },
  };
  const PanResponder = {
    create: (handlers: any) => ({
      panHandlers: handlers,
    }),
  };

  const FlatList = ({ data = [], renderItem, keyExtractor, ...rest }: any) =>
    React.createElement(
      "FlatList",
      rest,
      data.map((item: any, index: number) =>
        React.createElement(
          React.Fragment,
          { key: keyExtractor?.(item) ?? index },
          renderItem({ item, index }),
        ),
      ),
    );

  const StyleSheet = {
    create: (styles: Record<string, any>) => styles,
    flatten: (style: any) => {
      if (Array.isArray(style)) {
        return Object.assign({}, ...style);
      }
      return style ?? {};
    },
  };

  const Platform = {
    get OS() {
      return getPlatform();
    },
    select: (spec: Record<string, any>) => spec[getPlatform()] ?? spec.default,
  };
  const I18nManager = {
    allowRTL: () => {},
    forceRTL: () => {},
    isRTL: false,
    getConstants: () => ({
      isRTL: false,
      doLeftAndRightSwapInRTL: false,
    }),
  };
  const Easing = {
    linear: (t: number) => t,
    ease: (t: number) => t,
    quad: (t: number) => t,
    cubic: (t: number) => t,
    poly: (n: number) => (t: number) => t ** n,
    sin: (t: number) => t,
    circle: (t: number) => t,
    exp: (t: number) => t,
    elastic: () => (t: number) => t,
    back: () => (t: number) => t,
    bounce: (t: number) => t,
    in: (fn: any) => fn,
    out: (fn: any) => fn,
    inOut: (fn: any) => fn,
  };
  const PixelRatio = {
    get: () => 2,
    getFontScale: () => 1,
    getPixelSizeForLayoutSize: (size: number) => size,
    roundToNearestPixel: (size: number) => size,
  };

  return {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    ActivityIndicator,
    FlatList,
    StatusBar,
    SafeAreaView,
    Image,
    AppState,
    Linking,
    Alert,
    Keyboard,
    PanResponder,
    Animated,
    StyleSheet,
    Platform,
    I18nManager,
    Easing,
    PixelRatio,

    Dimensions: {
      get: () => ({ width: 390, height: 844 }),
    },
  };
});

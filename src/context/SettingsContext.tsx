import React, { createContext, useContext, useMemo, useState } from "react";

import { UiSize, uiSettings } from "../config/uiSettings";

type SettingsValue = {
  size: UiSize;
  setSize: (size: UiSize) => void;
  elasticity: number;
  setElasticity: (value: number) => void;
};

const SettingsContext = createContext<SettingsValue | undefined>(undefined);

type SettingsProviderProps = {
  children: React.ReactNode;
  initialSize?: UiSize;
  initialElasticity?: number;
};

export function SettingsProvider({
  children,
  initialSize,
  initialElasticity,
}: SettingsProviderProps) {
  const [size, setSizeState] = useState<UiSize>(initialSize ?? uiSettings.size);
  const [elasticity, setElasticityState] = useState<number>(
    initialElasticity ?? uiSettings.elasticity,
  );

  const setSize = (nextSize: UiSize) => {
    uiSettings.size = nextSize;
    setSizeState(nextSize);
  };

  const setElasticity = (nextValue: number) => {
    uiSettings.elasticity = nextValue;
    setElasticityState(nextValue);
  };

  const value = useMemo(
    () => ({ size, setSize, elasticity, setElasticity }),
    [size, elasticity],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}

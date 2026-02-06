import React, { createContext, useContext, useMemo, useState } from "react";

export type SelectedNode = {
  id: string;
  label: string;
} | null;

type KnowledgeSelectionValue = {
  selectedNode: SelectedNode;
  setSelectedNode: (node: SelectedNode) => void;
};

const KnowledgeSelectionContext = createContext<
  KnowledgeSelectionValue | undefined
>(undefined);

type KnowledgeSelectionProviderProps = {
  children: React.ReactNode;
  initialSelectedNode?: SelectedNode;
};

export function KnowledgeSelectionProvider({
  children,
  initialSelectedNode,
}: KnowledgeSelectionProviderProps) {
  const [selectedNode, setSelectedNode] = useState<SelectedNode>(
    initialSelectedNode ?? null,
  );

  const value = useMemo(
    () => ({ selectedNode, setSelectedNode }),
    [selectedNode],
  );

  return (
    <KnowledgeSelectionContext.Provider value={value}>
      {children}
    </KnowledgeSelectionContext.Provider>
  );
}

export function useKnowledgeSelection() {
  const context = useContext(KnowledgeSelectionContext);
  if (!context) {
    throw new Error(
      "useKnowledgeSelection must be used within KnowledgeSelectionProvider",
    );
  }
  return context;
}

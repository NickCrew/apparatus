import { createContext, useContext, useState, ReactNode } from 'react';

interface DocViewerContextType {
  selectedDocId: string | null;
  openDoc: (docId: string) => void;
  closeDoc: () => void;
}

const DocViewerContext = createContext<DocViewerContextType | undefined>(undefined);

export function DocViewerProvider({ children }: { children: ReactNode }) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const openDoc = (docId: string) => {
    setSelectedDocId(docId);
  };

  const closeDoc = () => {
    setSelectedDocId(null);
  };

  return (
    <DocViewerContext.Provider value={{ selectedDocId, openDoc, closeDoc }}>
      {children}
    </DocViewerContext.Provider>
  );
}

export function useDocViewer() {
  const context = useContext(DocViewerContext);
  if (!context) {
    throw new Error('useDocViewer must be used within DocViewerProvider');
  }
  return context;
}

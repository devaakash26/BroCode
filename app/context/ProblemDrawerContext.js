'use client';

import { createContext, useContext, useState } from 'react';

const ProblemDrawerContext = createContext();

export function useProblemDrawer() {
  return useContext(ProblemDrawerContext);
}

export function ProblemDrawerProvider({ children }) {
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <ProblemDrawerContext.Provider value={{ isDrawerOpen, openDrawer, closeDrawer }}>
      {children}
    </ProblemDrawerContext.Provider>
  );
} 
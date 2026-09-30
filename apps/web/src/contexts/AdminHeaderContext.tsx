'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AdminHeaderState {
  onRefresh?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

interface AdminHeaderContextType extends AdminHeaderState {
  setHeaderState: (state: AdminHeaderState) => void;
}

const AdminHeaderContext = createContext<AdminHeaderContextType>({
  setHeaderState: () => {},
});

export function AdminHeaderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminHeaderState>({});

  return (
    <AdminHeaderContext.Provider value={{ ...state, setHeaderState: setState }}>
      {children}
    </AdminHeaderContext.Provider>
  );
}

export function useAdminHeader() {
  return useContext(AdminHeaderContext);
}

import React, { createContext, useContext, useCallback, useState } from "react";

interface NavContextType {
  activeTab: string;
  navigate: (tab: string) => void;
  subScreen: string | null;
  setSubScreen: (screen: string | null) => void;
}

const NavContext = createContext<NavContextType>({
  activeTab: "dashboard",
  navigate: () => {},
  subScreen: null,
  setSubScreen: () => {},
});

export const useNav = () => useContext(NavContext);

export const NavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [subScreen, setSubScreen] = useState<string | null>(null);

  const navigate = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  return (
    <NavContext.Provider value={{ activeTab, navigate, subScreen, setSubScreen }}>
      {children}
    </NavContext.Provider>
  );
};

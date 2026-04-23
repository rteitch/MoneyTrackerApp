import { useSQLiteContext } from "expo-sqlite";
import { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { getThemeColors, getTransactionTypeConfig } from "../constants/theme";
import { getPref, setPref } from "../db/database";

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const db = useSQLiteContext();
  const systemScheme = useColorScheme();

  // States
  const [userName, setUserNameState] = useState("Pengguna");
  const [themeMode, setThemeModeState] = useState("dark"); // 'dark' | 'light' | 'system'
  const [isReady, setIsReady] = useState(false);

  // Derived current theme
  const currentTheme =
    themeMode === "system" ? systemScheme || "dark" : themeMode;
  const colors = getThemeColors(currentTheme);
  const typeConfig = getTransactionTypeConfig(currentTheme);

  // Initialize context data from DB
  useEffect(() => {
    async function loadData() {
      try {
        const [storedName, storedTheme] = await Promise.all([
          getPref(db, "username", "Pengguna"),
          getPref(db, "theme", "dark"),
        ]);
        setUserNameState(storedName);
        setThemeModeState(storedTheme);
      } catch (error) {
        console.error("Failed to load global context:", error);
      } finally {
        setIsReady(true);
      }
    }
    loadData();
  }, [db]);

  return (
    <AppContext.Provider
      value={{
        userName,
        themeMode,
        currentTheme,
        colors,
        typeConfig,
        setUserNameState,
        setThemeModeState,
        isReady,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// Actions Hook
export const useAppActions = () => {
  const db = useSQLiteContext();
  const { setUserNameState, setThemeModeState } = useContext(AppContext);

  const setUserName = async (newName) => {
    try {
      await setPref(db, "username", newName);
      setUserNameState(newName);
      return { success: true };
    } catch (error) {
      console.error("Failed to update username:", error);
      return { success: false, error };
    }
  };

  const setThemeMode = async (newMode) => {
    try {
      await setPref(db, "theme", newMode);
      setThemeModeState(newMode);
      return { success: true };
    } catch (error) {
      console.error("Failed to update theme:", error);
      return { success: false, error };
    }
  };

  return { setUserName, setThemeMode };
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx)
    throw new Error("useAppContext harus dipakai di dalam <AppProvider>");
  return ctx;
};

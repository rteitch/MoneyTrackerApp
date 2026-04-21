import React, { createContext, useState, useEffect, useContext } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getPref, setPref } from '../db/database';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const db = useSQLiteContext();
  
  // States
  const [userName, setUserNameState] = useState('Pengguna');
  const [isReady, setIsReady] = useState(false);

  // Initialize context data from DB
  useEffect(() => {
    async function loadData() {
      try {
        const storedName = await getPref(db, 'username', 'Pengguna');
        setUserNameState(storedName);
      } catch (error) {
        console.error('Failed to load global context:', error);
      } finally {
        setIsReady(true);
      }
    }
    loadData();
  }, [db]);

  // Actions
  const setUserName = async (newName) => {
    try {
      await setPref(db, 'username', newName); // persist to DB
      setUserNameState(newName);              // update UI instantly
    } catch (error) {
      console.error('Failed to update username:', error);
    }
  };

  return (
    <AppContext.Provider
      value={{
        userName,
        setUserName,
        isReady,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// Custom Hook helper
export const useAppContext = () => useContext(AppContext);

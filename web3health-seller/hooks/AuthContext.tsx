import React, {
  useState,
  useMemo,
  useContext,
  createContext,
  ReactNode,
  useEffect,
} from "react";
import { Platform } from "react-native";
import {
  useAuth as useClerkAuth,
  useUser as useClerkUser,
} from "@clerk/clerk-expo";
import { lookupUser } from "@/app/services/users/api";

interface User {
  id: number;
  name: string;
}

// Define the shape of the context data
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
}

// Create the context
const AuthContext = createContext<AuthContextType | null>(null);

// Create the provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [rehydrated, setRehydrated] = useState(false);

  // Sync with Clerk auth state
  const { isLoaded: clerkLoaded, isSignedIn } = useClerkAuth();
  const { isLoaded: clerkUserLoaded, user: clerkUser } = useClerkUser();

  // When Clerk reports a signed-in user, attempt to load the internal user profile
  // --- Local storage helpers ---
  const STORAGE_KEY = "web3health_auth_v1";

  async function resolveStorage() {
    // Web: use window.localStorage
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      (window as any).localStorage
    ) {
      return {
        getItem: async (k: string) =>
          Promise.resolve((window as any).localStorage.getItem(k)),
        setItem: async (k: string, v: string) =>
          Promise.resolve((window as any).localStorage.setItem(k, v)),
        removeItem: async (k: string) =>
          Promise.resolve((window as any).localStorage.removeItem(k)),
      };
    }

    // Native: try to load AsyncStorage dynamically to avoid breaking environments
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AsyncStorage = await import(
        "@react-native-async-storage/async-storage"
      );
      return {
        getItem: AsyncStorage.default.getItem,
        setItem: AsyncStorage.default.setItem,
        removeItem: AsyncStorage.default.removeItem,
      };
    } catch (err) {
      // Fallback: in-memory storage (not persistent across app restarts)
      const map = new Map<string, string | null>();
      return {
        getItem: async (k: string) => Promise.resolve(map.get(k) ?? null),
        setItem: async (k: string, v: string) => Promise.resolve(map.set(k, v)),
        removeItem: async (k: string) => Promise.resolve(map.delete(k)),
      };
    }
  }

  // Rehydrate from storage once on mount so UI doesn't lose local user between reloads
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await resolveStorage();
        const raw = await s.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed?.isAuthenticated)
              setIsAuthenticated(Boolean(parsed.isAuthenticated));
            if (parsed?.user) setUser(parsed.user as User);
          } catch (e) {
            // ignore parse errors
          }
        }
      } catch (err) {
        console.warn("Failed to rehydrate auth from storage", err);
      } finally {
        if (mounted) setRehydrated(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Persist changes to auth state
  useEffect(() => {
    // Don't persist until we've attempted rehydration to avoid overwriting stored data
    if (!rehydrated) return;

    (async () => {
      try {
        const s = await resolveStorage();
        const payload = JSON.stringify({
          isAuthenticated: Boolean(isAuthenticated),
          user,
        });
        await s.setItem(STORAGE_KEY, payload);
      } catch (err) {
        console.warn("Failed to persist auth to storage", err);
      }
    })();

    return () => {};
  }, [isAuthenticated, user, rehydrated]);

  // When Clerk reports a signed-in user, attempt to load the internal user profile
  useEffect(() => {
    let mounted = true;

    async function syncUser() {
      if (!clerkLoaded) return;

      if (isSignedIn) {
        // Optimistically mark authenticated so UI protected by Clerk can render
        if (mounted) setIsAuthenticated(true);

        try {
          const email = clerkUser?.primaryEmailAddress?.emailAddress;
          if (!email) return;

          const res = await lookupUser(email);
          if (mounted && res)
            setUser({ id: Number(res.userId), name: res.name ?? "" });
        } catch (err) {
          console.warn("Failed to sync internal user profile:", err);
        }
      } else {
        // Not signed in via Clerk -> clear local auth state
        if (mounted) {
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    }

    void syncUser();

    return () => {
      mounted = false;
    };
  }, [clerkLoaded, isSignedIn, clerkUser, clerkUserLoaded]);

  // Public login API: kept for compatibility with existing codepaths that call local login
  const login = async (email: string) => {
    const { userId, name } = await lookupUser(email);
    setIsAuthenticated(true);
    setUser({ id: Number(userId), name: name ?? "" });
    return true;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  const value = useMemo(
    () => ({ isAuthenticated, user, login, logout }),
    [isAuthenticated, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create the hook for easy consumption
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

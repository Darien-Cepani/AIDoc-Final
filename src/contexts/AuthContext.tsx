
"use client";
import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface UserPreferences {
  accentColor?: string; // Store as hex
  fontSize?: 'sm' | 'default' | 'lg';
  highContrast?: boolean;
  dashboardLayout?: 'square' | 'masonry';
}

export interface UserProfileData {
  name?: string;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  gender?: string | null;
  birthday?: string | null; // ISO string "yyyy-MM-dd"
  existingConditions?: string[];
  allergies?: string[];
  dailyCalorieGoal?: number | null;
  preferences?: UserPreferences;
  aiGeneratedOverallSummary?: string | null;
  aiGeneratedOverallSummaryLastUpdated?: string | null; // ISO string

  // New fields for consolidated summaries
  consolidatedChatSummary?: string | null;
  consolidatedChatSummaryLastUpdated?: string | null; // ISO string
  consolidatedDocumentAnalysisSummary?: string | null;
  consolidatedDocumentAnalysisSummaryLastUpdated?: string | null; // ISO string
}

export interface UserDocumentMetadata {
  id: string;
  name: string;
  uploadDate: Timestamp; 
  suggestedCategory?: string | null;
  overallSummary: string;
  keyMetrics?: Array<{ name: string; value: string; unit?: string | null; date?: string | null; normalRange?: string | null; }> | null;
  identifiedConditions?: string[] | null;
  mentionedMedications?: string[] | null;
  isRelevant?: boolean;
  rejectionReason?: string | null;
  validation?: { 
    isMedicalDocument: boolean;
    rejectionReason?: string | null;
  };
}

export interface User extends UserProfileData {
  id: string;
  name: string;
  email: string;
  onboardingComplete: boolean;
  profilePictureUrl?: string | null;
  documentMetadata?: UserDocumentMetadata[];
}


interface AuthContextType {
  user: User | null;
  logout: () => void;
  updateUserProfile: (profileData: Partial<UserProfileData> & {name?: string, profilePictureUrl?: string | null}) => Promise<void>;
  completeOnboarding: () => void;
  loading: boolean;
  isAuthenticated: boolean;
  showOnboardingModal: boolean;
  setShowOnboardingModal: React.Dispatch<React.SetStateAction<boolean>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userDataFromDb = userDocSnap.data() as Omit<User, 'id' | 'email' | 'name' | 'profilePictureUrl'>; 
          const appUser: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || userDataFromDb.email || '',
            name: firebaseUser.displayName || userDataFromDb.name || firebaseUser.email?.split('@')[0] || 'User',
            profilePictureUrl: firebaseUser.photoURL || userDataFromDb.profilePictureUrl || null,
            onboardingComplete: userDataFromDb.onboardingComplete || false,
            age: userDataFromDb.age === undefined ? null : userDataFromDb.age,
            height: userDataFromDb.height === undefined ? null : userDataFromDb.height,
            weight: userDataFromDb.weight === undefined ? null : userDataFromDb.weight,
            gender: userDataFromDb.gender === undefined ? null : userDataFromDb.gender,
            birthday: userDataFromDb.birthday === undefined ? null : userDataFromDb.birthday,
            existingConditions: userDataFromDb.existingConditions || [],
            allergies: userDataFromDb.allergies || [],
            dailyCalorieGoal: userDataFromDb.dailyCalorieGoal === undefined ? null : userDataFromDb.dailyCalorieGoal,
            preferences: userDataFromDb.preferences || { 
              accentColor: "#2E9AFE", 
              fontSize: "default", 
              highContrast: false,
              dashboardLayout: "square"
            },
            documentMetadata: userDataFromDb.documentMetadata || [],
            aiGeneratedOverallSummary: userDataFromDb.aiGeneratedOverallSummary === undefined ? null : userDataFromDb.aiGeneratedOverallSummary,
            aiGeneratedOverallSummaryLastUpdated: userDataFromDb.aiGeneratedOverallSummaryLastUpdated === undefined ? null : userDataFromDb.aiGeneratedOverallSummaryLastUpdated,
            consolidatedChatSummary: userDataFromDb.consolidatedChatSummary === undefined ? null : userDataFromDb.consolidatedChatSummary,
            consolidatedChatSummaryLastUpdated: userDataFromDb.consolidatedChatSummaryLastUpdated === undefined ? null : userDataFromDb.consolidatedChatSummaryLastUpdated,
            consolidatedDocumentAnalysisSummary: userDataFromDb.consolidatedDocumentAnalysisSummary === undefined ? null : userDataFromDb.consolidatedDocumentAnalysisSummary,
            consolidatedDocumentAnalysisSummaryLastUpdated: userDataFromDb.consolidatedDocumentAnalysisSummaryLastUpdated === undefined ? null : userDataFromDb.consolidatedDocumentAnalysisSummaryLastUpdated,
          };
          setUser(appUser);
          setShowOnboardingModal(!appUser.onboardingComplete);
        } else {
          const newUserProfile: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'New User',
            email: firebaseUser.email || '',
            onboardingComplete: false,
            profilePictureUrl: firebaseUser.photoURL || null,
            age: null,
            height: null,
            weight: null,
            gender: null,
            birthday: null,
            existingConditions: [],
            allergies: [],
            documentMetadata: [],
            dailyCalorieGoal: 2000,
            preferences: { 
              accentColor: "#2E9AFE",
              fontSize: "default",
              highContrast: false,
              dashboardLayout: "square"
            },
            aiGeneratedOverallSummary: null,
            aiGeneratedOverallSummaryLastUpdated: null,
            consolidatedChatSummary: null,
            consolidatedChatSummaryLastUpdated: null,
            consolidatedDocumentAnalysisSummary: null,
            consolidatedDocumentAnalysisSummaryLastUpdated: null,
          };
          await setDoc(userDocRef, { ...newUserProfile, createdAt: serverTimestamp(), lastUpdated: serverTimestamp() });
          setUser(newUserProfile);
          setShowOnboardingModal(true);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setUser(null);
      setShowOnboardingModal(false);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, [router]);

  const updateUserProfile = useCallback(async (profileData: Partial<UserProfileData> & {name?: string, profilePictureUrl?: string | null}) => {
    if (!user) return;
    const userDocRef = doc(db, "users", user.id);
    
    const firestoreReadyData: { [key: string]: any } = {};
    (Object.keys(profileData) as Array<keyof typeof profileData>).forEach(key => {
        const value = profileData[key];
        if (key === 'preferences' && typeof value === 'object' && value !== null) {
            firestoreReadyData[key] = { ...(user.preferences || {}), ...value };
            (Object.keys(firestoreReadyData[key]) as Array<keyof UserPreferences>).forEach(prefKey => {
                if (firestoreReadyData[key][prefKey] === undefined) {
                    firestoreReadyData[key][prefKey] = null;
                }
            });
        } else {
            firestoreReadyData[key] = value === undefined ? null : value;
        }
    });
    firestoreReadyData.lastUpdated = serverTimestamp();

    try {
      if (Object.keys(firestoreReadyData).length > 0) {
        await updateDoc(userDocRef, firestoreReadyData);
      }
      
      setUser(currentUser => {
        if (!currentUser) return null;
        const updatedUser = { ...currentUser };
        (Object.keys(profileData) as Array<keyof typeof profileData>).forEach(key => {
            const value = profileData[key];
             if (key === 'preferences' && typeof value === 'object' && value !== null) {
                updatedUser.preferences = { ...(currentUser.preferences || {}), ...value };
            } else { // For all other properties, handle potential undefined by setting to null or the value
                (updatedUser as any)[key] = value === undefined ? null : value;
            }
        });
        return updatedUser;
      });

    } catch (error) {
      console.error("Error updating user profile in Firestore:", error);
      throw error;
    }
  }, [user]);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;
    const userDocRef = doc(db, "users", user.id);
    try {
      await updateDoc(userDocRef, { onboardingComplete: true, lastUpdated: serverTimestamp() });
      setUser(currentUser => currentUser ? ({ ...currentUser, onboardingComplete: true }) : null);
      setShowOnboardingModal(false);
    } catch (error) {
        console.error("Error completing onboarding in Firestore:", error);
    }
  }, [user]);

  const isAuthenticated = !!user;

  useEffect(() => {
    if (loading) return;

    const authPages = ['/login', '/signup'];
    const isAuthPage = authPages.includes(pathname);

    if (!isAuthenticated && !isAuthPage) {
      router.push('/login');
    } else if (isAuthenticated && user) {
      if (isAuthPage) {
        router.push('/dashboard');
      } else if (!user.onboardingComplete && pathname !== '/onboarding') {
        setShowOnboardingModal(true);
      } else if (user.onboardingComplete && pathname === '/onboarding') {
        router.push('/dashboard');
      }
    }
  }, [loading, isAuthenticated, user, pathname, router]);

  return (
    <AuthContext.Provider value={{
        user,
        logout,
        updateUserProfile,
        completeOnboarding,
        loading,
        isAuthenticated,
        showOnboardingModal,
        setShowOnboardingModal
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

    
"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

type Role = "student" | "teacher" | null;

interface AuthContextType {
  user: {
    name: string;
    role: Role;
    id: string;
    studentId?: string;
    studentData?: {
      firstName: string;
      lastName: string;
      nativeLanguage: string;
      frenchLevel: string;
      mathLevel: string;
      currentSession?: any;
      skillsSummary?: any;
    };
  } | null;
  isLoading: boolean;
  loginAsStudent: (id: string) => Promise<boolean>;
  loginAsTeacher: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem("dram_user_session");
    if (saved) {
      setUser(JSON.parse(saved));
    }
    setIsLoading(false);
  }, []);

  const loginAsStudent = async (id: string) => {
    try {
      const res = await fetch(`/api/students/login?studentId=${id}`);
      if (res.ok) {
        const student = await res.json();
        const newUser = {
          name: `${student.firstName} ${student.lastName}`,
          role: "student" as Role,
          id: student._id,
          studentId: student.studentId,
          studentData: student,
        };
        setUser(newUser);
        sessionStorage.setItem("dram_user_session", JSON.stringify(newUser));
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const loginAsTeacher = async (password: string) => {
    // For prototype, we use a fixed password
    if (password === "admin123") {
      const newUser = {
        name: "Professeur",
        role: "teacher" as Role,
        id: "teacher-1",
      };
      setUser(newUser);
      sessionStorage.setItem("dram_user_session", JSON.stringify(newUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("dram_user_session");
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, loginAsStudent, loginAsTeacher, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

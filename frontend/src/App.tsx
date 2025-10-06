import React, { useState } from "react";
import { LoginPage } from "./components/LoginPage";
import { Dashboard } from "./components/Dashboard";
import { TripInputForm } from "./components/TripInputForm";
import { ResultsPage } from "./components/ResultsPage";
import { PastTripsPage } from "./components/PastTripsPage";
import { ProfilePage } from "./components/ProfilePage";
import { calculateTrip, calculateTripLocal } from "./components/TripCalculator";
import { ELDLogTest } from "./components/ELDLogTest";

type Page =
  | "login"
  | "dashboard"
  | "trip-input"
  | "results"
  | "past-trips"
  | "profile"
  | "eld-test";

interface User {
  id: string;
  email: string;
  name: string;
  currentCycleUsed: number;
}

interface TripInputData {
  currentLocation: string;
  pickupLocation: string;
  dropoffLocation: string;
  currentCycleUsed: number;
  useSleeperBerth: boolean;
  includeFuelStops: boolean;
}

interface TripResult {
  id: string;
  date: string;
  route: string;
  totalDistance: number;
  totalDrivingHours: number;
  totalOnDutyHours: number;
  isCompliant: boolean;
  remainingCycle: number;
  inputData: TripInputData;
  stops: any[];
  dailyLogs: any[];
  complianceIssues: string[];
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("login");
  const [user, setUser] = useState<User | null>(null);
  const [currentTripData, setCurrentTripData] = useState<TripInputData | null>(
    null
  );
  const [currentTripResult, setCurrentTripResult] = useState<TripResult | null>(
    null
  );
  const [pastTrips, setPastTrips] = useState<TripResult[]>([
    {
      id: "1",
      date: "2024-12-15",
      route: "Dallas, TX → Phoenix, AZ",
      totalDistance: 887,
      totalDrivingHours: 10.5,
      totalOnDutyHours: 13.5,
      isCompliant: true,
      remainingCycle: 59.5,
      stops: [],
      dailyLogs: [],
      complianceIssues: [],
      inputData: {
        currentLocation: "Dallas, TX",
        pickupLocation: "Dallas, TX",
        dropoffLocation: "Phoenix, AZ",
        currentCycleUsed: 10.5,
        useSleeperBerth: true,
        includeFuelStops: true,
      },
    },
    {
      id: "2",
      date: "2024-12-10",
      route: "Atlanta, GA → Miami, FL",
      totalDistance: 662,
      totalDrivingHours: 8.5,
      totalOnDutyHours: 11.0,
      isCompliant: true,
      remainingCycle: 61.5,
      stops: [],
      dailyLogs: [],
      complianceIssues: [],
      inputData: {
        currentLocation: "Atlanta, GA",
        pickupLocation: "Atlanta, GA",
        dropoffLocation: "Miami, FL",
        currentCycleUsed: 8.5,
        useSleeperBerth: false,
        includeFuelStops: true,
      },
    },
  ]);

  const handleLogin = (user: User) => {
    setUser(user);
    setCurrentPage("dashboard");
  };

  const handleSignup = (user: User) => {
    setUser(user);
    setCurrentPage("dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage("login");
    setCurrentTripData(null);
    setCurrentTripResult(null);
  };

  const handleTripSubmit = async (tripData: TripInputData) => {
    setCurrentTripData(tripData);

    try {
      // Use the API calculation function
      const result = await calculateTrip(tripData);
      setCurrentTripResult(result);
      setCurrentPage("results");
    } catch (error) {
      console.error("Trip calculation failed:", error);
      // Fallback to local calculation if API fails
      const result = calculateTripLocal(tripData);
      setCurrentTripResult(result);
      setCurrentPage("results");
    }
  };

  const handleSaveTrip = () => {
    if (currentTripResult) {
      setPastTrips((prev) => [currentTripResult, ...prev]);
    }
  };

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "login":
        return <LoginPage onLogin={handleLogin} onSignup={handleSignup} />;
      case "dashboard":
        return (
          <Dashboard
            user={user!}
            onNavigate={navigateTo}
            pastTripsCount={pastTrips.length}
            hasRecentTrip={currentTripResult !== null}
          />
        );
      case "trip-input":
        return (
          <TripInputForm
            user={user!}
            onSubmit={handleTripSubmit}
            onNavigate={navigateTo}
          />
        );
      case "results":
        return (
          <ResultsPage
            user={user!}
            tripResult={currentTripResult!}
            onNavigate={navigateTo}
            onSaveTrip={handleSaveTrip}
          />
        );
      case "past-trips":
        return (
          <PastTripsPage
            user={user!}
            trips={pastTrips}
            onNavigate={navigateTo}
            onViewTrip={(trip) => {
              setCurrentTripResult(trip);
              setCurrentPage("results");
            }}
          />
        );
      case "profile":
        return (
          <ProfilePage
            user={user!}
            onNavigate={navigateTo}
            onUpdateUser={setUser}
          />
        );
      case "eld-test":
        return (
          <ELDLogTest tripResult={currentTripResult} onNavigate={navigateTo} />
        );
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div className="size-full min-h-screen bg-background">
      {renderCurrentPage()}
    </div>
  );
}

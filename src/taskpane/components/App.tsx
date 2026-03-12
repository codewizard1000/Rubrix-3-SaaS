import * as React from "react";
import Routting from "./Screens/Routting/Routting";
import Loader from "./loader/Loader";
import AuthGate from "./Auth/AuthGate";
import AccountMenu from "./Auth/AccountMenu";
import { AuthProvider, useAuth } from "../context/AuthContext";

const AppShell: React.FC = () => {
  const { loading, user } = useAuth();

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return <AuthGate />;
  }

  return (
    <>
      <AccountMenu />
      <Routting />
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
};

export default App;

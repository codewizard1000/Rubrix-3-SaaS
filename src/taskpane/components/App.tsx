import * as React from "react";
import Routting from "./Screens/Routting/Routting";
import Loader from "./loader/Loader";
import AccountMenu from "./Auth/AccountMenu";
import { AuthProvider, useAuth } from "../context/AuthContext";

const AppShell: React.FC = () => {
  const { loading } = useAuth();

  if (loading) {
    return <Loader />;
  }

  // Temporary bypass: allow app usage without mandatory auth gate.
  // Account/Billing menu still appears when a user is signed in.
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

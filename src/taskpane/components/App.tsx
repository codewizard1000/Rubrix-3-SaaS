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

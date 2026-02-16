import * as React from "react";
import TeacherToolsGrid from "./Screens/Main";
import CreateSection from "./Screens/Creates/Create";
import GiveFeedbackUI from "./Screens/GiveFeedback/Feedback";
import ReferenceCheckerPanel from "./Screens/Referencehecker/RefranceCheck";
import ChangeLevelPanel from "./Screens/ChangeLevel/ChangeLevel";
import Routting from "./Screens/Routting/Routting";



const App: React.FC = () => {


  return (
    <>

      <Routting />
      {/* <GradingUi /> */}
      {/* <TeacherToolsGrid /> */}
      {/* <CreateSection /> */}
      {/* <GiveFeedbackUI /> */}
      {/* <ReferenceCheckerPanel /> */}
      {/* <ChangeLevelPanel /> */}
    </>
  );
};

export default App;

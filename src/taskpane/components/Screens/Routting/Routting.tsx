import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TeacherToolsGrid from '../Main';
import CreateSection from '../Creates/Create';
import GiveFeedback from '../GiveFeedback/Feedback';
import ReferenceCheckerPanel from '../Referencehecker/RefranceCheck';
import ChangeLevelPanel from '../ChangeLevel/ChangeLevel';
import MainBodyWritingTools from '../MainBodyWriting/MainBodyWriting';

const Routting = () => {
    return (
        <MemoryRouter>
            <Routes>
                <Route path="/" element={<TeacherToolsGrid />} />
                <Route path="/create" element={<CreateSection />} />
                <Route path="/feedback" element={<GiveFeedback />} />
                <Route path="/RefranceCheck" element={<ReferenceCheckerPanel />} />
                <Route path="/changelevel" element={<ChangeLevelPanel />} />
                <Route path="/mainBodyWritingTools" element={<MainBodyWritingTools />} />
            </Routes>
        </MemoryRouter>
    );
};

export default Routting;

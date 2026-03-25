import React from "react";
import { MemoryRouter, Navigate, Route, Routes } from "react-router-dom";
import TeacherToolsGrid from '../Main';
import CreateSection from '../Creates/Create';
import GiveFeedback from '../GiveFeedback/Feedback';
import ChangeLevelPanel from '../ChangeLevel/ChangeLevel';
import MainBodyWritingTools from '../MainBodyWriting/MainBodyWriting';
import { useAuth } from "../../../context/AuthContext";

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    const { user } = useAuth();
    if (!user?.id) {
        return <Navigate to="/" replace />;
    }

    return children;
};

const Routting = () => {
    return (
        <MemoryRouter>
            <Routes>
                <Route path="/" element={<TeacherToolsGrid />} />
                <Route path="/create" element={<ProtectedRoute><CreateSection /></ProtectedRoute>} />
                <Route path="/feedback" element={<ProtectedRoute><GiveFeedback /></ProtectedRoute>} />
                <Route path="/changelevel" element={<ProtectedRoute><ChangeLevelPanel /></ProtectedRoute>} />
                <Route path="/mainBodyWritingTools" element={<ProtectedRoute><MainBodyWritingTools /></ProtectedRoute>} />
            </Routes>
        </MemoryRouter>
    );
};

export default Routting;

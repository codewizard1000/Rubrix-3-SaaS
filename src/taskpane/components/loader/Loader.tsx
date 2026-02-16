import React from "react";
import { HashLoader } from "react-spinners";

const Loader: React.FC = () => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        background: "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(2px) saturate(130%) brightness(104%)",
        WebkitBackdropFilter: "blur(2px) saturate(130%) brightness(104%)",
        boxShadow:
          "inset 0 0 30px rgba(255, 255, 255, 0.02), 0 0 10px rgba(0, 0, 0, 0.06)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 70%)",
          animation: "drift 18s ease-in-out infinite alternate",
          opacity: 0.4,
        }}
      ></div>

      <style>
        {`
          @keyframes drift {
            0% { transform: translate(-10%, -5%) scale(1); }
            50% { transform: translate(10%, 5%) scale(1.05); }
            100% { transform: translate(-10%, -5%) scale(1); }
          }
        `}
      </style>

      <HashLoader color="#2563eb" speedMultiplier={1.5} />
    </div>
  );
};

export default Loader;

import React from "react";

export const Loader = ({ text }) => (
  <div className="flex-center" style={{ flex: 1 }}>
    <div>
      <div className="loading-spinner loading-spinner--indigo flex-center flex">
        <div className="wrapper">
          <div className="wheel" />
        </div>
      </div>
      {text === false ? null : (
        <div className="base-margin-top text-center">
          {text || "Loading..."}
        </div>
      )}
    </div>
  </div>
);

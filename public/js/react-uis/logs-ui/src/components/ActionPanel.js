import React from "react";

export const ActionPanel = ({ children }) => {
  return (
    <div className="panel position-sticky actions no-padding-left no-padding-right">
      <div className="flex-center-vertical flex">{children}</div>
    </div>
  );
};

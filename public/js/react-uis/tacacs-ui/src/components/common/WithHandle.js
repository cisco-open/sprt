import React from "react";
import { sortableHandle } from "react-sortable-hoc";

const DragHandle = sortableHandle(() => (
  <span className="drag-handle half-margin-right" />
));

export default ({ children }) => (
  <div className="flex-fill flex-center-vertical" style={{ minWidth: 0 }}>
    <DragHandle />
    {children}
  </div>
);

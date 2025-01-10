import React from "react";

import { Button } from "react-cui-2.0";

export default ({ text, onClick }) => (
  <div className="flex flex-center half-margin-top half-margin-bottom">
    <Button.Light onClick={onClick}>
      {text || "Add"}
      <span
        className="icon-add-outline qtr-margin-left"
        title={text || "Add"}
      />
    </Button.Light>
  </div>
);

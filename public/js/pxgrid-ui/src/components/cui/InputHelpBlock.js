import React from "react";

import { helpBlockAnimation } from "./utils";

export const InputHelpBlock = ({ text }) => (
  <div className={`help-block text-danger ${helpBlockAnimation}`} role="alert">
    <span>{text}</span>
  </div>
);

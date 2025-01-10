import React from "react";
import { elementStyle } from "./utils";

const Div = ({ f }) => (
  <div className={f.class || ""} style={elementStyle(f.style || {})}>
    {f.value}
  </div>
);

export default Div;

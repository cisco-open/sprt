import React from "react";
import PropTypes from "prop-types";

import { Label } from "react-cui-2.0";

const msToHMS = (ms) => {
  // 1- Convert to seconds:
  let seconds = parseInt(ms / 1000, 10);
  // 2- Extract hours:
  const hours = parseInt(seconds / 3600, 10); // 3,600 seconds in 1 hour
  seconds %= 3600; // seconds remaining after extracting hours
  // 3- Extract minutes:
  const minutes = parseInt(seconds / 60, 10); // 60 seconds in 1 minute
  // 4- Keep only seconds not extracted to minutes:
  seconds %= 60;
  ms -= (hours * 3600 + minutes * 60 + seconds) * 1000;

  return [hours, minutes, seconds, ms];
};

export const DiffLabel = ({ curr, prev }) => {
  const diff = prev > -1 ? parseInt(curr - prev, 10) : -1;
  if (diff < 0) return null;

  const a = msToHMS(diff);
  return (
    <div style={{ position: "absolute", left: "50%", top: "-9px" }}>
      <Label
        size="tiny"
        color={a[2] ? "warning" : a[0] || a[1] ? "danger" : "info"}
        style={{ position: "absolute", left: "-50%", whiteSpace: "nowrap" }}
        raised
      >
        {"+ "}
        {a[0] ? `${a[0]} h ` : ""}
        {a[1] ? `${a[1]} m ` : ""}
        {a[2] ? `${a[2]} s ` : ""}
        {a[3] ? `${a[3]} ms` : "0 ms"}
      </Label>
    </div>
  );
};

DiffLabel.propTypes = {
  curr: PropTypes.number.isRequired,
  prev: PropTypes.number.isRequired,
};

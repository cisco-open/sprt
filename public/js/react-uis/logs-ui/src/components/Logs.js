/* eslint-disable import/prefer-default-export */
import React from "react";

import { LogEntry } from "./LogEntry";

export const Logs = ({ logs, style, ...props }) => (
  <pre
    style={{
      ...(style || {}),
      whiteSpace: ["pre-wrap", "-moz-pre-wrap", "-pre-wrap", "-o-pre-wrap"],
      wordWrap: "break-word",
    }}
  >
    {logs.map((log) => (
      <LogEntry log={log} key={log.id} {...props} />
    ))}
  </pre>
);

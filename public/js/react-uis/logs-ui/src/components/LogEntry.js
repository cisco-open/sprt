/* eslint-disable react/prop-types */
/* eslint-disable import/prefer-default-export */
import React from "react";

import { JsonViewContext } from "../contexts";

const replaceWithTag = (text, regex, newTag) => {
  const rg = new RegExp(`(${regex})`, "gi");
  const parts = text.split(rg);
  return parts.map((part, i) =>
    i % 2 === 1 ? React.createElement(newTag, { key: i }) : part
  );
};

const getHighlightedText = (text, higlight, className, br = false) => {
  const rg = new RegExp(`(${higlight})`, "gi");
  const parts = text.split(rg);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className={className}>
        {br ? replaceWithTag(part, "\n", "br") : part}
      </span>
    ) : br ? (
      replaceWithTag(part, "\n", "br")
    ) : (
      part
    )
  );
};

const highLightJson = (text, showJson) => {
  if (text.indexOf("jsondata=") < 0) return text;
  const rg = new RegExp(`(.*)(jsondata=)'({.*})'`, "gi");
  const parts = text.split(rg);
  return parts.map((part, i) =>
    part.indexOf("jsondata") === 0 ? (
      <a
        key={i}
        onClick={() => showJson(parts[i + 1])}
        style={{ display: "inline" }}
      >
        {part}
      </a>
    ) : (
      part
    )
  );
};

export const LogEntry = ({ log, showOwner }) => {
  const { showJson } = React.useContext(JsonViewContext);
  if (!log || !log.message) return null;
  let clName;
  switch (log.loglevel) {
    case "INFO":
      clName = "text-info";
      break;
    case "WARNING":
    case "WARN":
      clName = "text-warning";
      break;
    case "ERROR":
    case "FATAL":
      clName = "text-danger";
      break;
    case "DEBUG":
    case "TRACE":
    default:
      clName = "text-muted";
  }

  let olabel;
  if (showOwner) {
    olabel = [];
    if (/__api$/.test(log.owner))
      olabel.push(
        <span key="api" className="text-muted">
          {"API: ".padEnd(11)}
        </span>
      );
    if (/__watcher$/.test(log.owner))
      olabel.push(
        <span key="watcher" className="text-muted">
          {"WATCHER: ".padEnd(11)}
        </span>
      );
    if (/__generator$/.test(log.owner))
      olabel.push(
        <span key="generator" className="text-vibrant">
          {"GENERATOR: ".padEnd(11)}
        </span>
      );
    if (/__udp_server$/.test(log.owner))
      olabel.push(
        <span key="coa" className="text-warning-alt">
          {"COA: ".padEnd(11)}
        </span>
      );
  }

  if (typeof log.message === "string")
    log.message = getHighlightedText(
      log.message,
      "\\w+.p[ml]:\\d+:",
      "text-darkgreen text-normal",
      true
    );

  const parseJson = inValue => {
    return inValue.map(m => {
      if (typeof m === "string") return highLightJson(m, showJson);
      if (Array.isArray(m)) return parseJson(m);
      return m;
    });
  };

  if (Array.isArray(log.message)) {
    log.message = parseJson(log.message);
  }

  return (
    <p style={{ textIndent: "-2em", margin: "-0 1em 0 3em" }}>
      {log.timestamp.padEnd(23, "0")}
      {": "}
      {olabel || ""}
      <span className={clName}>{log.loglevel}</span>
      {": "}
      {log.message}
    </p>
  );
};

import React from "react";

import { notification, Alert } from "react-cui-2.0";

export const notifyOfError = (message, log = false) => {
  if (log) console.error(log);
  notification(
    "Error",
    <Alert.Error className="text-left">{message}</Alert.Error>
  );
};

export const parseJSON = (v) => {
  try {
    return JSON.parse(v);
  } catch (e) {
    return v;
  }
};

export const notifyFromError = (from) => {
  const error = parseJSON(from);
  if (typeof error === "object" && error.messageString) {
    notifyOfError(error.messageString);
  } else notifyOfError(error);
};

export const isSuccess = (r) => typeof r === "object" && r.state === "success";

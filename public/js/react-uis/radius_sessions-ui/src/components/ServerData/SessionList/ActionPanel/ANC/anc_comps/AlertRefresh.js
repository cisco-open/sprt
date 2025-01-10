import React from "react";
import { Alert } from "react-cui-2.0";

export const Refresh = ({ refresh, formGroup }) => (
  <a onClick={() => refresh()} className={formGroup ? "form-group" : ""}>
    <span className={formGroup ? "flex-center-vertical" : ""}>
      Refresh
      <span className="half-margin-left icon-refresh" />
    </span>
  </a>
);

export default ({ refresh, children, ...props }) => {
  return (
    <Alert {...props}>
      {children}
      <Refresh refresh={refresh} />
    </Alert>
  );
};

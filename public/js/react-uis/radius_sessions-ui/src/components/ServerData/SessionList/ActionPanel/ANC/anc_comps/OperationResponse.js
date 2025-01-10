import React from "react";
import { getIn } from "formik";

import { Alert } from "react-cui-2.0";

export const OperationResponse = ({ response }) => {
  if (!response) return null;

  if (response.error) {
    return (
      <Alert type="error" title="Operation failed" className="half-margin-top">
        {"Call failed: "}
        {getIn(response.error, "response.data.message", response.error.message)}
      </Alert>
    );
  }

  return (
    <div className="panel panel--bordered half-margin-top">
      <h4>Latest Response</h4>
      <dl className="dl--inline-wrap half-margin-bottom">
        {Object.keys(response).map((k) => (
          <React.Fragment key={k}>
            <dt>{k}</dt>
            <dd>{response[k]}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
};

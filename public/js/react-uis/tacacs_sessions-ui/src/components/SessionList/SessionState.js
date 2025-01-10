import React from "react";

import { Icon } from "react-cui-2.0";

const StateRejected = () => (
  <span className="text-danger" title="Rejected">
    <Icon icon="error" />
  </span>
);

const StateAccepted = () => (
  <span className="text-success" title="Accepted">
    <Icon icon="check-square" />
  </span>
);

const StateError = () => (
  <span className="text-danger" title="Error">
    <Icon icon="warning" />
  </span>
);

const StateUnknown = () => (
  <span>
    <Icon icon="question-circle" />
  </span>
);

export const SessionState = ({ session: { attributes } }) => {
  switch (attributes.state) {
    case "ACCEPTED":
    case "ACCEPTED_AUTHZ":
    case "ACCEPTED_ACCT":
      return <StateAccepted />;
    case "REJECTED":
    case "REJECTED_AUTHZ":
    case "REJECTED_ACCT":
      return <StateRejected />;
    case "ERROR_AUTHC":
    case "ERROR_AUTHZ":
    case "ERROR_ACCT":
      return <StateError />;
    default:
      return <StateUnknown />;
  }
};

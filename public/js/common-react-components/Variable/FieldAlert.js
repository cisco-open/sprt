import React from "react";

import { Alert } from "react-cui-2.0";

export default ({ f: { severity, value } }) => (
  <Alert type={severity}>{value}</Alert>
);

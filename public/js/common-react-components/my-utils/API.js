import React from "react";
import PropTypes from "prop-types";

import { Panel } from "react-cui-2.0";

export const HEADERS = {
  ACCEPT_ONLY: {
    Accept: "application/json",
  },
  ALL: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
};

const PREPEND = "    ";

const API = ({ method, headers, auth, data, url }) => {
  const lines = [`curl -X ${method.toUpperCase()}`];
  Object.keys(headers)
    .sort()
    .forEach((header) => lines.push(`-H "${header}: ${headers[header]}"`));
  if (auth) lines.push(`-H "Authorization: ${auth}"`);
  if (data) lines.push(`-d '${JSON.stringify(data)}'`);
  lines.push(url);

  return (
    <>
      <div className="row">
        <div className="col-2">
          <div>Method:</div>
          <Panel bordered>{method.toUpperCase()}</Panel>
        </div>
        <div className="col-10">
          <div>URL:</div>
          <Panel bordered>{url}</Panel>
        </div>
      </div>
      <div className="half-margin-top">
        <div>Headers:</div>
        <Panel bordered>
          <pre style={{ wordBreak: "break-word" }} className="text-small">
            <code>
              {Object.keys(headers)
                .sort()
                .map((h) => `${h}: ${headers[h]}`)
                .join("\n")}
              {auth ? `\nAuthorization: ${auth}` : null}
            </code>
          </pre>
        </Panel>
      </div>
      {data ? (
        <div className="half-margin-top">
          <div>Data:</div>
          <Panel bordered>
            <pre style={{ wordBreak: "break-word" }} className="text-small">
              <code>{JSON.stringify(data)}</code>
            </pre>
          </Panel>
        </div>
      ) : null}
      <div className="half-margin-top">
        <div>cURL example:</div>
        <Panel bordered>
          <pre style={{ wordBreak: "break-word" }} className="text-small">
            <code>{lines.join(` \\\n${PREPEND}`)}</code>
          </pre>
        </Panel>
      </div>
    </>
  );
};

API.propTypes = {
  method: PropTypes.string,
  headers: PropTypes.shape({}),
  auth: PropTypes.string,
  data: PropTypes.oneOfType(
    PropTypes.string,
    PropTypes.shape({}),
    PropTypes.arrayOf(PropTypes.any)
  ),
  url: PropTypes.string.isRequired,
};

API.defaultProps = {
  method: "GET",
  headers: HEADERS.ACCEPT_ONLY,
  auth: null,
  data: null,
};

export default API;

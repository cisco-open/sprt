import React from "react";

import { BulkContext } from "../contexts";

export default ({ bulks, selectBulk }) => {
  const { server, ...bulk } = React.useContext(BulkContext);
  return (
    <div>
      <div className="subheader base-margin-left hidden-sm-down">
        Server
        <h6 className="text-uppercase no-margin">{server}</h6>
      </div>
      <ul className="tabs tabs--vertical">
        {bulks.map((b) => (
          <li
            className={`tab${bulk.name === b.name ? " active" : ""}`}
            key={b.name}
          >
            <a className="flex bulk-link" onClick={() => selectBulk(b)}>
              <div className="tab__heading text-left flex-fluid half-margin-right">
                {b.name === "none" ? "Non-bulked" : b.name}
              </div>
              <span
                className="label label--tiny label--info label--outlined half-margin-right"
                title="Total sessions of the none"
              >
                {b.sessions}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

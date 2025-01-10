import React from "react";
import PropTypes from "prop-types";
import { useParams, useRouteMatch, Link } from "react-router-dom";
import { eventManager } from "my-utils/eventManager";

import { BulksContext } from "../../contexts";
import { bulkRefreshEvent } from "./SessionList/index";

const List = () => {
  const { server, proto } = useParams();
  const { path } = useRouteMatch();
  const { bulks } = React.useContext(BulksContext);
  const match = useRouteMatch({
    path: `${path}bulk/:bulk/`,
    strict: true,
  });

  if (!Array.isArray(bulks) || !bulks.length) return null;

  return bulks.map((b) => (
    <li
      className={`tab${match && match.params.bulk === b.name ? " active" : ""}`}
      key={b.name}
    >
      <Link
        className="flex bulk-link"
        to={`/server/${proto ? `${proto}/` : ""}${server}/bulk/${b.name}/`}
        onClick={() => {
          if (match && match.params.bulk === b.name)
            eventManager.emit(bulkRefreshEvent);
        }}
        disabled={b.state === "loading"}
      >
        <div className="tab__heading text-left flex-fluid half-margin-right">
          {b.name === "none" ? "Non-bulked" : b.name}
        </div>
        {b.state === "loading" ? (
          <span
            className="icon-animation spin half-margin-right"
            aria-hidden="true"
          />
        ) : (
          <span
            className="label label--tiny label--info label--outlined half-margin-right"
            title="Total sessions of the none"
          >
            {b.sessions}
          </span>
        )}
      </Link>
    </li>
  ));
};

const BulksList = ({ loadingState }) => {
  const { server } = useParams();

  return (
    <div>
      <div className="subheader base-margin-left hidden-sm-down">
        Server
        <h6>{server}</h6>
      </div>
      <ul className="tabs tabs--vertical">
        {loadingState.isPending ? (
          <li className="tab">
            <a>Loading...</a>
          </li>
        ) : null}
        {loadingState.isRejected ? (
          <li className="tab text-danger">
            <a>
              <span className="icon-warning-outline qtr-margin-right" />
              Failed
            </a>
          </li>
        ) : null}
        {loadingState.isResolved ? <List /> : null}
      </ul>
    </div>
  );
};

BulksList.propTypes = {
  loadingState: PropTypes.shape({
    isPending: PropTypes.bool,
    isRejected: PropTypes.bool,
    isResolved: PropTypes.bool,
  }).isRequired,
};

export default BulksList;

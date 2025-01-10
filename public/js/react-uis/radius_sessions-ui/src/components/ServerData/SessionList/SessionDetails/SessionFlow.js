import React from "react";
import { useHistory, useRouteMatch } from "react-router-dom";

const SessionFlow = ({ session: { id } }) => {
  // const { server, bulk } = useParams();
  const { url } = useRouteMatch();
  const history = useHistory();

  return (
    <a
      onClick={() => history.push(`${url}session-flow/${id}/`)}
      className="qtr-margin-right"
    >
      <span className="icon-diagnostics" title="Session flow (packets)" />
    </a>
  );
};

export default SessionFlow;

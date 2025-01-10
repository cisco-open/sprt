import React from "react";
import PropTypes from "prop-types";

const states = {
  ACCOUNTING_STARTED: (
    <span className="text-info" title="Accounting started">
      <span className="icon-info" />
    </span>
  ),
  ACCEPTED: (
    <span className="text-success" title="ACCESS_ACCEPT received">
      <span className="icon-check-square" />
    </span>
  ),
  REJECTED: (
    <span className="text-danger" title="ACCESS_REJECT received">
      <span className="icon-error" />
    </span>
  ),
  DROPPED: (
    <span className="text-warning" title="Session was dropped">
      <span className="icon-exclamation-triangle" />
    </span>
  ),
  GUEST_SUCCESS: (
    <span className="text-success" title="Guest authentication was successful">
      <span className="icon-contact" />
    </span>
  ),
  GUEST_FAILURE: (
    <span className="text-danger" title="Guest authentication failed">
      <span className="icon-contact" />
    </span>
  ),
  GUEST_REGISTERED: (
    <span className="text-info" title="Guest user registered">
      <span className="icon-add-contact" />
    </span>
  ),
  default: (
    <span title="Unknown">
      <span className="icon-question-circle" />
    </span>
  )
};

export const SessionState = ({
  session: {
    attributes: { StatesHistory, State }
  }
}) => {
  const code = React.useMemo(
    () => (StatesHistory ? StatesHistory.slice(-1).pop().code : State),
    [StatesHistory, State]
  );

  return states[code] || states.default;
};

SessionState.propTypes = {
  session: PropTypes.shape({
    attributes: PropTypes.shape({
      StatesHistory: PropTypes.array,
      State: PropTypes.string
    })
  }).isRequired
};

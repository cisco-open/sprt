import React from "react";
import PropTypes from "prop-types";

import { Spinner as Loader } from "react-cui-2.0";

import { ActionPanel } from "./ActionPanel";
import { SessionsTable } from "./SessionsTable";

const LoadOverlay = ({ what, active }) => {
  if (!active) return null;

  if (!what.current) return <Loader />;

  return (
    <div
      className="load-overlay flex flex-center"
      style={{
        width: what.current.offsetWidth,
        height: what.current.offsetHeight,
        top: what.current.offsetTop,
        left: what.current.offsetLeft,
      }}
    >
      <Loader />
    </div>
  );
};

LoadOverlay.propTypes = {
  what: PropTypes.shape({ current: PropTypes.any }).isRequired,
  active: PropTypes.bool,
};

LoadOverlay.defaultProps = {
  active: false,
};

const List = ({ loadingState: { status, isPending }, bulkLoaded }) => {
  React.useEffect(() => {
    if (status === "fulfilled") bulkLoaded();
  }, [status]);

  const tableRef = React.useRef(null);

  return (
    <div className="tab-pane active">
      <ActionPanel loading={isPending} />
      <SessionsTable loading={isPending} tableRef={tableRef} />
      <LoadOverlay what={tableRef} active={isPending} />
    </div>
  );
};

List.propTypes = {
  loadingState: PropTypes.shape({
    status: PropTypes.string,
    isPending: PropTypes.bool,
  }).isRequired,
  bulkLoaded: PropTypes.func.isRequired,
};

List.defaultProps = {};

export default List;

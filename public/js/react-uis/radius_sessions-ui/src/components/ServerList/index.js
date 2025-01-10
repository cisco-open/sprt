import React from "react";
import PropTypes from "prop-types";
import { useAsync } from "react-async";
import { Link } from "react-router-dom";

import { Spinner as Loader, Alert } from "react-cui-2.0";

import { getServers } from "../../actions";

const titles = {
  radius: "RADIUS",
  tacacs: "TACACS+",
};

const order = ["radius", "tacacs"];

const ServerTitle = ({ srv }) => (
  <>
    <h4 className="text-uppercase no-margin flex-fluid">
      {srv.friendly_name || srv.server}
    </h4>
    <span
      className="label label--tiny label--info label--outlined half-margin-left"
      title="Amount of sessions"
    >
      {srv.sessionscount}
    </span>
  </>
);

ServerTitle.propTypes = {
  srv: PropTypes.shape({
    friendly_name: PropTypes.string,
    server: PropTypes.string,
    sessionscount: PropTypes.any,
  }).isRequired,
};

const ServersByProto = ({ proto, servers }) => {
  return servers.length ? (
    <>
      <div className="flex-center-vertical">
        <h3 className="display-3 base-margin-top text-capitalize flex-fluid">
          {titles[proto] || proto.toUpperCase()}
        </h3>
      </div>
      <div id="servers-container" className="row">
        {servers.map((srv) => (
          <div
            className="col-md-6 col-lg-4 col-xl-3 qtr-margin-bottom animated fadeIn"
            key={srv.server}
          >
            <div className="panel panel--bordered-right panel--bordered-bottom panel--compressed">
              <div className="subheader no-margin text-muted">{srv.server}</div>
              {proto === "radius" ? (
                <Link
                  to={`/server/radius/${srv.server}/`}
                  className="flex-center-vertical"
                >
                  <ServerTitle srv={srv} />
                </Link>
              ) : (
                <a
                  href={`/manipulate/server/${proto}/${srv.server}/`}
                  className="flex-center-vertical"
                >
                  <ServerTitle srv={srv} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  ) : null;
};

ServersByProto.propTypes = {
  proto: PropTypes.string.isRequired,
  servers: PropTypes.arrayOf(PropTypes.any).isRequired,
};

const ServerList = () => {
  const loadingState = useAsync({
    promiseFn: getServers,
  });

  if (loadingState.isRejected)
    return (
      <div className="section">
        <div className="tab-pane active">
          <Alert.Warning title="Error">
            {"Error occured while fetching data from server: "}
            {loadingState.error.message}
          </Alert.Warning>
        </div>
      </div>
    );

  if (loadingState.isPending)
    return (
      <div className="flex-center">
        <Loader />
      </div>
    );

  const { servers } = loadingState.data;

  if (
    !servers ||
    !order.some((k) => Array.isArray(servers[k]) && servers[k].length)
  )
    return (
      <>
        <div className="flex-center-vertical">
          <h3 className="display-3 base-margin-top text-capitalize flex-fluid">
            No sessions
          </h3>
        </div>
        <p>Nothing found. Try to generate sessions first.</p>
      </>
    );

  return order.map((k) => (
    <ServersByProto key={k} proto={k} servers={servers[k]} />
  ));
};

ServerList.propTypes = {};

ServerList.defaultProps = {};

export default ServerList;

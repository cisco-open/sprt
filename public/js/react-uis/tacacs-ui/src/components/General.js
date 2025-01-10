import React from "react";

import NetworkAccessDevice from "./GeneralComponents/NetworkAccessDevice";
import Server from "./GeneralComponents/Server";
import SessionsGeneration from "./GeneralComponents/SessionsGeneration";

const General = () => {
  React.useEffect(() => {}, []);

  return (
    <div className="section section--compressed">
      <div className="row">
        <div className="col">
          <NetworkAccessDevice />
          <Server />
        </div>
        <div className="col">
          <SessionsGeneration />
        </div>
      </div>
    </div>
  );
};

export default General;

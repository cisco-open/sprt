import React from "react";

import Credentials from "./UserDataComponents/Credentials";
import IPAddress from "./UserDataComponents/IPAddress";

const UserData = () => (
  <div className="section section--compressed">
    <div className="row">
      <div className="col">
        <Credentials />
      </div>
      <div className="col">
        <IPAddress />
      </div>
    </div>
  </div>
);

export default UserData;

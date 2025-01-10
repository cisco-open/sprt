import React from "react";
import { connect } from "formik";

import OptionsSectionHeader from "../common/OptionsSectionHeader";
import NadIpAddress from "./NadIpAddress";
import NadTcp from "./NadTcp";

const NetworkAccessDevice = () => (
  <>
    <OptionsSectionHeader title="Network access device" />
    <div className="panel-body">
      <NadIpAddress />
      <NadTcp />
    </div>
  </>
);

export default connect(NetworkAccessDevice);

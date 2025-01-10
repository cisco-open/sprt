import React from "react";

import { Alert } from "react-cui-2.0";
import Fade from "animations/Fade";

const AuthOptions = ({ method }) => {
  return (
    <Fade in={method === "ascii"} mountOnEnter unmountOnExit>
      <div className="form-group animated faster fadeIn">
        <Alert.Info>
          With ASCII type username and password will be sent in different
          packets.
        </Alert.Info>
      </div>
    </Fade>
  );
};

export default AuthOptions;

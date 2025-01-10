import React from "react";
import ReactModal from "react-modal";
import { BrowserRouter as Router } from "react-router-dom";

import Portal from "portal";
import { UserData } from "my-composed/UserData";
import { DynamicModal, ToastContainer } from "react-cui-2.0";

import SCEPServers from "./Servers";
import SigningCerts from "./SigningCerts";

ReactModal.setAppElement("body");

export default () => {
  return (
    <UserData>
      <Router basename="/cert/scep">
        <SCEPServers />
        <SigningCerts />
      </Router>
      <Portal id="toast-portal">
        <ToastContainer />
      </Portal>
      <DynamicModal />
    </UserData>
  );
};

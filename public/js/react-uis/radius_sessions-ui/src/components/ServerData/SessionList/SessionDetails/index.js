import React from "react";

import SessionFlow from "./SessionFlow";
import SessionDACL from "./SessionDACL";
import SessionCertificate from "./SessionCertificate";
import SessionGuest from "./SessionGuest";

export const SessionDetails = ({ session }) => (
  <>
    <SessionFlow session={session} />
    <SessionDACL session={session} />
    <SessionCertificate session={session} />
    <SessionGuest session={session} />
  </>
);

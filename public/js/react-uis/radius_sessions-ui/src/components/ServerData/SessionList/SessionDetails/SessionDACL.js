import React from "react";
import PropTypes from "prop-types";
import { useParams } from "react-router-dom";

import { eventManager } from "my-utils/eventManager";
import { daclModalEvent } from "./DACLModal";

const SessionDACL = ({ session: { attributes, id, mac } }) => {
  const { server, bulk } = useParams();

  if (!Array.isArray(attributes.DACL) || !attributes.DACL.length) return null;

  return (
    <>
      <a
        onClick={() =>
          eventManager.emit(daclModalEvent, server, bulk, id, { mac })
        }
        className="qtr-margin-right"
      >
        <span className="icon-lock" title="Show DACL" />
      </a>
    </>
  );
};

export default SessionDACL;

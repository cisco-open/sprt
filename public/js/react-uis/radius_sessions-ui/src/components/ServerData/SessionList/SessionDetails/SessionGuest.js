import React from "react";
import PropTypes from "prop-types";

import { eventManager } from "my-utils/eventManager";
import { guestModalEvent } from "./GuestModal";

const SessionGuest = ({ session: { attributes } }) => {
  if (
    !attributes.snapshot ||
    typeof attributes.snapshot.GUEST_FLOW !== "object"
  )
    return null;

  return (
    <>
      <a
        onClick={() =>
          eventManager.emit(guestModalEvent, {
            ...attributes.snapshot.GUEST_FLOW
          })
        }
        className="qtr-margin-right"
      >
        <span className="icon-contact" title="Show guest data" />
      </a>
    </>
  );
};

export default SessionGuest;

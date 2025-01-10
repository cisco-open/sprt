import React from "react";
import PropTypes from "prop-types";

import { eventManager } from "my-utils/eventManager";
import { certModalEvent } from "./CertModal";

const SessionCertificate = ({ session: { attributes } }) => {
  if (!attributes.certificate) return null;

  return (
    <>
      <a
        onClick={() =>
          eventManager.emit(certModalEvent, attributes.certificate)
        }
        className="qtr-margin-right"
      >
        <span className="icon-certified" title="Show certificate" />
      </a>
    </>
  );
};

SessionCertificate.propTypes = {
  session: PropTypes.shape({ attributes: PropTypes.any }).isRequired
};

export default SessionCertificate;

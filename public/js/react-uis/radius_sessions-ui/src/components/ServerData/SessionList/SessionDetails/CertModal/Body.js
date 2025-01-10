import React from "react";
import PropTypes from "prop-types";

import { Alert } from "react-cui-2.0";

import Certificates from "my-composed/Certificates";

const CertModalBody = ({ chain }) => {
  if (!chain || !Array.isArray(chain) || !chain.length)
    return <Alert.Info>Chain is empty</Alert.Info>;

  return <Certificates chain={chain} />;
};

CertModalBody.propTypes = {
  chain: PropTypes.arrayOf(PropTypes.any).isRequired,
};

CertModalBody.defaultProps = {};

export default CertModalBody;

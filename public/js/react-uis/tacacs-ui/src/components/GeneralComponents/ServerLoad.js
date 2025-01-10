import React from "react";
import PropTypes from "prop-types";
import { getIn, useFormikContext } from "formik";

import { DropdownWithLoad } from "var-builder/Dropdowns";

const Server = ({
  value: {
    attributes: {
      address,
      attributes: { friendly_name: friendlyName, tac },
    },
  },
}) => {
  const { setFieldValue } = useFormikContext();
  return (
    <li>
      <a
        onClick={() => {
          setFieldValue("server.address", address);
          setFieldValue("server.ports", tac.ports || [49]);
          setFieldValue("server.secret", tac.shared || "");
        }}
      >
        <span>
          {`${friendlyName} (`}
          <span className="text-muted">
            {`${address}/${tac.ports.join(",")}`}
          </span>
          )
        </span>
      </a>
    </li>
  );
};

Server.propTypes = {
  value: PropTypes.shape({
    attributes: PropTypes.shape({
      address: PropTypes.string,
      attributes: PropTypes.shape({
        friendly_name: PropTypes.string,
        tac: PropTypes.shape({
          ports: PropTypes.arrayOf(PropTypes.any),
          shared: PropTypes.string,
        }),
      }),
    }),
  }).isRequired,
};

const Load = () => {
  const { values } = useFormikContext();
  return (
    <DropdownWithLoad
      title="Load"
      openTo="right"
      load_values={{
        nolocation: true,
        link: `/servers/dropdown/tacacs/v${getIn(
          values,
          "nad.family",
          4
        )}/?${new Date().getTime()}`,
      }}
      onClick={() => {}}
      type="link"
      divClassName="base-margin-left half-margin-top flex-center-vertical"
      className="btn--dropdown"
      renderElement={Server}
    />
  );
};

export default Load;

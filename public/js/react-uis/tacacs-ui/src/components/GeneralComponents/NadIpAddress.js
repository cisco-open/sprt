/* eslint-disable react/jsx-indent */
import React from "react";
import { Field, getIn, useFormikContext } from "formik";

import {
  Input,
  Icon,
  Dropdown,
  Button,
  ButtonGroup,
  toast,
} from "react-cui-2.0";
import { copyStringToClipboard } from "my-utils";

import { OptionsContext } from "../../contexts";

const NadIpAddress = () => {
  const options = React.useContext(OptionsContext);
  const { values, setFieldValue } = useFormikContext();

  React.useEffect(() => {
    setFieldValue("nad.ip", options.nad.ip, false);
    setFieldValue("nad.family", 4, false);
  }, []);

  const setAddr = (addr, family) => {
    setFieldValue("nad.ip", addr);
    setFieldValue("nad.family", family);
  };

  return (
    <>
      <div className="flex form-group--margin">
        <Field
          component={Input}
          name="nad.ip"
          className="half-margin-right flex-fill"
          readOnly="readonly"
          label="NAD IP address"
        />
        <ButtonGroup square className="base-margin-top">
          <Button
            type="button"
            color="link"
            title="Copy to clipboard"
            icon
            onClick={() => {
              copyStringToClipboard(getIn(values, "nad.ip"));
              toast("info", "Copied", "NAD IP copied to clipboard");
            }}
          >
            <Icon icon="clipboard" />
          </Button>
          <Dropdown
            type="button"
            alwaysClose
            className="btn--link btn--icon"
            openTo="left"
          >
            {options.nad.ips.IPv4 && options.nad.ips.IPv4.length
              ? options.nad.ips.IPv4.map((a) => (
                  <li key={`ipv4-addr-${a.idx}`}>
                    <a onClick={() => setAddr(a.addr, 4)}>{a.addr}</a>
                  </li>
                ))
              : null}
            {options.nad.ips.IPv4 &&
            options.nad.ips.IPv4.length &&
            options.nad.ips.IPv6 &&
            options.nad.ips.IPv6.length ? (
              <div className="dropdown__divider" />
            ) : null}
            {options.nad.ips.IPv6 && options.nad.ips.IPv6.length
              ? options.nad.ips.IPv6.map((a) => (
                  <li key={`ipv6-addr-${a.idx}`}>
                    <a onClick={() => setAddr(a.addr, 6)}>{a.addr}</a>
                  </li>
                ))
              : null}
          </Dropdown>
        </ButtonGroup>
      </div>
    </>
  );
};

export default NadIpAddress;

import React from "react";
import PropTypes from "prop-types";
import { getIn, Field, useFormikContext } from "formik";
import { useAsync } from "react-async";
import { Parser } from "html-to-react";

import { notification, Input, Switch, Select } from "react-cui-2.0";
import { DropdownWithLoad } from "var-builder/Dropdowns";

import { CSSFade } from "animations/Fade";

import { loadServer } from "my-actions/servers";
import { getSourceIPs } from "my-actions/general";

const htmlParser = new Parser();

const serverFields = [
  "server.address",
  "server.acctPort",
  "server.secret",
  "server.localAddr",
];

const SourceIP = () => {
  const [ips, setIPs] = React.useState(null);
  const loading = useAsync({
    promiseFn: getSourceIPs,
    onResolve: (data) => {
      if (
        typeof data === "object" &&
        data.state === "success" &&
        data.ips &&
        (data.ips.IPv4.length || data.ips.IPv6.length)
      ) {
        setIPs(data.ips);
      }
    },
  });

  if (!loading.isFulfilled || !ips) return null;

  return (
    <Field
      component={Select}
      name="server.localAddr"
      id="server.localAddr"
      title="Source IP address"
    >
      {Object.keys(ips)
        .sort()
        .map((family) => (
          <optgroup label={family} key={family}>
            {ips[family].map(({ addr }) => (
              <option key={addr} value={addr}>
                {addr}
              </option>
            ))}
          </optgroup>
        ))}
    </Field>
  );
};

const Server = ({ value: { id, title } }) => {
  const { setFieldValue, validateForm } = useFormikContext();
  const onClick = React.useCallback(async () => {
    try {
      const {
        server: {
          acct_port: acctPort,
          address,
          attributes: { shared },
        },
      } = await loadServer(id);
      setFieldValue("server.address", address, false);
      setFieldValue("server.acctPort", acctPort, false);
      setFieldValue("server.secret", shared, false);
      validateForm();
    } catch (e) {
      console.error(e);
      notification("Error", "Something went wrong");
    }
  }, [id]);

  return (
    <li>
      <a onClick={onClick}>{htmlParser.parse(title)}</a>
    </li>
  );
};

Server.propTypes = {
  value: PropTypes.shape({ id: PropTypes.string, title: PropTypes.string })
    .isRequired,
};

const ServerDropdown = ({ in: useAnother }) => {
  return (
    <CSSFade in={useAnother}>
      <DropdownWithLoad
        title="Load"
        openTo="left"
        load_values={{
          nolocation: true,
          link: `${globals.rest.servers.dropdown}?_=${new Date().getTime()}`,
        }}
        onClick={() => {}}
        type="link"
        renderElement={Server}
        className="btn--dropdown"
      />
    </CSSFade>
  );
};

ServerDropdown.propTypes = {
  in: PropTypes.bool.isRequired,
};

const ServerTab = () => {
  const {
    values,
    setFieldValue,
    unregisterField,
    validateForm,
    setFieldTouched,
  } = useFormikContext();
  const useAnotherServer = React.useMemo(
    () => getIn(values, "useAnotherServer", false),
    [values]
  );

  React.useLayoutEffect(() => {
    if (!useAnotherServer) {
      serverFields.forEach((field) => {
        setFieldValue(field, undefined, false);
        setFieldTouched(field, false, false);
        unregisterField(field);
      });
      validateForm();
    } else {
      serverFields.forEach((field) => {
        const t = getIn(values, field, undefined);
        if (typeof t === "undefined")
          setFieldValue(field, field === "server.acctPort" ? 1813 : "", false);
      });
    }
  }, [useAnotherServer, values]);

  return (
    <>
      <div className="flex separate">
        <div className="flex-fluid">
          <Field
            name="useAnotherServer"
            id="useAnotherServer"
            component={Switch}
            right="Send to different server"
          />
        </div>
        <ServerDropdown in={useAnotherServer} />
      </div>
      <CSSFade in={useAnotherServer}>
        <div className="separate">
          <Field
            name="server.address"
            id="server.address"
            component={Input}
            label="Server address"
            validate={(value) =>
              value ? undefined : "Server address is required"
            }
          />
          <Field
            name="server.acctPort"
            id="server.acctPort"
            component={Input}
            type="number"
            label="Accounting port"
            min={1}
            max={65535}
            validate={(value) =>
              value ? undefined : "Accounting port is required"
            }
          />
          <Field
            name="server.secret"
            id="server.secret"
            component={Input}
            label="Shared secret"
            validate={(value) =>
              value ? undefined : "Shared secret is required"
            }
          />
          <SourceIP />
        </div>
      </CSSFade>
    </>
  );
};

ServerTab.propTypes = {
  // selected: selectedType.isRequired,
};

export default ServerTab;

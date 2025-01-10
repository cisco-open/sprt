/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from "react";
import PropTypes from "prop-types";
import ReactModal from "react-modal";

import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";
import uuidv4 from "uuid/v4";

import Portal from "portal";

import {
  ButtonGroup,
  Button,
  Switch,
  Panel,
  Alert,
  ToastContainer,
  toast,
  Spinner as Loader,
} from "react-cui-2.0";
import { Fade } from "animations";
import { copyStringToClipboard } from "my-utils";

import { loadApiSettings, saveApiSettings } from "../actions";

const APISettings = ({ preferences }) => {
  const [enabled, setEnabled] = React.useState(() =>
    Boolean(preferences && preferences.token)
  );
  const [token, setToken] = React.useState(preferences.token || uuidv4());
  const [busy, setBusy] = React.useState(false);
  const firstUpdate = React.useRef(true);

  const updateToServer = async (data) => {
    if (busy) return;
    setBusy(true);
    try {
      await saveApiSettings(data);
      toast.success("Success", "Changes saved");
    } catch (e) {
      toast.error("Error", "Couldn't save changes", false);
    } finally {
      setBusy(false);
    }
  };

  React.useEffect(() => {
    if (firstUpdate.current) {
      firstUpdate.current = false;
      return;
    }
    updateToServer({ token, enabled });
  }, [token, enabled]);

  return (
    <>
      <Switch
        right={
          <>
            Enable API access
            {busy ? (
              <span className="qtr-margin-left icon-animation spin" />
            ) : null}
          </>
        }
        form={{ values: { api_enabled: enabled } }}
        field={{
          name: "api_enabled",
          onChange: (e) => setEnabled(e.target.checked),
        }}
        disabled={busy}
      />
      <Fade in={enabled} mountOnEnter unmountOnExit>
        <div className="base-margin-top">
          <h4>Token</h4>
          Use the following token to access SPRT through API:
          <div className="flex half-margin-bottom">
            <div className="form-group half-margin-right flex-fill">
              <div className="form-group__text">
                <input
                  type="text"
                  id="token"
                  name="token"
                  readOnly
                  value={token}
                  className="text-monospace"
                />
              </div>
            </div>
            <ButtonGroup
              square
              size="large"
              onClick={() => {
                copyStringToClipboard(token);
                toast.info("", "Token copied");
              }}
            >
              <Button.Link icon>
                <span className="icon-clipboard" title="Copy to clipboard" />
              </Button.Link>
            </ButtonGroup>
          </div>
          It should be present in Authorization header as bearer authentication
          for each API call:
          <Panel bordered className="half-margin-bottom no-margin-top">
            <pre>
              <code>
                {"Authorization: Bearer "}
                {token}
              </code>
            </pre>
          </Panel>
          <a
            onClick={() => setToken(uuidv4())}
            className={busy ? "disabled" : ""}
          >
            Generate new token
          </a>
          {busy ? (
            <span className="qtr-margin-left icon-animation spin" />
          ) : null}
        </div>
      </Fade>
    </>
  );
};

APISettings.propTypes = {
  preferences: PropTypes.shape({ token: PropTypes.string }).isRequired,
};

export default () => {
  React.useEffect(() => {
    ReactModal.setAppElement("body");
  }, []);

  const loadingState = useAsync({ promiseFn: loadApiSettings });

  return (
    <>
      <IfPending state={loadingState}>
        <Loader />
      </IfPending>
      <IfRejected state={loadingState}>
        {(error) => (
          <Alert type="error" title="Operation failed">
            {"Couldn't get API configuration: "}
            {error.message}
          </Alert>
        )}
      </IfRejected>
      <IfFulfilled state={loadingState}>
        {({ preferences }) => <APISettings preferences={preferences} />}
      </IfFulfilled>
      <Portal id="toast-portal">
        <ToastContainer />
      </Portal>
    </>
  );
};

import React from "react";
import PropTypes from "prop-types";
import { useFormikContext, getIn, Formik } from "formik";
import loadable from "@loadable/component";

import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  DisplayIf as If,
  Spinner as Loader,
  toast,
} from "react-cui-2.0";

import { testSCEPConnection, testSCEPEnroll } from "../../actions";
import { notifyOfError, notifyFromError, isSuccess } from "./utils";

const Template = loadable(() => import("my-composed/CertificateTemplate"), {
  fallback: (
    <div className="flex-center">
      <Loader text="Fetching data from server..." />
    </div>
  ),
});

function validURL(str) {
  const pattern = new RegExp(
    "^(https?:\\/\\/)?" + // protocol
    "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
    "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
    "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
    "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-z\\d_]*)?$",
    "i"
  ); // fragment locator
  return !!pattern.test(str);
}

const Busy = ({ busy }) => (
  <If condition={busy}>
    <span className="icon-animation spin qtr-margin-left" />
  </If>
);

Busy.propTypes = {
  busy: PropTypes.bool.isRequired,
};

const CSRModal = ({ isOpen, closeModal }) => {
  const { setFieldValue, values } = useFormikContext();
  const saveHandle = React.useCallback(
    (newValue) => {
      setFieldValue("csr", newValue, false);
      closeModal();
    },
    [closeModal, setFieldValue]
  );

  return (
    <Modal
      closeIcon
      closeHandle={closeModal}
      isOpen={isOpen}
      size="large"
      title="Edit CSR"
    >
      <Formik
        initialValues={{ csr: getIn(values, "csr", undefined) }}
        onSubmit={({ csr }) => saveHandle(csr)}
        enableReinitialize
      >
        {({ submitForm }) => (
          <>
            <ModalBody className="text-left">
              <Template prefix="csr" />
            </ModalBody>
            <ModalFooter>
              <Button.Light onClick={closeModal}>Close</Button.Light>
              <Button.Success onClick={submitForm}>Save</Button.Success>
            </ModalFooter>
          </>
        )}
      </Formik>
    </Modal>
  );
};

CSRModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  closeModal: PropTypes.func.isRequired,
};

const CSRButton = ({ state }) => {
  const [modal, setModal] = React.useState(false);
  const closeModal = React.useCallback(() => setModal(false), []);

  return (
    <>
      <Button
        color={state !== "can-enroll" ? "default" : "primary"}
        size="small"
        disabled={state !== "can-enroll"}
        onClick={() => setModal(true)}
      >
        Change CSR
      </Button>
      <CSRModal isOpen={modal} closeModal={closeModal} />
    </>
  );
};

CSRButton.propTypes = {
  state: PropTypes.string,
};

CSRButton.defaultProps = {
  state: null,
};

const TestConnection = ({ state }) => {
  const {
    values: { href, name },
    setFieldValue,
  } = useFormikContext();
  const [busy, setBusy] = React.useState(false);
  const testConnectionHandle = React.useCallback(async () => {
    try {
      setBusy(true);
      setFieldValue("certificates", [], false);
      const result = await testSCEPConnection(name, href);
      if (isSuccess(result)) {
        setFieldValue("certificates", result.result.certificates, false);
        return;
      }

      notifyFromError(result.error);
    } catch (e) {
      notifyOfError("Something went wrong", e);
    } finally {
      setBusy(false);
    }
  }, [href, name]);

  return (
    <Button
      color={!state ? "default" : "primary"}
      size="small"
      disabled={!state || busy}
      onClick={testConnectionHandle}
    >
      Test connection
      <Busy busy={busy} />
    </Button>
  );
};

TestConnection.propTypes = {
  state: PropTypes.string,
};

TestConnection.defaultProps = {
  state: null,
};

const TestEnroll = ({ state }) => {
  const {
    values: { href, name, certificates, csr, signer },
    setFieldValue,
  } = useFormikContext();
  const [busy, setBusy] = React.useState(false);
  const enrollHandle = React.useCallback(async () => {
    try {
      setBusy(true);
      setFieldValue("canSave", false, false);
      const result = await testSCEPEnroll(
        name,
        href,
        signer,
        certificates.reduce((list, cert) => [...list, cert.pem], []),
        csr
      );
      if (isSuccess(result)) {
        setFieldValue("canSave", true, false);
        toast.success("", "All good, you can save now.");
        return;
      }

      notifyFromError(result.error);
    } catch (e) {
      notifyOfError("Something went wrong", e);
    } finally {
      setBusy(false);
    }
  }, [href, name, certificates, signer, csr]);

  return (
    <Button
      color={state !== "can-enroll" ? "default" : "primary"}
      size="small"
      disabled={state !== "can-enroll" || busy}
      onClick={enrollHandle}
    >
      Test enrollment
      <Busy busy={busy} />
    </Button>
  );
};

TestEnroll.propTypes = {
  state: PropTypes.string,
};

TestEnroll.defaultProps = {
  state: null,
};

export const Buttons = () => {
  const {
    values: { href, certificates },
  } = useFormikContext();

  const [state, setState] = React.useState(null);

  React.useEffect(() => {
    if (validURL(href) && Array.isArray(certificates) && certificates.length) {
      setState("can-enroll");
      return;
    }
    if (validURL(href)) {
      setState("can-test");
      return;
    }
    setState(null);
  }, [href, certificates]);

  return (
    <div className="base-margin-top flex-center flex">
      <TestConnection state={state} />
      <span className="icon-arrow-right-tail half-margin-left half-margin-right" />
      <CSRButton state={state} />
      <span className="icon-arrow-right-tail half-margin-left half-margin-right" />
      <TestEnroll state={state} />
    </div>
  );
};

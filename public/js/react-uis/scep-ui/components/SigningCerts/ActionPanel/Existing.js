import React from "react";
import PropTypes from "prop-types";
import { useHistory, useRouteMatch } from "react-router-dom";
import loadable from "@loadable/component";
import { useAsync, IfFulfilled, IfPending, IfRejected } from "react-async";
import { Formik, Field } from "formik";
import download from "downloadjs";

import {
  Button,
  prompt,
  Modal,
  ModalBody,
  ModalFooter,
  toast,
  Spinner as Loader,
  Alert,
  Radios,
  Switch,
  Input,
  DisplayIf as If,
} from "react-cui-2.0";

import { CSSFade } from "animations/Fade";
import AlertErrorBoundary from "my-composed/AlertErrorBoundary";

import { SigningCertsContext } from "../../../contexts";
import { renameCert, loadCert, exportCert } from "../../../actions";

import {
  notifyOfError,
  notifyFromError,
  isSuccess,
} from "../../EditScepForm/utils";

const Certificates = loadable(() => import("my-composed/Certificates"), {
  fallback: (
    <div className="flex-center">
      <Loader text="Fetching data from server..." />
    </div>
  ),
});

const Rename = () => {
  const { selected, signers, clearSelection, update } = React.useContext(
    SigningCertsContext
  );
  const id = React.useMemo(
    () =>
      Array.isArray(selected) && selected.length === 1 ? selected[0] : null,
    [selected]
  );

  const onClick = React.useCallback(() => {
    if (!id) return;
    const s = signers.find((test) => test.id === id);
    prompt(
      "Update certificate",
      "Friendly Name",
      async (value) => {
        try {
          const r = await renameCert(id, value);
          if (isSuccess(r)) {
            toast.success("", "Certificate renamed");

            clearSelection();
            update({ ...s, friendly_name: value });
            return true;
          }

          notifyFromError(r.error);
        } catch (e) {
          notifyOfError("Something went wrong", e);
        }
        return false;
      },
      s.friendly_name,
      "text",
      "If empty, Subject will be used as Friendly Name"
    );
  }, [id, signers]);

  return (
    <Button.Light
      disabled={!Array.isArray(selected) || selected.length !== 1}
      onClick={onClick}
    >
      <span className="icon-edit half-margin-right" />
      <span>Rename</span>
    </Button.Light>
  );
};

Rename.propTypes = {};

Rename.defaultProps = {};

const DetailsModal = () => {
  const match = useRouteMatch("/signer/details/:id/");
  const history = useHistory();
  const closeModal = React.useCallback(() => history.push("/"), []);
  const id = React.useMemo(() => (match ? match.params.id : null), [match]);

  const loading = useAsync({
    promiseFn: loadCert,
    certId: id,
    certType: "signer",
    watch: id,
  });

  return (
    <Modal
      closeIcon
      closeHandle={closeModal}
      isOpen={!!match}
      size="large"
      title="Certificate details"
    >
      <ModalBody className={loading.isFulfilled ? "text-left" : ""}>
        <AlertErrorBoundary>
          <IfPending state={loading}>
            <div className="flex-center">
              <Loader text="Fetching data from server..." />
            </div>
          </IfPending>
          <IfRejected state={loading}>
            {(error) => (
              <Alert.Error>
                {"Something went wrong: "}
                {error.message}
              </Alert.Error>
            )}
          </IfRejected>
          <IfFulfilled state={loading}>
            {(data) => {
              if (!data || !data.result || !Array.isArray(data.result))
                return null;
              return <Certificates chain={data.result} />;
            }}
          </IfFulfilled>
        </AlertErrorBoundary>
      </ModalBody>
      <ModalFooter>
        <Button.Light onClick={closeModal}>OK</Button.Light>
      </ModalFooter>
    </Modal>
  );
};

const Details = () => {
  const { selected } = React.useContext(SigningCertsContext);
  const history = useHistory();
  const onClick = React.useCallback(() => {
    if (Array.isArray(selected))
      history.push(`/signer/details/${selected[0]}/`);
  }, [selected]);

  return (
    <>
      <Button.Light
        disabled={!Array.isArray(selected) || selected.length !== 1}
        onClick={onClick}
      >
        <span className="icon-eye half-margin-right" />
        <span>Details</span>
      </Button.Light>
      <DetailsModal />
    </>
  );
};

Details.propTypes = {};

Details.defaultProps = {};

const ExportModal = ({ isOpen, closeHandle, what }) => {
  const onSubmit = React.useCallback(async (values) => {
    try {
      const r = await exportCert({
        ...values,
        "full-chain": values["full-chain"] ? 1 : 0,
      });

      const disposition = r.headers["content-disposition"];
      let fileName = "certificates";
      if (disposition) {
        const fileNameMatch = disposition.match(/filename="(.+)"/);
        // eslint-disable-next-line prefer-destructuring
        if (fileNameMatch.length === 2) fileName = fileNameMatch[1];
      }
      const type = r.headers["content-type"];

      download(r.data, fileName, type);
      return true;
    } catch (e) {
      notifyOfError("Something went wrong", e);
    }
    return true;
  }, []);

  return (
    <Modal
      closeIcon
      closeHandle={closeHandle}
      isOpen={isOpen}
      title="Export parameters"
    >
      <Formik
        initialValues={{
          how: "certificates-and-keys",
          "export-format": "pem",
          "full-chain": true,
          password: "",
          type: "signer",
          what,
        }}
        onSubmit={onSubmit}
        enableReinitialize
      >
        {({ submitForm, isSubmitting, isValid, values: { how } }) => (
          <>
            <ModalBody className="text-left">
              <div className="separate">
                <Radios
                  values={[
                    {
                      value: "certificates",
                      label: "Export Certificates Only",
                    },
                    {
                      value: "certificates-and-keys",
                      label: "Export Certificates and Private Keys",
                    },
                  ]}
                  name="how"
                  inline
                />
              </div>
              <CSSFade in={how === "certificates-and-keys"}>
                <Field
                  className="fadeIn animated fastest"
                  component={Input}
                  name="password"
                  label={
                    <>
                      {"Password "}
                      <span className="text-small">(optional)</span>
                    </>
                  }
                />
              </CSSFade>
              <Field
                component={Switch}
                name="full-chain"
                right="Export with Full Chain"
              />
            </ModalBody>
            <ModalFooter>
              <Button.Light onClick={closeHandle}>Close</Button.Light>
              <Button.Success
                onClick={submitForm}
                disabled={isSubmitting || !isValid}
              >
                Export
                <If condition={isSubmitting}>
                  <span className="icon-animation qtr-margin-left spin" />
                </If>
              </Button.Success>
            </ModalFooter>
          </>
        )}
      </Formik>
    </Modal>
  );
};

ExportModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  closeHandle: PropTypes.func.isRequired,
  what: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
};

const Export = () => {
  const { selected } = React.useContext(SigningCertsContext);
  const [shown, setShown] = React.useState(false);
  const openHandle = React.useCallback(() => setShown(true), []);
  const closeHandle = React.useCallback(() => setShown(false), []);

  return (
    <>
      <Button.Light
        disabled={!Array.isArray(selected) || !selected.length}
        onClick={openHandle}
      >
        <span className="icon-export half-margin-right" />
        <span>Export</span>
      </Button.Light>
      <ExportModal isOpen={shown} closeHandle={closeHandle} what={selected} />
    </>
  );
};

Export.propTypes = {};

Export.defaultProps = {};

export { Rename, Details, Export };

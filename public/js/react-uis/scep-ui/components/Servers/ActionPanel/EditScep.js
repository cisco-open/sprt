import React from "react";
import { useHistory, useRouteMatch } from "react-router-dom";
import { useAsync, IfFulfilled, IfPending, IfRejected } from "react-async";
import { Formik } from "formik";
import loadable from "@loadable/component";

import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  Spinner as Loader,
  Alert,
  DisplayIf as If,
  toast,
} from "react-cui-2.0";

import AlertErrorBoundary from "my-composed/AlertErrorBoundary";

import { ServersContext } from "../../../contexts";
import { loadSCEPServer, saveSCEPServer } from "../../../actions";
import {
  notifyOfError,
  notifyFromError,
  isSuccess,
} from "../../EditScepForm/utils";

const EditScepForm = loadable(() => import("../../EditScepForm"), {
  fallback: (
    <div className="flex-center">
      <Loader text="Fetching data from server..." />
    </div>
  ),
});

const loadServer = async ({ serverId }) =>
  typeof serverId !== "undefined" && serverId !== null
    ? loadSCEPServer(serverId)
    : null;

export const AddScep = () => {
  const history = useHistory();
  return (
    <Button.Light onClick={() => history.push("/server/new/")}>
      <span className="icon-add-outline half-margin-right" />
      <span>Add SCEP server</span>
    </Button.Light>
  );
};

export const EditScep = () => {
  const { selected } = React.useContext(ServersContext);
  const history = useHistory();

  return (
    <Button.Light
      disabled={!Array.isArray(selected) || selected.length !== 1}
      onClick={() =>
        history.push(
          `/server/${Array.isArray(selected) ? selected[0] : "null"}/`
        )
      }
    >
      <span className="icon-edit half-margin-right" />
      <span>Edit</span>
    </Button.Light>
  );
};

const defaultInitialValues = {
  certificates: [],
  name: "",
  signer: "",
  href: "",
};

export const EditModal = () => {
  const match = useRouteMatch("/server/:id/");
  const history = useHistory();
  const closeModal = React.useCallback(() => history.push("/"), []);
  const [initialValues, setInitialValues] = React.useState(
    defaultInitialValues
  );

  const { newServers, clearSelection } = React.useContext(ServersContext);

  const serverId = React.useMemo(() => (match ? match.params.id : null), [
    match,
  ]);

  const loading = useAsync({
    promiseFn: loadServer,
    serverId,
    watch: serverId,
    onResolve: (data) => {
      if (!data || !data.result) {
        setInitialValues(defaultInitialValues);
        return;
      }
      const { result } = data;
      setInitialValues({
        certificates: result.ca_certificates,
        name: result.name,
        signer:
          result.signer ||
          (Array.isArray(result.signers) ? result.signers[0].id : ""),
        href: result.url,
        canSave: !!(
          result.ca_certificates.length &&
          result.signer &&
          result.url
        ),
      });
    },
  });

  const onSubmit = React.useCallback(
    async ({ href, name, certificates, signer }) => {
      try {
        // console.log(values);
        const r = await saveSCEPServer(
          href,
          name,
          certificates.reduce((arr, cert) => [...arr, cert.pem], []),
          signer,
          0,
          serverId
        );

        if (isSuccess(r)) {
          toast.success(
            "",
            !serverId || serverId === "new" ? "Server saved" : "Server updated"
          );

          clearSelection();
          newServers(r.scep || []);
          closeModal();
          return true;
        }

        notifyFromError(r.error);
      } catch (e) {
        notifyOfError("Something went wrong", e);
      }
      return false;
    },
    [closeModal, serverId, newServers, clearSelection]
  );

  return (
    <Modal
      closeIcon
      closeHandle={closeModal}
      isOpen={!!match}
      size="large"
      title="Edit SCEP server"
    >
      <Formik
        initialValues={initialValues}
        onSubmit={onSubmit}
        enableReinitialize
      >
        {({ isSubmitting, isValid, submitForm, values: { canSave } }) => (
          <>
            <ModalBody className={!loading.isLoading ? "text-left" : ""}>
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
                    if (!data || !data.result) return null;
                    return <EditScepForm data={data} />;
                  }}
                </IfFulfilled>
              </AlertErrorBoundary>
            </ModalBody>
            <ModalFooter>
              <Button.Light onClick={closeModal}>Close</Button.Light>
              <If condition={loading.isFulfilled}>
                <Button.Success
                  onClick={submitForm}
                  disabled={isSubmitting || !isValid || !canSave}
                >
                  Save
                  <If condition={isSubmitting}>
                    <span className="icon-animation spin half-margin-left" />
                  </If>
                </Button.Success>
              </If>
            </ModalFooter>
          </>
        )}
      </Formik>
    </Modal>
  );
};

import React from "react";
import PropTypes from "prop-types";
import loadable from "@loadable/component";

import {
  Modal,
  ModalBody,
  ModalFooter,
  Dropdown,
  Spinner as Loader,
  Button,
} from "react-cui-2.0";

import { SessionsContext } from "../../../../../contexts";

const titles = {
  getEndpointByMac: "Get policies applied to EndPoint",
  applyEndpointByIp: "Apply policy by IP",
  applyEndpointByMac: "Apply policy by MAC",
  clearEndpointByIp: "Clear policies by IP",
  clearEndpointByMac: "Clear policies by MAC",
};

const AncApp = loadable(() => import("./AncApp"), {
  fallback: (
    <div className="flex-center">
      <Loader />
    </div>
  ),
});

const AncModal = ({ closeModal, api }) => {
  const {
    sessions,
    selection: { selected },
  } = React.useContext(SessionsContext);
  return (
    <Modal
      closeIcon
      closeHandle={closeModal}
      size="large"
      isOpen={Boolean(api)}
      title={titles[api] || "ANC Operation"}
    >
      <ModalBody className="text-left">
        <AncApp
          api={api}
          session={sessions.find((s) => s.id === selected[0])}
        />
      </ModalBody>
      <ModalFooter>
        <Button.Light onClick={closeModal}>Close</Button.Light>
      </ModalFooter>
    </Modal>
  );
};

AncModal.propTypes = {
  api: PropTypes.string.isRequired,
  closeModal: PropTypes.func.isRequired,
};

const ANC = () => {
  const {
    sessions,
    selection: { selected },
  } = React.useContext(SessionsContext);
  const [modal, setModal] = React.useState(null);

  return (
    <>
      <Dropdown
        className="btn--light"
        header={
          <>
            <span className="icon-data-usage half-margin-right" />
            <span className="btn--label">ANC</span>
          </>
        }
        alwaysClose
        divClassName={
          sessions.filter((v) => selected.includes(v.id)).length !== 1
            ? "disabled"
            : ""
        }
      >
        <a className="panel" onClick={() => setModal("getEndpointByMac")}>
          Get policies applied to EndPoint
        </a>
        <Dropdown.Divider />
        <a className="panel" onClick={() => setModal("applyEndpointByIp")}>
          Apply policy by IP
        </a>
        <a className="panel" onClick={() => setModal("applyEndpointByMac")}>
          Apply policy by MAC
        </a>
        <Dropdown.Divider />
        <a className="panel" onClick={() => setModal("clearEndpointByIp")}>
          Clear policies by IP
        </a>
        <a className="panel" onClick={() => setModal("clearEndpointByMac")}>
          Clear policies by MAC
        </a>
      </Dropdown>
      <AncModal api={modal} closeModal={() => setModal(null)} />
    </>
  );
};

export default ANC;

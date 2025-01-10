import React from "react";
import PropTypes from "prop-types";
import { useParams } from "react-router-dom";
import { useAsync } from "react-async";

import {
  Modal,
  ModalBody,
  ModalFooter,
  toast,
  Dropdown,
  Textarea,
  Button,
} from "react-cui-2.0";

import { SessionsContext } from "../../../../contexts";
import { getGuestData } from "../../../../actions";

const GuestModal = ({ modal, closeModal }) => (
  <Modal
    closeIcon
    closeHandle={closeModal}
    size="large"
    isOpen={Boolean(modal)}
    title="Guest credentials"
  >
    <ModalBody className="text-left">
      <Textarea
        readOnly
        rows={30}
        field={{
          name: "credentials",
          onChange: () => {},
          value: modal ? modal.map((line) => line.join(":")).join("\n") : "",
        }}
        form={{ touched: {}, errors: {} }}
      />
    </ModalBody>
    <ModalFooter>
      <Button.Light onClick={closeModal}>OK</Button.Light>
    </ModalFooter>
  </Modal>
);

GuestModal.propTypes = {
  modal: PropTypes.arrayOf(PropTypes.any).isRequired,
  closeModal: PropTypes.func.isRequired,
};

const Guest = () => {
  const {
    sessions,
    selection: { selected },
  } = React.useContext(SessionsContext);
  const { server, bulk } = useParams();
  const [modal, setModal] = React.useState(null);

  const loadingState = useAsync({
    deferFn: getGuestData,
    server,
    bulk,
    onReject: (error) => {
      toast.error("Error", "Couldn't get data from server", false);
      console.log(error);
    },
    onResolve: (data) => {
      if (!Array.isArray(data) || !data.length) {
        toast.info("No data", "No data found");
        return;
      }

      setModal(data);
    },
  });

  return (
    <>
      <Dropdown
        className="btn--light"
        header={
          <>
            <span
              className={`${
                loadingState.isPending ? "icon-animation spin" : "icon-export"
              } half-margin-right`}
            />
            <span className="btn--label">Guest</span>
          </>
        }
        alwaysClose
        divClassName={loadingState.isPending ? "disabled" : ""}
      >
        <a
          className="panel"
          disabled={!sessions.filter((v) => selected.includes(v.id)).length}
          onClick={() => {
            loadingState.run(
              sessions.filter((v) => selected.includes(v.id)).map((s) => s.id)
            );
          }}
        >
          Export guest credentials of selected sessions
        </a>
        <a
          className="panel"
          onClick={() => {
            loadingState.run("all");
          }}
        >
          Export guest credentials of all sessions
        </a>
      </Dropdown>
      <GuestModal modal={modal} closeModal={() => setModal(null)} />
    </>
  );
};

export default Guest;

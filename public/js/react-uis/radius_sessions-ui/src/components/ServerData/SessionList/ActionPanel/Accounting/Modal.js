/* eslint-disable react/jsx-indent */
import React from "react";
import { useParams } from "react-router-dom";
import { Formik } from "formik";
import isIP from "is-ip";

import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  toast,
  DisplayIf as If,
  Button,
} from "react-cui-2.0";

import { SessionsContext, UserContext } from "../../../../../contexts";
import AccountingContext from "./context";

import { interimMapping } from "./Interims";
import { dropMapping } from "./Drops";
import { prepareValues } from "./functions";
import { actionType } from "./types";

const ModalPerAction = (action) => {
  const mapping = {
    [actionType.update]: interimMapping,
    [actionType.drop]: dropMapping,
  };

  return mapping[action] || null;
};

const AccountingModal = () => {
  const { server, bulk } = useParams();
  const { toUpdate, closeModal, action } = React.useContext(AccountingContext);
  const { api } = React.useContext(UserContext);
  const {
    sessions,
    block: { blockSession, blockAllSession, unblockSession, unblockAllSession },
    selection: { clear: clearSelection },
  } = React.useContext(SessionsContext);
  const selected = React.useMemo(() => {
    if (Array.isArray(toUpdate) && toUpdate.length) {
      return sessions
        .filter(({ id }) => toUpdate.includes(id))
        .reduce(
          (acc, { mac, ipAddr, sessid }) => [...acc, { mac, ipAddr, sessid }],
          []
        );
    }
    return null;
  }, [sessions, toUpdate]);

  const modalData = React.useMemo(() => ModalPerAction(action), [action]);

  return (
    <Modal
      closeIcon
      closeHandle={closeModal}
      size={api ? "large" : "default"}
      isOpen={Boolean(toUpdate)}
    >
      <ModalHeader>
        {modalData ? React.createElement(modalData.header, { selected }) : null}
      </ModalHeader>
      <Formik
        initialValues={modalData ? modalData.initials(selected) : {}}
        onSubmit={async (values) => {
          try {
            clearSelection();
            if (Array.isArray(toUpdate)) blockSession(...toUpdate);
            else blockAllSession();

            if (modalData)
              await modalData.submitAction(
                server,
                bulk,
                prepareValues(values, server, bulk, toUpdate, action)
              );

            closeModal();
          } catch (e) {
            if (Array.isArray(toUpdate)) unblockSession(...toUpdate);
            else unblockAllSession();
            toast.error("Error", e.message, false);
          }
        }}
        validate={(values) => {
          const errors = {};
          if (typeof values.server === "object") {
            const { address, localAddr } = values.server;
            if (
              isIP(address) &&
              localAddr &&
              isIP.version(address) !== isIP.version(localAddr)
            ) {
              errors.server = {
                localAddr:
                  "Address of the server and source IP should be of same family",
              };
            }
          }
          return errors;
        }}
      >
        {({ submitForm, isSubmitting, isValid }) => (
          <>
            <ModalBody className="text-left">
              {modalData
                ? React.createElement(modalData.body, { selected })
                : null}
            </ModalBody>
            <ModalFooter>
              <Button.Light onClick={closeModal}>Close</Button.Light>
              {modalData
                ? React.cloneElement(
                    modalData.actionButton,
                    { onClick: submitForm, disabled: isSubmitting || !isValid },
                    <>
                      {modalData.actionButton.props.children}
                      <If condition={isSubmitting}>
                        <span className="qtr-margin-left icon-animation spin" />
                      </If>
                    </>
                  )
                : null}
            </ModalFooter>
          </>
        )}
      </Formik>
    </Modal>
  );
};

export default AccountingModal;

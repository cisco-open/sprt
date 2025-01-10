import React from "react";
import Transition from "react-transition-group/Transition";
import ReactModal from "react-modal";
import PropTypes from "prop-types";

import { Button } from "./Button";
import { Input } from "./InputFormik";
import { DisplayIf } from "./Conditional";
import { eventManager, EVENTS } from "./eventManager";

export const ModalHeader = ({ className, children }) => {
  className = className ? ` ${className}` : "";
  return <div className={`modal__header${className}`}>{children}</div>;
};

export const ModalBody = ({ className, children }) => {
  className = className ? ` ${className}` : "";
  return <div className={`modal__body${className}`}>{children}</div>;
};

export const ModalFooter = ({ className, children }) => {
  className = className ? ` ${className}` : "";
  return <div className={`modal__footer${className}`}>{children}</div>;
};

export const Modal = ({
  size,
  closeIcon,
  closeHandle,
  title,
  compressed,
  left,
  children,
  autoClose,
  isOpen,
  animationDuration,
  ...props
}) => {
  props.autoClose = autoClose;
  props.onRequestClose = autoClose && closeHandle ? closeHandle : undefined;

  return (
    <Transition
      in={isOpen}
      mountOnEnter
      unmountOnExit
      timeout={animationDuration}
    >
      {(state) => (
        <ReactModal
          {...props}
          overlayClassName="modal-backdrop"
          isOpen={["entering", "entered"].includes(state)}
          className={
            "modal" +
            (size ? ` modal--${size}` : "") +
            (compressed ? " modal--compressed" : "") +
            (left ? " modal--left" : "")
          }
          closeTimeoutMS={
            typeof animationDuration === "object"
              ? animationDuration.exiting
              : animationDuration
          }
        >
          <div className="modal__dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal__content">
              {closeIcon && closeHandle ? (
                <a className="modal__close" onClick={closeHandle}>
                  <span className="icon-close" />
                </a>
              ) : null}
              {title ? (
                <ModalHeader>
                  <h1 className="modal__title">{title}</h1>
                </ModalHeader>
              ) : null}
              {children}
            </div>
          </div>
        </ReactModal>
      )}
    </Transition>
  );
};

Modal.propTypes = {
  size: PropTypes.oneOf([false, "small", "large", "full", "xlarge", "fluid"]),
  closeIcon: PropTypes.bool,
  closeHandle: PropTypes.func,
  title: PropTypes.string,
  isOpen: PropTypes.bool,
  autoClose: PropTypes.bool,
  compressed: PropTypes.bool,
  left: PropTypes.bool,
  animationDuration: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.shape({
      entering: PropTypes.number,
      exiting: PropTypes.number,
    }),
  ]),
};

Modal.defaultProps = {
  size: false,
  autoClose: true,
  animationDuration: 500,
};

export const ConfirmationModal = ({
  isOpen,
  confirmHandle,
  closeHandle,
  prompt,
  confirmType,
  confirmText,
  autoClose,
}) => {
  const [doing, setDoing] = React.useState(false);

  return (
    <Modal
      isOpen={isOpen}
      closeIcon
      closeHandle={closeHandle}
      autoClose={autoClose}
      title="Confirmation"
    >
      <ModalBody>
        <p>{prompt}</p>
      </ModalBody>
      <ModalFooter>
        <Button.White onClick={closeHandle}>Close</Button.White>
        <Button
          color={confirmType}
          disabled={doing}
          onClick={async () => {
            setDoing(true);
            if (await confirmHandle()) setDoing(false);
          }}
        >
          {confirmText || "Confirm"}
          {doing ? (
            <span className="icon-animation spin qtr-margin-left" />
          ) : null}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

ConfirmationModal.propTypes = {
  isOpen: PropTypes.bool,
  confirmHandle: PropTypes.func.isRequired,
  closeHandle: PropTypes.func.isRequired,
  prompt: PropTypes.any.isRequired,
  confirmType: PropTypes.string,
  confirmText: PropTypes.string,
  autoClose: PropTypes.bool,
};

ConfirmationModal.defaultProps = {
  confirmType: "primary",
  autoClose: true,
};

export const PromptModal = ({
  title,
  question,
  onSave: cb,
  onClose,
  initial,
  type,
  isOpen,
  hint,
}) => {
  const [val, setVal] = React.useState(initial);
  const onSave = React.useCallback(() => {
    onClose();
    cb(val);
  }, [onClose, cb, val]);

  React.useLayoutEffect(() => setVal(initial), [initial]);

  return (
    <Modal isOpen={isOpen} closeIcon closeHandle={onClose} title={title}>
      <ModalBody>
        <Input
          type={type}
          form={{ errors: {}, touched: {} }}
          field={{
            onChange: (e) => setVal(e.target.value),
            name: "promptInput",
            value: val,
          }}
          label={
            <>
              {question}
              <DisplayIf condition={!!hint && typeof hint === "string"}>
                <span
                  data-balloon={hint}
                  data-balloon-length="large"
                  data-balloon-pos="up"
                >
                  <span
                    className="icon-question-circle qtr-margin-left"
                    style={{ cursor: "help" }}
                  />
                </span>
              </DisplayIf>
            </>
          }
        />
      </ModalBody>
      <ModalFooter>
        <Button color="white" onClick={onClose}>
          Close
        </Button>
        <Button color="primary" onClick={onSave}>
          OK
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export const DynamicModal = () => {
  const [modal, setModal] = React.useState(null);
  const [modalShown, setModalShown] = React.useState(false);

  React.useEffect(() => {
    eventManager.on(EVENTS.SHOW_MODAL, (m) => setModal(m));
  }, []);
  React.useEffect(() => {
    if (modal) setModalShown(true);
  }, [modal]);

  const onClose = React.useCallback(() => setModalShown(false), []);

  if (!modal) return null;

  if (modal.modalType === "notification")
    return (
      <Modal
        isOpen={modalShown}
        closeIcon
        closeHandle={onClose}
        title={modal.title}
      >
        <ModalBody>{modal.body}</ModalBody>
        <ModalFooter>
          <Button color={modal.buttonColor || "white"} onClick={onClose}>
            {modal.button}
          </Button>
        </ModalFooter>
      </Modal>
    );

  if (modal.modalType === "prompt")
    return (
      <PromptModal
        isOpen={modalShown}
        onClose={onClose}
        onSave={modal.cb}
        title={modal.title}
        question={modal.question}
        initial={modal.initial}
        type={modal.type}
        hint={modal.hint}
      />
    );

  if (modal.modalType === "confirmation")
    return (
      <ConfirmationModal
        isOpen={modalShown}
        prompt={modal.prompt}
        confirmHandle={async () => {
          const r = await modal.onConfirm();
          if (r) onClose();
          return true;
        }}
        closeHandle={onClose}
        confirmText={modal.confirmText}
        confirmType={modal.confirmType}
      />
    );

  return null;
};

export const confirmation = (
  prompt,
  onConfirm,
  confirmType = "primary",
  confirmText = "Confirm"
) => {
  if (!prompt) throw new Error("Prompt must be specified");
  if (!onConfirm || typeof onConfirm !== "function")
    throw new Error("onConfirm must be specified and must be a function");

  eventManager.emit(EVENTS.SHOW_MODAL, {
    modalType: "confirmation",
    prompt,
    onConfirm,
    confirmText,
    confirmType,
  });
};

export const notification = (
  title,
  body,
  buttonColor = "white",
  button = "OK"
) => {
  if (!title || !body) throw new Error("Title and body must be specified");

  eventManager.emit(EVENTS.SHOW_MODAL, {
    modalType: "notification",
    title,
    body,
    buttonColor,
    button,
  });
};

export const prompt = (
  title,
  question,
  cb,
  initial = "",
  type = "text",
  hint = undefined
) => {
  if (!title || !question)
    throw new Error("Title and question must be specified");

  eventManager.emit(EVENTS.SHOW_MODAL, {
    modalType: "prompt",
    title,
    initial,
    type,
    question,
    cb,
    hint,
  });
};

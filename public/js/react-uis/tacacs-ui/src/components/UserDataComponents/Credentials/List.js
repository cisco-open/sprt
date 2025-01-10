import React from "react";
import { Field, getIn, useFormikContext } from "formik";

import { Textarea, Icon, ButtonGroup, Button, toast } from "react-cui-2.0";
import { LoadFromFileButton } from "my-composed/LoadFromFileButton";

import { OptionsContext } from "../../../contexts";

const HowWorks = () => (
  <p className="half-margin-top">
    <span className="text-muted">How it works: </span>
    <span>Credentials will be selected from the list below</span>
  </p>
);

const CredentialsTextarea = () => {
  const options = React.useContext(OptionsContext);
  const { setFieldValue, unregisterField, values } = useFormikContext();
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    setFieldValue(
      "auth.credentials.list",
      getIn(options, "auth.credentials.list", ""),
      false
    );

    return () => {
      setFieldValue("auth.credentials.list", undefined, false);
      unregisterField("auth.credentials.list");
    };
  }, []);

  const creds = React.useMemo(
    () => getIn(values, "auth.credentials.list", ""),
    [values]
  );
  const limitSessions = React.useMemo(
    () => getIn(values, "auth.credentials.limit_sessions", false),
    [values]
  );

  React.useEffect(() => {
    setCount(() => {
      if (!creds) return 0;
      return creds.split(/\r\n|\r|\n/).filter((v) => v.trim().length).length;
    });
  }, [creds, limitSessions]);

  React.useEffect(() => {
    if (limitSessions) setFieldValue("generation.amount", count, false);
  }, [limitSessions, count, setFieldValue]);

  const parseText = (content, removeBad = false) => {
    if (removeBad) {
      const nonEmpty = content
        .split(/\r\n|\r|\n/)
        .filter((v) => v.trim().length && /^\s*[^\s:]+:[^\s:]+\s*$/.test(v))
        .map((v) => v.trim());
      setFieldValue("auth.credentials.list", nonEmpty.join("\n"));
      if (!nonEmpty.length)
        toast(
          "info",
          "No credentials",
          "Didn't find any credentials in a format [username]:[password]"
        );
    } else setFieldValue("auth.credentials.list", content);
  };

  return (
    <div className="flex flex-center-vertical">
      <Field
        component={Textarea}
        name="auth.credentials.list"
        className="half-margin-right flex-fill"
        textareaClass="text-monospace"
        innerDivClass="flex-fill"
        style={{
          overflowX: "hidden",
          overflowWrap: "break-word",
          height: "200px",
        }}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        inline
        validate={(value) => {
          if (typeof value === "undefined") return undefined;
          const nonEmpty = value
            .split(/\r\n|\r|\n/)
            .filter((v) => v.trim().length && /^\s*[^\s:]+:[^\s:]+\s*$/.test(v))
            .map((v) => v.trim());

          if (!nonEmpty.length) return "Credentials should be provided";
          return undefined;
        }}
        label={
          <>
            Credentials
            <br />
            <span className="text-xsmall">
              Format user:password
              <br />
              One record per line
              <br />
              {`Count: ${count}`}
            </span>
          </>
        }
      />
      <ButtonGroup square className="base-margin-top">
        <LoadFromFileButton
          color="link"
          onLoad={(content) => parseText(content, true)}
        />
        <Button
          type="button"
          color="link"
          title="Clear"
          icon
          onClick={() => setFieldValue("auth.credentials.list", "", false)}
        >
          <Icon icon="trash" />
        </Button>
      </ButtonGroup>
    </div>
  );
};

const List = () => (
  <div className="tab animated fadeIn fast active-tab">
    <HowWorks />
    <CredentialsTextarea />
  </div>
);

export default List;

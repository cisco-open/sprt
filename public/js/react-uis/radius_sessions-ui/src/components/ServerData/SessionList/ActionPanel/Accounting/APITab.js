import React from "react";
import { useParams } from "react-router-dom";
import { useFormikContext } from "formik";

import API, { HEADERS } from "my-utils/API";

import { UserContext } from "../../../../../contexts";
import AccountingContext from "./context";

import { prepareValues } from "./functions";
import { actionType } from "./types";

const APITab = () => {
  const { api, token } = React.useContext(UserContext);
  const { toUpdate, action } = React.useContext(AccountingContext);
  const { server, bulk } = useParams();
  const { values } = useFormikContext();

  const link = React.useMemo(() => {
    switch (action) {
      case actionType.update:
        return `${window.location.origin}${globals.rest.sessions}server/${server}/bulk/${bulk}/update/`;
      case actionType.drop:
        return `${window.location.origin}${globals.rest.sessions}server/${server}/bulk/${bulk}/drop/`;
      default:
        return "";
    }
  }, [action, bulk, server]);

  if (!api) return null;

  return (
    <API
      method="patch"
      headers={HEADERS.ALL}
      auth={`Bearer ${token}`}
      data={prepareValues(values, server, bulk, toUpdate, action)}
      url={link}
    />
  );
};

export default APITab;

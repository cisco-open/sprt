import React from "react";
import { BrowserRouter, Route, useParams, useHistory } from "react-router-dom";

import { Dropdown } from "react-cui-2.0";

const protos = [
  {
    t: "MAB",
    u: "mab",
  },
  {
    t: "PAP/CHAP",
    u: "pap",
  },
  {
    t: "PEAP",
    u: "peap",
  },
  {
    t: "EAP-TLS",
    u: "eap-tls",
  },
];

const DD = () => {
  const { proto } = useParams();
  const history = useHistory();
  const selectedProto = React.useMemo(
    () => (proto ? protos.find((p) => p.u === proto) : protos[0]),
    [proto]
  );
  const setProto = React.useCallback(
    (newProto) => {
      globals.current_base = `${globals.rest.generate}${newProto}/`;
      history.push(
        `/${newProto}/${
          globals && globals.current_tab ? `tab/${globals.current_tab}/` : ""
        }`
      );
    },
    [history]
  );

  React.useEffect(() => {
    changeProto(new Event("click"), selectedProto.u);
  }, [selectedProto]);

  return (
    <Dropdown
      type="link"
      header={selectedProto.t}
      alwaysClose
      className="no-tab"
    >
      {protos.map((p) => (
        <Dropdown.Element
          key={p.u}
          selected={selectedProto.u === p.u}
          data-protocol={p.u}
          onClick={() => setProto(p.u)}
          className="no-tab"
        >
          {p.t}
        </Dropdown.Element>
      ))}
    </Dropdown>
  );
};

export default () => {
  return (
    <div
      style={{ padding: "var(--cui-vertical-tab-padding)" }}
      className="flex"
    >
      <div className="flex-fill">Protocol</div>
      <BrowserRouter basename="/generate">
        <Route path="/:proto?">
          <DD />
        </Route>
      </BrowserRouter>
    </div>
  );
};

import React from "react";

import { Label } from "react-cui-2.0";

export const ServerTab = ({ server, onClick, active }) => {
  return (
    <li
      className={`tab${active && active === server.id ? " active" : ""}`}
      key={server.id}
    >
      <a className="server-link" onClick={onClick}>
        <div
          className="text-left flex-fluid"
          style={{ overflowX: "hidden", textOverflow: "ellipsis" }}
        >
          {server.attributes.friendly_name || server.address}
          <div
            className="text-muted text-small animation-fast animated fadeInDown"
            style={{
              display: active && active === server.id ? null : "none",
            }}
          >
            {server.address}
          </div>
        </div>
        <span className="half-margin-right half-margin-left">
          <Label
            color={
              typeof server.attributes.radius !== "undefined" &&
              !server.attributes.radius
                ? "light"
                : "success"
            }
            bordered={
              typeof server.attributes.radius !== "undefined" &&
              !server.attributes.radius
            }
            size="tiny"
            title={
              typeof server.attributes.radius !== "undefined" &&
              !server.attributes.radius
                ? "RADIUS disabled"
                : "RADIUS enabled"
            }
          >
            R
          </Label>
          <Label
            color={server.attributes.tacacs ? "success" : "light"}
            bordered={!server.attributes.tacacs}
            size="tiny"
            title={
              server.attributes.tacacs ? "TACACS+ enabled" : "TACACS+ disabled"
            }
          >
            T+
          </Label>
        </span>
      </a>
    </li>
  );
};

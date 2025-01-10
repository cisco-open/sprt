import React from "react";
import PropTypes from "prop-types";
import { useAsync } from "react-async";

import { WithBadge, ConditionalWrapper as WrapIf } from "react-cui-2.0";

import { simpleGet } from "my-actions/ui";

const deferGet = async ([from]) => simpleGet({ from });

const Badge = ({ badge, ...props }) => {
  const [display, setDisplay] = React.useState("?");
  const [timer, setTimer] = React.useState(null);

  const loader = useAsync({
    deferFn: deferGet,
    onResolve: (data) => {
      try {
        setDisplay(data.value);
        setTimer((curr) => {
          if (curr) clearTimeout(curr);
          return setTimeout(() => loader.run(badge.from), 5 * 1000);
        });
      } catch (e) {
        console.error(e);
        setDisplay("!");
      }
    },
    onReject: () => {
      setDisplay("!");
    },
  });

  const clearOnBlur = React.useCallback(() => {
    if (timer) clearTimeout(timer);
    setTimer(0);
  }, [timer]);
  const setOnFocus = React.useCallback(() => {
    setTimer(
      (curr) => curr || setTimeout(() => loader.run(badge.from), 5 * 1000)
    );
  }, [timer, badge.from]);

  React.useEffect(() => {
    window.removeEventListener("focus", setOnFocus);
    window.addEventListener("focus", setOnFocus, false);
  }, [setOnFocus]);

  React.useEffect(() => {
    window.removeEventListener("blur", clearOnBlur);
    window.addEventListener("blur", clearOnBlur, false);
  }, [clearOnBlur]);

  React.useEffect(() => {
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  React.useEffect(() => {
    if (typeof badge === "undefined") return;
    if (typeof badge === "object") {
      if (badge.from) loader.run(badge.from);
    } else setDisplay(badge);
  }, [badge]);

  if (typeof badge === "undefined") return null;

  return (
    <WithBadge
      size="small"
      color="info"
      badge={display}
      wrapperClass="header-item"
      style={{ right: "-10%", top: "0" }}
      {...props}
    />
  );
};

Badge.propTypes = {
  badge: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.shape({ from: PropTypes.string }),
  ]),
};

Badge.defaultProps = {
  badge: null,
};

export default ({ badge, children }) => {
  return (
    <WrapIf
      condition={typeof badge !== "undefined"}
      wrapper={<Badge badge={badge} />}
    >
      {children}
    </WrapIf>
  );
};

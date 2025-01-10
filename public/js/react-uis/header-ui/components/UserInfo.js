import React from "react";
import PropTypes from "prop-types";

import {
  Dropdown,
  DisplayIf as If,
  prompt,
  notification,
  Label,
  Button,
  Icon,
} from "react-cui-2.0";

import { login, logout } from "my-actions/user";
import { updateTheme } from "my-actions/ui";

const UserInfo = ({ user }) => {
  const handleLoginLogout = React.useCallback(() => {
    if (!user.loggedIn) {
      prompt(
        "Admi password",
        "Enter admin password",
        async (pass) => {
          try {
            const d = await login(pass);
            if (d.status === "ok") {
              window.location.reload();
            } else {
              notification("Error", d.error || "Couldn't login");
            }
            return true;
          } catch (e) {
            notification(
              "Error",
              <Label.Danger>Oops, something happened.</Label.Danger>,
              "danger"
            );
            return true;
          }
        },
        "",
        "password"
      );
    } else {
      logout();
    }
  }, [user.loggedIn]);

  const [theme, setTheme] = React.useState(
    document.body.dataset.theme || "default"
  );

  const switchTheme = React.useCallback(async () => {
    try {
      const newTheme = theme === "default" ? "dark" : "default";
      await updateTheme(newTheme);
      document.body.dataset.theme = newTheme;
      setTheme(newTheme);
    } catch (e) {
      console.error(e);
    }
  }, [theme]);

  return (
    <Dropdown
      type="link"
      openTo="left"
      header={user.user}
      divClassName="header-item"
      className="flex-nowrap text-nowrap btn--dropdown"
      alwaysClose={false}
    >
      <Dropdown.Element href="mailto:vkumov@cisco.com?Subject=SPRT Feedback">
        Feedback
      </Dropdown.Element>
      <Dropdown.Element
        className="flex half-padding-right"
        onClick={switchTheme}
      >
        <span className="flex-fill">Theme </span>
        <Button
          color={theme === "dark" ? "dark" : "ghost"}
          circle
          size="small"
          className="no-decor"
        >
          <Icon icon="cog" />
        </Button>
      </Dropdown.Element>
      <If condition={user.oneUser}>
        <Dropdown.Divider />
        <Dropdown.Element onClick={handleLoginLogout}>
          {user.loggedIn ? (
            <>
              <span className="icon-sign-out qtr-margin-right" />
              Logout admin
            </>
          ) : (
            <>
              <span className="icon-sign-in qtr-margin-right" />
              Login as admin
            </>
          )}
        </Dropdown.Element>
      </If>
    </Dropdown>
  );
};

UserInfo.propTypes = {
  user: PropTypes.shape({
    user: PropTypes.string,
    oneUser: PropTypes.any,
    loggedIn: PropTypes.any,
  }).isRequired,
};

export default UserInfo;

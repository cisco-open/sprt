import React from "react";
import PropTypes from "prop-types";
import { useAsync } from "react-async";
import ReactModal from "react-modal";

import { UserData } from "my-composed/UserData";
import { getTopMenu, getSubmenu } from "my-actions/ui";
import {
  Dropdown,
  Label,
  ConfirmationListener as DynamicModal,
  DisplayIf as If,
} from "react-cui-2.0";

import Badge from "./Badge";
import UserInfo from "./UserInfo";

ReactModal.setAppElement("body");

const deferGetTopMenu = async (_a, props) => getTopMenu(props);

const MenuGroup = ({ item }) => (
  <Dropdown.Group>
    <Dropdown.GroupHeader header={item.title} />
    {item.children.map((child) => (
      <Dropdown.Element key={child.name} href={child.link}>
        <If condition={!!child.icon}>
          <span className={`${child.icon || ""} qtr-margin-right`} />
        </If>
        {child.title}
      </Dropdown.Element>
    ))}
  </Dropdown.Group>
);

MenuGroup.propTypes = {
  item: PropTypes.shape({ title: PropTypes.string, children: PropTypes.array })
    .isRequired,
};

const deferGetSubmenu = async (_attrs, props) => getSubmenu(props);

const LoadableItem = ({ from, trigger, parent }) => {
  const load = useAsync({ deferFn: deferGetSubmenu, from });
  React.useEffect(() => {
    load.run();
  }, [trigger]);

  if (load.isRejected)
    return <Dropdown.Element>Error occured</Dropdown.Element>;

  if (!load.isFulfilled || !load.data)
    return <Dropdown.Element>Loading...</Dropdown.Element>;

  if (parent === "manipulate") {
    try {
      const { servers } = load.data;
      const grps = Object.keys(servers).filter(
        (key) => Array.isArray(servers[key]) && servers[key].length
      );
      if (!grps.length)
        return <Dropdown.Element>Nothing found</Dropdown.Element>;

      return grps.sort().map((gr) => (
        <Dropdown.Group key={gr}>
          <Dropdown.GroupHeader
            header={gr === "radius" ? "RADIUS" : "TACACS+"}
          />
          {servers[gr].map((server) => (
            <Dropdown.Element
              key={server.friendly_name}
              className="flex flex-nowrap half-padding-right flex-middle"
              href={`${globals.rest.sessions}server/${gr}/${server.server}/`}
            >
              <span className="flex-fill half-margin-right">{`${server.friendly_name} (${server.server})`}</span>
              <Label size="tiny" color="light">
                {server.sessionscount}
              </Label>
            </Dropdown.Element>
          ))}
        </Dropdown.Group>
      ));
    } catch (e) {
      console.error(e);
      return <Dropdown.Element>Error occured</Dropdown.Element>;
    }
  }
  return <Dropdown.Element>Nothing found</Dropdown.Element>;
};

LoadableItem.propTypes = {
  from: PropTypes.string.isRequired,
  trigger: PropTypes.bool.isRequired,
  parent: PropTypes.string.isRequired,
};

const MenuItem = ({ item }) => {
  const [trigger, setTrigger] = React.useState(false);
  const switchTrigger = React.useCallback(
    () => setTrigger((curr) => !curr),
    []
  );

  if (item.children) {
    return (
      <Dropdown
        type="link"
        openTo="left"
        header={item.title}
        divClassName="header-item"
        className="flex-nowrap btn--dropdown"
        alwaysClose
        onOpen={switchTrigger}
      >
        {item.children.map((child, idx) =>
          child.load ? (
            <LoadableItem
              key={idx}
              from={child.load}
              trigger={trigger}
              parent={item.name}
            />
          ) : child.children ? (
            <MenuGroup key={child.name} item={child} />
          ) : (
            <Dropdown.Element key={child.name} href={child.link}>
              <If condition={!!child.icon}>
                <span className={`${child.icon || ""} qtr-margin-right`} />
              </If>
              {child.title}
            </Dropdown.Element>
          )
        )}
      </Dropdown>
    );
  }

  if (item.name === "user") return <UserInfo user={item.data} />;

  return (
    <Badge badge={item.badge}>
      <a
        href={item.link}
        className="header-item"
        style={{ whiteSpace: "nowrap" }}
      >
        {item.title}
      </a>
    </Badge>
  );
};

MenuItem.propTypes = {
  item: PropTypes.shape({
    children: PropTypes.array,
    title: PropTypes.string,
    name: PropTypes.string,
    link: PropTypes.string,
    badge: PropTypes.any,
    data: PropTypes.any,
  }).isRequired,
};

const Menu = ({ state }) => {
  if (!window.appMenu)
    if (!state.isFulfilled || !state.data || !state.data.menu) return null;

  const { menu } = window.appMenu || state.data;
  const user = window.userData;
  if (user) menu.push({ title: user.user, name: "user", data: user });

  return menu.map((item) => <MenuItem item={item} key={item.name} />);
};

export default () => {
  const loading = useAsync({ deferFn: deferGetTopMenu });

  React.useLayoutEffect(() => {
    if (!window.appMenu) loading.run();
  }, []);

  return (
    <UserData>
      <Menu state={loading} />
      <DynamicModal />
    </UserData>
  );
};

import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import {
  LuLayoutDashboard,
  LuMap,
  LuSettings,
  LuUser,
  LuShield,
} from "react-icons/lu";

export default function SidebarMenu({ dark, collapsed, toggled, setToggled }) {
  const { pathname } = useLocation();

  useEffect(() => {
    if (toggled) setToggled(false);
  }, [pathname]);

  return (
    <Sidebar
      className="pro-sidebar"
      collapsed={collapsed}
      toggled={toggled}
      onBackdropClick={() => setToggled(false)}
      breakPoint="lg"
      width="260px"
      backgroundColor={dark ? "#1b2440" : "#ffffff"}
      rootStyles={{
        borderRight: `1px solid ${dark ? "#1b2440" : "#e9ecf1"}`,
        height: "100vh",
      }}
    >
      <div className="sidebar-header">
        <h2>Agro Map</h2>
      </div>

      <Menu>
        <MenuItem
          active={pathname === "/dashboard"}
          component={<Link to="/dashboard" />}
          icon={
            <span className="menu-icon">
              <LuLayoutDashboard size={18} />
            </span>
          }
        >
          <span className="menu-text">Dashboard</span>
        </MenuItem>

        <MenuItem
          active={pathname === "/map"}
          component={<Link to="/map" />}
          icon={
            <span className="menu-icon">
              <LuMap size={18} />
            </span>
          }
        >
          <span className="menu-text">
            Map <span className="badge">New</span>
          </span>
        </MenuItem>

        <SubMenu
          label="Settings"
          icon={
            <span className="menu-icon">
              <LuSettings size={18} />
            </span>
          }
        >
          <MenuItem
            icon={
              <span className="menu-icon">
                <LuUser size={18} />
              </span>
            }
          >
            <span className="menu-text">Profile</span>
          </MenuItem>
          <MenuItem
            icon={
              <span className="menu-icon">
                <LuShield size={18} />
              </span>
            }
          >
            <span className="menu-text">Security</span>
          </MenuItem>
        </SubMenu>
        <MenuItem
          active={pathname === "/orgs-table"}
          component={<Link to="/orgs-table" />}
        >
          Tashkilotlar
        </MenuItem>
      </Menu>
    </Sidebar>
  );
}

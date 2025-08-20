import { useEffect } from "react";
import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import { Link, useLocation } from "react-router-dom";
import {
  LuLayoutDashboard,
  LuMap,
  LuSettings,
  LuUser,
  LuShield,
  LuNetwork,
  LuLeaf,
} from "react-icons/lu";
import { useAuth } from "../hooks/useAuth";
import styles from "./SidebarMenu.module.scss";

/**
 * Props:
 * - dark: boolean            // faqat vizual state uchun (body.class bilan ham ishlayveradi)
 * - collapsed: boolean
 * - toggled: boolean
 * - setToggled: (bool)=>void
 */
export default function SidebarMenu({ dark, collapsed, toggled, setToggled }) {
  const { pathname } = useLocation();
  const { isAdmin } = useAuth();

  // Path o‘zgarsa mobile panelni yopamiz
  useEffect(() => {
    if (toggled) setToggled(false);
  }, [pathname, toggled, setToggled]);

  // Active helper
  const isActive = (to, exact = true) =>
    exact ? pathname === to : pathname.startsWith(to);

  // react-pro-sidebar v2: itemlar uchun custom ranglar
  const menuItemStyles = {
    button: ({ active }) => ({
      color: "var(--sb-fg)",
      backgroundColor: active ? "var(--sb-active-bg)" : "transparent",
      borderRadius: "10px",
      padding: "10px 12px",
      margin: "4px 6px",
    }),
    icon: ({ active }) => ({
      color: active ? "var(--sb-accent)" : "var(--sb-muted)",
      marginInline: "8px",
      minWidth: "18px",
    }),
    label: () => ({
      color: "var(--sb-fg)",
      fontWeight: 500,
    }),
    subMenuContent: () => ({
      padding: "6px 4px 8px 12px",
    }),
  };

  return (
    <div
      className={`${styles.wrapper} ${dark ? styles.dark : ""}`}
      data-theme={dark ? "dark" : "light"}
    >
      <Sidebar
        collapsed={collapsed}
        toggled={toggled}
        onBackdropClick={() => setToggled(false)}
        breakPoint="lg"
        width="260px"
        backgroundColor="var(--sb-bg)"
        rootStyles={{
          color: "var(--sb-fg)",
          borderRight: "1px solid var(--sb-border)",
          height: "100vh",
        }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.brand}>
            <LuLeaf size={18} className={styles.brandIcon} />
            {!collapsed && <span className={styles.brandText}>Agro Map</span>}
          </div>
        </div>

        {/* Menu */}
        <Menu menuItemStyles={menuItemStyles}>
          <MenuItem
            active={isActive("/dashboard")}
            component={<Link to="/dashboard" />}
            icon={<LuLayoutDashboard size={18} />}
          >
            <span className={styles.text}>Dashboard</span>
          </MenuItem>

          <MenuItem
            active={isActive("/map")}
            component={<Link to="/map" />}
            icon={<LuMap size={18} />}
          >
            <span className={styles.text}>
              Map {!collapsed && <span className={styles.badge}>New</span>}
            </span>
          </MenuItem>

          {isAdmin && (
            <MenuItem
              active={isActive("/orgs-table", false)}
              component={<Link to="/orgs-table" />}
              icon={<LuNetwork size={18} />}
            >
              <span className={styles.text}>Tashkilotlar</span>
            </MenuItem>
          )}

          <SubMenu
            label={<span className={styles.text}>Settings</span>}
            icon={<LuSettings size={18} />}
          >
            <MenuItem icon={<LuUser size={18} />}>
              <span className={styles.text}>Profile</span>
            </MenuItem>
            <MenuItem icon={<LuShield size={18} />}>
              <span className={styles.text}>Security</span>
            </MenuItem>
          </SubMenu>
        </Menu>
      </Sidebar>
    </div>
  );
}

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
  LuMonitorSmartphone,
  LuListChecks,
  LuUsers,
} from "react-icons/lu";
import { useAuth } from "../hooks/useAuth";
import styles from "./SidebarMenu.module.scss";
import appLogo from "../assets/zamin-logo.png";

export default function SidebarMenu({ dark, collapsed, toggled, setToggled }) {
  const { pathname } = useLocation();
  const { isAdmin /*, isAuthed*/ } = useAuth();

  useEffect(() => {
    if (toggled) setToggled(false);
  }, [pathname, toggled, setToggled]);

  const isActive = (to, exact = true) =>
    exact ? pathname === to : pathname.startsWith(to);

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
    label: () => ({ color: "var(--sb-fg)", fontWeight: 500 }),
    subMenuContent: () => ({
      padding: "6px 4px 8px 12px",
      backgroundColor: "var(--sb-bg)",
      border: "1px solid var(--sb-border)",
      borderRadius: "12px",
      margin: "0 8px 8px 8px",
      boxShadow: "0 6px 16px rgba(0,0,0,.08)",
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
          "--ps-menu-bg": "var(--sb-bg)",
          "--ps-menu-color": "var(--sb-fg)",
          "--ps-menu-active-bg": "var(--sb-active-bg)",
          "--ps-menu-item-default-color": "var(--sb-fg)",
          "--ps-menu-item-hover-bg": "var(--sb-hover-bg)",
          "--ps-menu-item-active-bg": "var(--sb-active-bg)",
        }}
      >
        <div className={styles.header}>
          <div className={styles.brand} title="Zamin">
            <img className={styles.brandLogo} src={appLogo} alt="Zamin logo" />
            {!collapsed && <span className={styles.brandText}>Zamin</span>}
          </div>
        </div>

        <Menu menuItemStyles={menuItemStyles}>
          <MenuItem
            active={isActive("/dashboard")}
            component={<Link to="/dashboard" />}
            icon={<LuLayoutDashboard size={18} />}
          >
            <span className={styles.text}>Boshqaruv paneli</span>
          </MenuItem>

          <MenuItem
            active={isActive("/map")}
            component={<Link to="/map" />}
            icon={<LuMap size={18} />}
          >
            <span className={styles.text}>
              Xarita {!collapsed && <span className={styles.badge}>Yangi</span>}
            </span>
          </MenuItem>

          {/* Tashkilotlar: faqat ADMIN */}
          {isAdmin && (
            <MenuItem
              active={isActive("/orgs-table", false)}
              component={<Link to="/orgs-table" />}
              icon={<LuNetwork size={18} />}
            >
              <span className={styles.text}>Tashkilotlar</span>
            </MenuItem>
          )}

          {isAdmin && (
            <SubMenu
              label={<span className={styles.text}>Boshqaruv</span>}
              icon={<LuShield size={18} />}
              defaultOpen={isActive("/admin")}
            >
              <MenuItem
                icon={<LuMonitorSmartphone size={18} />}
                component={<Link to="/admin/sessions" />}
                active={isActive("/admin/sessions")}
              >
                <span className={styles.text}>Sessiyalar</span>
              </MenuItem>
              <MenuItem
                icon={<LuListChecks size={18} />}
                component={<Link to="/admin/audit" />}
                active={isActive("/admin/audit")}
              >
                <span className={styles.text}>Audit jurnali</span>
              </MenuItem>
              <MenuItem
                icon={<LuUsers size={18} />}
                component={<Link to="/admin/users" />}
                active={isActive("/admin/users")}
              >
                <span className={styles.text}>Foydalanuvchilar</span>
              </MenuItem>
            </SubMenu>
          )}

          {/* Inshootlar: hamma uchun ochiq */}
          <SubMenu
            defaultOpen={isActive("/facilities", false)}
            label={<span className={styles.text}>Inshootlar</span>}
            icon={"🏭"}
          >
            <MenuItem
              active={isActive("/facilities/greenhouse")}
              component={<Link to="/facilities/greenhouse" />}
              icon={"🌿"}
            >
              <span className={styles.text}>Issiqxona</span>
            </MenuItem>

            <MenuItem
              active={isActive("/facilities/poultry-meat")}
              component={<Link to="/facilities/poultry-meat" />}
              icon={"🍗"}
            >
              <span className={styles.text}>Tovuqxona (go‘sht)</span>
            </MenuItem>
            <MenuItem
              active={isActive("/facilities/poultry-egg")}
              component={<Link to="/facilities/poultry-egg" />}
              icon={"🥚"}
            >
              <span className={styles.text}>Tovuqxona (tuxum)</span>
            </MenuItem>

            <MenuItem
              active={isActive("/facilities/turkey")}
              component={<Link to="/facilities/turkey" />}
              icon={"🦃"}
            >
              <span className={styles.text}>Kurkaxona</span>
            </MenuItem>
            <MenuItem
              active={isActive("/facilities/cowshed")}
              component={<Link to="/facilities/cowshed" />}
              icon={"🐄"}
            >
              <span className={styles.text}>Molxona</span>
            </MenuItem>
            <MenuItem
              active={isActive("/facilities/sheepfold")}
              component={<Link to="/facilities/sheepfold" />}
              icon={"🐑"}
            >
              <span className={styles.text}>Qo‘yxona</span>
            </MenuItem>

            <MenuItem
              active={isActive("/facilities/workshops-sausage")}
              component={<Link to="/facilities/workshops-sausage" />}
              icon={"🥓"}
            >
              <span className={styles.text}>Sex (kolbasa)</span>
            </MenuItem>
            <MenuItem
              active={isActive("/facilities/workshops-cookie")}
              component={<Link to="/facilities/workshops-cookie" />}
              icon={"🍪"}
            >
              <span className={styles.text}>Sex (pechenye)</span>
            </MenuItem>

            <MenuItem
              active={isActive("/facilities/aux-lands")}
              component={<Link to="/facilities/aux-lands" />}
              icon={"🌾"}
            >
              <span className={styles.text}>Yordamchi xo‘jalik yerlar</span>
            </MenuItem>
            <MenuItem
              active={isActive("/facilities/border-lands")}
              component={<Link to="/facilities/border-lands" />}
              icon={"🧭"}
            >
              <span className={styles.text}>Chegara oldi yerlar</span>
            </MenuItem>
            <MenuItem
              active={isActive("/facilities/fish-ponds")}
              component={<Link to="/facilities/fish-ponds" />}
              icon={"🐟"}
            >
              <span className={styles.text}>Baliqchilik ko‘llari</span>
            </MenuItem>
          </SubMenu>

          <SubMenu
            label={<span className={styles.text}>Sozlamalar</span>}
            icon={<LuSettings size={18} />}
          >
            <MenuItem icon={<LuUser size={18} />}>
              <span className={styles.text}>Profil</span>
            </MenuItem>
            <MenuItem icon={<LuShield size={18} />}>
              <span className={styles.text}>Xavfsizlik</span>
            </MenuItem>
          </SubMenu>
        </Menu>
      </Sidebar>
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  LuLayoutDashboard,
  LuListChecks,
  LuMap,
  LuMonitorSmartphone,
  LuNetwork,
  LuPackage,
  LuExternalLink,
  LuSettings,
  LuShield,
  LuUser,
  LuUsers,
} from "react-icons/lu";
import { Menu, MenuItem, Sidebar, SubMenu } from "react-pro-sidebar";
import { Link, useLocation } from "react-router-dom";
import appLogo from "../assets/zamin-logo.png";
import { useAuth } from "../hooks/useAuth";
import styles from "./SidebarMenu.module.scss";
import { useFacilityTypes } from "../hooks/useFacilityTypes";

export default function SidebarMenu({
  dark,
  collapsed,
  toggled,
  setToggled,
  width = "320px",
}) {
  const { pathname } = useLocation();
  const { isAdmin /*, isAuthed*/ } = useAuth();
  const { types, slugFor, label, emoji } = useFacilityTypes();

  // Control "Inshootlar" submenu open state to avoid any auto-toggle quirks
  const [facilitiesOpen, setFacilitiesOpen] = useState(
    pathname.startsWith("/facilities")
  );

  useEffect(() => {
    if (toggled) setToggled(false);
  }, [pathname, toggled, setToggled]);

  // Keep facilities submenu open when user navigates within /facilities
  useEffect(() => {
    if (pathname.startsWith("/facilities")) {
      setFacilitiesOpen(true);
    }
  }, [pathname]);

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

  // Temporary: hide Settings submenu
  const SHOW_SETTINGS = false;

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
        width={width}
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

          {/* Bo'linmalar: faqat ADMIN */}
          {isAdmin && (
            <MenuItem
              active={isActive("/orgs-table", false)}
              component={<Link to="/orgs-table" />}
              icon={<LuNetwork size={18} />}
            >
              <span className={styles.text}>Bo'linmalar</span>
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
                icon={<LuMonitorSmartphone size={18} />}
                component={<Link to="/admin/online-users" />}
                active={isActive("/admin/online-users")}
              >
                <span className={styles.text}>Onlayn foydalanuvchilar</span>
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
              <MenuItem
                icon={<LuPackage size={18} />}
                component={<Link to="/admin/facility-types" />}
                active={isActive("/admin/facility-types")}
              >
                <span className={styles.text}>Inshoot turlari</span>
              </MenuItem>
            </SubMenu>
          )}

          {/* Inshootlar: dinamik */}
          <SubMenu
            open={facilitiesOpen}
            onOpenChange={setFacilitiesOpen}
            label={<span className={styles.text}>Inshootlar</span>}
            icon={<LuPackage size={18} />}
          >
            {(types?.length ? types : [])
              .slice()
              .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
              .map((t) => {
                const slug = slugFor(t.code);
                const to = `/facilities/${slug}`;
                const name = label(t.code);
                const em = t.iconEmoji || emoji(t.code);
                return (
                  <MenuItem
                    key={t.code}
                    active={isActive(to)}
                    component={<Link to={to} />}
                    icon={em || "📍"}
                  >
                    <span className={styles.text}>{name}</span>
                  </MenuItem>
                );
              })}
          </SubMenu>

          {/* External link to C4 system */}
          <MenuItem
            icon={<LuExternalLink size={18} />}
            component={
              <a
                href="http://c4.uz"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <span className={styles.text}>C4 tizimi</span>
          </MenuItem>

          {SHOW_SETTINGS && (
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
          )}
        </Menu>
      </Sidebar>
    </div>
  );
}

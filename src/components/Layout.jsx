import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearAdminCode } from "../api";

const links = [
  ["/", "Overview"],
  ["/clients", "Clients"],
  ["/sessions", "Sessions"],
  ["/payments", "Payments"],
  ["/comments", "Comments"],
  ["/notes", "Admin notes"],
  ["/therapists", "Therapists"]
];

const accounts = [
  ["/accounts/extra", "Extra account"],
  ["/accounts/tech", "Tech account"],
  ["/accounts/main", "Main account"],
  ["/accounts/lunez", "Lunez account"],
  ["/accounts/stake", "Stake account"],
  ["/accounts/sanction", "Sanction account"],
  ["/accounts/client-support", "Client support account"]
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const onAccount = location.pathname.startsWith("/accounts");
  const [accountsOpen, setAccountsOpen] = useState(onAccount);

  useEffect(() => {
    if (onAccount) setAccountsOpen(true);
  }, [onAccount]);

  function signOut() {
    clearAdminCode();
    navigate("/login", { replace: true });
  }

  return (
    <div className="shell">
      <aside>
        <p className="brand">Zura</p>
        <p className="brand-sub">Admin</p>
        <nav>
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              {label}
            </NavLink>
          ))}
          <div className={`menu${accountsOpen ? " open" : ""}`}>
            <button
              type="button"
              className={onAccount ? "active" : ""}
              aria-expanded={accountsOpen}
              onClick={() => setAccountsOpen((open) => !open)}
            >
              Accounts
              <span className="caret">{accountsOpen ? "▾" : "▸"}</span>
            </button>
            {accountsOpen ? (
              <div className="submenu">
                {accounts.map(([to, label]) => (
                  <NavLink key={to} to={to}>
                    {label}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>
        </nav>
        <button className="ghost" type="button" onClick={signOut}>
          Sign out
        </button>
      </aside>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

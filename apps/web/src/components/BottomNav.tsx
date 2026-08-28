import React from "react";
import { Home, Clock } from "react-feather";
import "./bottom-nav.css";

const ITEMS = [
    { href: "/", label: "追加", Icon: Home },
    { href: "/history", label: "履歴", Icon: Clock },
];

export function BottomNav() {
    const path = window.location.pathname;

    return (
        <nav className="bottom-nav">
            {ITEMS.map(({ href, label, Icon }) => {
                const active = path === href;
                return (
                    <a
                        key={href}
                        href={href}
                        className={`bottom-nav__item${active ? " bottom-nav__item--active" : ""}`}
                        aria-current={active ? "page" : undefined}
                    >
                        <Icon size={22} />
                        <span className="bottom-nav__label">{label}</span>
                    </a>
                );
            })}
        </nav>
    );
}

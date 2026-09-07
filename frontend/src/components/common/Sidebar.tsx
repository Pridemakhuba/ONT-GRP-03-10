import React, { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationsApi } from '../../services/api';
import type { Notification } from '../../types';

function NotificationBell() {
    const [count, setCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [notifs, setNotifs] = useState<Notification[]>([]);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadCount();
        const iv = setInterval(loadCount, 30000);
        return () => clearInterval(iv);
    }, []);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    async function loadCount() {
        try { const r = await notificationsApi.getUnread(); setCount(r.data.count); } catch { /* ignore */ }
    }

    async function handleOpen() {
        if (!open) {
            try { const r = await notificationsApi.getAll(); setNotifs(r.data.slice(0, 10)); } catch { /* ignore */ }
        }
        setOpen(o => !o);
    }

    async function markRead(id: number) {
        try {
            await notificationsApi.markRead(id);
            setNotifs(p => p.map(n => n.notificationID === id ? { ...n, isRead: true } : n));
            setCount(p => Math.max(0, p - 1));
        } catch { /* ignore */ }
    }

    async function markAll() {
        try {
            await notificationsApi.markAllRead();
            setNotifs(p => p.map(n => ({ ...n, isRead: true })));
            setCount(0);
        } catch { /* ignore */ }
    }

    function timeAgo(d: string) {
        const s = (Date.now() - new Date(d).getTime()) / 1000;
        if (s < 60) return 'just now';
        if (s < 3600) return `${Math.floor(s / 60)}m ago`;
        if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
        return `${Math.floor(s / 86400)}d ago`;
    }

    return (
        <div className="notif-wrapper" ref={ref}>
            <button className="notif-bell-btn" onClick={handleOpen}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                {count > 0 && <span className="notif-badge">{count > 9 ? '9+' : count}</span>}
            </button>
            {open && (
                <div className="notif-dropdown">
                    <div className="notif-header">
                        <span>Notifications</span>
                        {count > 0 && <button className="btn btn-sm btn-outline-secondary" onClick={markAll}>Mark all read</button>}
                    </div>
                    <div className="notif-list">
                        {notifs.length === 0
                            ? <div className="notif-empty">No notifications</div>
                            : notifs.map(n => (
                                <div key={n.notificationID} className={`notif-item ${!n.isRead ? 'unread' : ''}`} onClick={() => !n.isRead && markRead(n.notificationID)}>
                                    <div className="notif-msg">{n.message}</div>
                                    <div className="notif-time">{timeAgo(n.createdDate)}</div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Unchecks the #sidebar-toggle checkbox that lives in AppShell.
// Needed because React Router navigates without a full page reload,
// so the CSS-only checkbox never resets on its own — without this,
// tapping a nav link on mobile would navigate but leave the drawer open.
function closeMobileDrawer() {
    const toggle = document.getElementById('sidebar-toggle') as HTMLInputElement | null;
    if (toggle && toggle.checked) toggle.checked = false;
}

interface NLProps {
    to: string;
    children: ReactNode;
}

export default function Sidebar() {
    const { user, logout, isStudent, isSupervisor, isEvaluator, isAdmin } = useAuth();
    const navigate = useNavigate();

    async function handleLogout() {
        closeMobileDrawer();
        await logout();
        navigate('/login');
    }

    const initials = user
        ? `${user.fullName?.[0] ?? ''}${user.fullName?.split(' ')[1]?.[0] ?? ''}`.toUpperCase()
        : '?';

    const NL = ({ to, children }: NLProps) => (
        <NavLink
            to={to}
            onClick={closeMobileDrawer}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
            {children}
        </NavLink>
    );

    return (
        <aside className="sidebar">
            {/*
        Drawer header — only visible on mobile (≤768px, see App.css).
        The "X" is a <label> pointing at the #sidebar-toggle checkbox
        that lives in AppShell (a sibling of .sidebar, .mobile-topbar
        and .sidebar-backdrop). Unchecking it — via this label, the
        backdrop, or closeMobileDrawer() above — closes the drawer,
        no extra JS state needed on this component's side.
      */}
            <div className="sidebar-drawer-header">
                <label htmlFor="sidebar-toggle" className="sidebar-close-btn" aria-label="Close menu">✕</label>
            </div>

            <div className="sidebar-logo">
                <div className="school-name">SOIT</div>
                <div className="system-name">Postgraduate Record System</div>
            </div>
            <div className="sidebar-user">
                <div className="user-avatar">{initials}</div>
                <div className="user-info">
                    <div className="user-name">{user?.fullName || user?.username}</div>
                    <div className="user-role">{user?.role}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}><NotificationBell /></div>
            </div>
            <nav className="sidebar-nav">
                {isStudent && (<>
                    <div className="nav-section-label">Student</div>
                    <NL to="/student/dashboard">🏠 Dashboard</NL>
                    <NL to="/student/submit-proposal">📄 Submit Proposal</NL>
                </>)}
                {isSupervisor && !isAdmin && (<>
                    <div className="nav-section-label">Supervisor</div>
                    <NL to="/supervisor/dashboard">🏠 Dashboard</NL>
                    <NL to="/supervisor/students">👥 My Students</NL>
                </>)}
                {(isEvaluator || isSupervisor) && !isAdmin && (<>
                    <div className="nav-section-label">Evaluator</div>
                    <NL to="/evaluator/dashboard">⭐ Evaluations</NL>
                </>)}
                {isAdmin && (<>
                    <div className="nav-section-label">Admin</div>
                    <NL to="/admin/dashboard">⚙️ Dashboard</NL>
                    <NL to="/admin/users">👥 Users</NL>
                    <NL to="/admin/import-ad">📥 Import from AD</NL>
                </>)}
            </nav>
            <div>
                <button className="logout-btn" onClick={handleLogout}>🚪 Sign Out</button>
                <div className="sidebar-footer">Powered by DoIT Development Team<br />AD: {user?.username}</div>
            </div>
        </aside>
    );
}
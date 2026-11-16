import React, { useState, useRef, useEffect } from 'react';
import {
  UserCheck,
  Wrench,
  ChevronDown,
  LogOut,
  LogIn,
  RefreshCw,
  Shield,
  Sparkles,
  Building,
  Mail,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ActiveNavView } from './Sidebar';

interface UserNavDropdownProps {
  onViewChange?: (view: ActiveNavView) => void;
}

export const UserNavDropdown: React.FC<UserNavDropdownProps> = ({ onViewChange }) => {
  const { user, logout, openAuthModal, quickLogin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggleRole = async () => {
    setSwitchingRole(true);
    try {
      if (user?.role === 'ADMIN') {
        await quickLogin('EMPLOYEE');
        if (onViewChange) onViewChange('employee-new');
      } else {
        await quickLogin('ADMIN');
        if (onViewChange) onViewChange('admin-queue');
      }
    } finally {
      setSwitchingRole(false);
      setIsOpen(false);
    }
  };

  const handleOpenAccountModal = () => {
    setIsOpen(false);
    openAuthModal();
  };

  const handleSignOut = () => {
    setIsOpen(false);
    logout();
  };

  if (!user) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={openAuthModal}
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-95 border border-blue-400/30"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Sign In / Register</span>
        </button>
      </div>
    );
  }

  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Top Right Trigger Pill Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`flex items-center space-x-2.5 px-3 py-1.5 rounded-xl border transition-all active:scale-98 ${
          isOpen
            ? 'bg-slate-800 border-blue-500/50 shadow-lg shadow-blue-500/10'
            : 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700 shadow-sm'
        }`}
      >
        {/* Avatar with Status Dot */}
        <div className="relative">
          <div
            className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-xs ${
              isAdmin
                ? 'bg-indigo-950/90 border-indigo-500/50 text-indigo-300'
                : 'bg-blue-950/90 border-blue-500/50 text-blue-300'
            }`}
          >
            {isAdmin ? <Wrench className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
        </div>

        {/* User Info Preview */}
        <div className="text-left hidden sm:block">
          <div className="text-xs font-bold text-slate-100 leading-tight flex items-center space-x-1.5">
            <span className="max-w-[120px] truncate">{user.full_name}</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center space-x-1">
            <span className="truncate max-w-[90px]">{user.department}</span>
            <span>•</span>
            <span
              className={`font-semibold uppercase tracking-wider text-[9px] ${
                isAdmin ? 'text-indigo-400' : 'text-blue-400'
              }`}
            >
              {isAdmin ? 'IT Lead' : 'Employee'}
            </span>
          </div>
        </div>

        {/* Dropdown Chevron */}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-400' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl p-3.5 space-y-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User Profile Header Card */}
          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm ${
                  isAdmin
                    ? 'bg-indigo-950 border-indigo-500/50 text-indigo-300'
                    : 'bg-blue-950 border-blue-500/50 text-blue-300'
                }`}
              >
                {isAdmin ? <Wrench className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">{user.full_name}</div>
                <div className="text-[11px] text-slate-400 truncate flex items-center space-x-1 mt-0.5">
                  <Mail className="w-3 h-3 text-slate-500 flex-shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1 text-slate-400 text-[11px]">
                <Building className="w-3 h-3 text-slate-500" />
                <span>{user.department}</span>
              </div>
              <span
                className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                  isAdmin
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}
              >
                {isAdmin ? 'IT Engineer' : 'Employee'}
              </span>
            </div>
          </div>

          {/* Quick 1-Click Role Switcher */}
          <button
            onClick={handleToggleRole}
            disabled={switchingRole}
            className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 hover:text-white text-xs font-medium border border-slate-700/60 transition-all flex items-center justify-between group active:scale-98 shadow-sm"
          >
            <div className="flex items-center space-x-2">
              <RefreshCw
                className={`w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300 ${
                  switchingRole ? 'animate-spin' : ''
                }`}
              />
              <span>Switch to {isAdmin ? 'Employee' : 'IT Engineer'}</span>
            </div>
            <span className="text-[10px] text-slate-400 group-hover:text-slate-300 font-mono">1-Click</span>
          </button>

          {/* Divider */}
          <div className="border-t border-slate-800/80 my-1" />

          {/* Actions: Switch Account / Sign Out */}
          <div className="space-y-1">
            <button
              onClick={handleOpenAccountModal}
              className="w-full py-2 px-3 rounded-lg hover:bg-slate-800/80 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center space-x-2.5 text-left"
            >
              <LogIn className="w-4 h-4 text-blue-400" />
              <span>Switch Account / Register</span>
            </button>

            <button
              onClick={handleSignOut}
              className="w-full py-2 px-3 rounded-lg hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 text-xs font-medium transition-colors flex items-center space-x-2.5 text-left group"
            >
              <LogOut className="w-4 h-4 text-slate-500 group-hover:text-rose-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Bot,
  ShieldAlert,
  PiggyBank,
  Briefcase,
  Layers,
  Copy,
  Check,
  ExternalLink,
  Flame,
  Coffee,
  Home,
  AlertTriangle,
  Gift,
  Coins,
  Award,
  Sparkles,
  Activity,
  Server,
  Database,
  Power,
  RefreshCw,
  Clock,
  Radio,
  Settings,
  Save,
  CheckCircle2,
  FolderArchive,
  UploadCloud,
  Download,
  Github,
  KeyRound
} from 'lucide-react';

interface BotStatus {
  status: string;
  isConfigured: boolean;
  botTag: string | null;
  botId: string | null;
  guildsCount: number;
  ping: number;
  uptimeMs: number;
  uptimeFormatted: string;
  stoppedByAdmin: boolean;
  reconnectAttempts: number;
  lastError: string | null;
  adminId: string;
  totalUsers: number;
  totalOrders: number;
  botFund: number;
  guilds?: Array<{ id: string; name: string; memberCount: number }>;
}

interface ServerSetupData {
  orderChannelId: string | null;
  customerRoleId: string | null;
  receiveOrderChannelId: string | null;
  staffRoleId: string | null;
  notificationChannelId: string | null;
  roles: {
    role_mod: string | null;
    role_mtt: string | null;
    role_tranh_cu_mod: string | null;
    role_nv: string | null;
    role_nvtt: string | null;
    role_tp: string | null;
    role_ct: string | null;
    role_tk: string | null;
  };
}

export default function App() {
  const [clientId, setClientId] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [inputAdminId, setInputAdminId] = useState('');
  const [setupGuildId, setSetupGuildId] = useState('');
  const [setupData, setSetupData] = useState<ServerSetupData | null>(null);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [savingSetup, setSavingSetup] = useState(false);
  const [setupSaveMsg, setSetupSaveMsg] = useState<string | null>(null);

  // GitHub & Export states
  const [githubRepoUrl, setGithubRepoUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [githubBranch, setGithubBranch] = useState('main');
  const [pushingGithub, setPushingGithub] = useState(false);
  const [githubResult, setGithubResult] = useState<{ success: boolean; message: string } | null>(null);

  const adminId = '1402913586853974156';
  const prefix = '*P';
  const permissionsInt = '534723950672';

  const inviteUrl = clientId.trim()
    ? `https://discord.com/api/oauth2/authorize?client_id=${clientId.trim()}&permissions=${permissionsInt}&scope=bot%20applications.commands`
    : '';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/bot/status');
      if (res.ok) {
        const data = await res.json();
        setBotStatus(data);
      }
    } catch (_) {}
  };

  const fetchSetup = async (targetGuildId?: string) => {
    try {
      setLoadingSetup(true);
      const url = targetGuildId ? `/api/bot/setup?guildId=${encodeURIComponent(targetGuildId)}` : '/api/bot/setup';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.guildId) {
          setSetupGuildId(json.guildId);
        }
        if (json.configs) {
          setSetupData(json.configs);
        }
      }
    } catch (_) {
    } finally {
      setLoadingSetup(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchSetup();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveSetup = async () => {
    if (!setupGuildId.trim()) {
      alert('Vui lòng nhập Server/Guild ID để lưu cấu hình!');
      return;
    }
    if (inputAdminId.trim() !== adminId) {
      alert('❌ Xác thực thất bại! Vui lòng nhập đúng Admin ID của bạn (1402913586853974156) vào ô Xác nhận Admin ID.');
      return;
    }

    setSavingSetup(true);
    setSetupSaveMsg(null);
    try {
      const res = await fetch('/api/bot/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: inputAdminId.trim(),
          guildId: setupGuildId.trim(),
          orderChannelId: setupData?.orderChannelId || '',
          customerRoleId: setupData?.customerRoleId || '',
          receiveOrderChannelId: setupData?.receiveOrderChannelId || '',
          staffRoleId: setupData?.staffRoleId || '',
          notificationChannelId: setupData?.notificationChannelId || '',
          roles: setupData?.roles || {}
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSetupSaveMsg('✅ Đã lưu cấu hình vĩnh viễn vào SQLite database!');
        if (data.configs) {
          setSetupData(data.configs);
        }
      } else {
        alert(data.error || 'Lỗi khi lưu cấu hình');
      }
    } catch (err: any) {
      alert(`Lỗi kết nối: ${err.message}`);
    } finally {
      setSavingSetup(false);
    }
  };

  const handleAdminAction = async (action: 'start' | 'stop' | 'sync') => {
    if (inputAdminId.trim() !== adminId) {
      alert('❌ Xác thực thất bại! Chỉ duy nhất Admin tối cao (ID: 1402913586853974156) mới có quyền điều khiển bot.');
      return;
    }

    setLoadingAction(action);
    setActionMessage(null);

    try {
      const res = await fetch('/api/bot/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminId: inputAdminId.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || 'Thực hiện thành công!');
        fetchStatus();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (err: any) {
      alert(`Lỗi kết nối: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDownloadZip = () => {
    window.location.href = '/api/export/zip';
  };

  const handlePushGithub = async () => {
    if (!githubRepoUrl.trim() || !githubToken.trim()) {
      alert('Vui lòng nhập Link Repository GitHub và Personal Access Token!');
      return;
    }
    setPushingGithub(true);
    setGithubResult(null);
    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: githubRepoUrl.trim(),
          token: githubToken.trim(),
          branch: githubBranch.trim() || 'main'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGithubResult({ success: true, message: data.message });
      } else {
        setGithubResult({ success: false, message: data.error || 'Đẩy lên GitHub thất bại' });
      }
    } catch (err: any) {
      setGithubResult({ success: false, message: `Lỗi kết nối: ${err.message}` });
    } finally {
      setPushingGithub(false);
    }
  };

  return (
    <div id="discord-bot-hub" className="min-h-screen bg-[#0e1015] text-[#dcddde] font-sans antialiased pb-16 selection:bg-[#5865F2] selection:text-white">
      {/* Top Header */}
      <header className="border-b border-[#202225] bg-[#14171d]/90 backdrop-blur sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#5865F2] to-[#ec4899] flex items-center justify-center text-white shadow-lg shadow-[#5865F2]/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">Discord Bot 24/7 Order &amp; Kinh Tế Công Ty</h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30">
                  discord.js v14
                </span>
              </div>
              <p className="text-xs text-[#8e9297]">Hệ thống Order, Công ty, Làm việc 5h, Lì xì, Phát lộc, Điểm danh &amp; Mute</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {botStatus?.status === 'ONLINE' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#43b581]/15 text-[#43b581] border border-[#43b581]/40 shadow-sm shadow-[#43b581]/20">
                <span className="w-2.5 h-2.5 rounded-full bg-[#43b581] animate-pulse"></span>
                ONLINE 24/7 • {botStatus.botTag || 'Đang hoạt động'}
              </span>
            ) : botStatus?.status === 'STOPPED_BY_ADMIN' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#f04747]/15 text-[#f04747] border border-[#f04747]/40">
                <Power className="w-3.5 h-3.5" />
                ĐÃ DỪNG BỞI ADMIN
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#faa61a]/15 text-[#faa61a] border border-[#faa61a]/40">
                <Radio className="w-3.5 h-3.5 animate-spin" />
                {botStatus?.status === 'WAITING_FOR_TOKEN' ? 'CHỜ TOKEN DISCORD' : 'ĐANG TỰ KẾT NỐI...'}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 pt-8 space-y-8">
        {/* 24/7 Guaranteed Status & Persistence Banner */}
        <section className="p-5 rounded-2xl bg-gradient-to-r from-[#181b22] to-[#141a24] border border-[#2b313d] shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#43b581]/20 text-[#43b581]">
                  <Activity className="w-4 h-4" />
                </span>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Trạng Thái Vận Hành 24/7 &amp; Bảo Toàn Tiến Trình
                </h2>
              </div>
              <p className="text-xs text-[#8e9297]">
                Bot được giám sát bởi Supervisor tự động: không tự tắt, tự động kết nối lại khi mất mạng, và lưu tức thì 100% tiến trình vào SQLite.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <div className="px-3 py-1.5 rounded-xl bg-[#0e1015] border border-[#202225] flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#5865F2]" />
                <span className="text-[#8e9297]">Uptime:</span>
                <span className="text-white font-semibold">{botStatus?.uptimeFormatted || 'Đang khởi động'}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-[#0e1015] border border-[#202225] flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-[#43b581]" />
                <span className="text-[#8e9297]">Server:</span>
                <span className="text-white font-semibold">{botStatus?.guildsCount || 0}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-[#0e1015] border border-[#202225] flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-[#faa61a]" />
                <span className="text-[#8e9297]">Cơ sở dữ liệu:</span>
                <span className="text-[#43b581] font-semibold">Tự lưu 15s + Tức thì</span>
              </div>
            </div>
          </div>
        </section>

        {/* Core Specs Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#181b22] border border-[#232730] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8e9297]">Admin Tối Cao Duy Nhất</span>
              <ShieldAlert className="w-5 h-5 text-[#f04747]" />
            </div>
            <div className="mt-3">
              <p className="font-mono text-sm font-bold text-white bg-[#0e1015] px-3 py-1.5 rounded-lg border border-[#202225] flex items-center justify-between">
                <span>{adminId}</span>
                <button
                  onClick={() => copyToClipboard(adminId, 'admin')}
                  className="text-xs text-[#8e9297] hover:text-white"
                  title="Sao chép"
                >
                  {copied === 'admin' ? <Check className="w-4 h-4 text-[#43b581]" /> : <Copy className="w-4 h-4" />}
                </button>
              </p>
              <p className="text-xs text-[#8e9297] mt-1.5">
                Chỉ duy nhất bạn mới được tắt bot (<code>*Ptatbot</code>) hoặc bật lại bot (<code>*Pbatbot</code>).
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#181b22] border border-[#232730] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8e9297]">Quỹ Bot Độc Lập</span>
              <PiggyBank className="w-5 h-5 text-[#ff73fa]" />
            </div>
            <div className="mt-3">
              <p className="text-base font-bold text-white">🐷 Lợn đất của em bé</p>
              <p className="text-xs text-[#8e9297] mt-1">
                Số dư hiện tại: <strong className="text-[#ff73fa]">{botStatus?.botFund?.toLocaleString('vi-VN') || 0} KC</strong>. Lệnh: <code>*Plondatebe</code>
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#181b22] border border-[#232730] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8e9297]">Hệ Thống Thăng Chức</span>
              <Briefcase className="w-5 h-5 text-[#00bcd4]" />
            </div>
            <div className="mt-3">
              <p className="text-base font-bold text-white">NVTT ➔ NV ➔ TP ➔ TK ➔ CT</p>
              <p className="text-xs text-[#8e9297] mt-1">
                Làm việc (cooldown 5h/lần). Đạt 150 ca Chủ tịch đủ điều kiện Tranh cử Mod!
              </p>
            </div>
          </div>
        </section>

        {/* Admin Direct Power Controls (Only User/Admin) */}
        <section className="p-6 rounded-2xl bg-[#181b22] border border-[#2a2d36] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#f04747]" />
                Bảng Điều Khiển Khẩn Cấp Của Admin Tối Cao
              </h2>
              <p className="text-xs text-[#8e9297] mt-0.5">
                Nhập Admin ID của bạn (<code>1402913586853974156</code>) để xác thực quyền tắt/bật bot hoặc dùng trực tiếp trong Discord.
              </p>
            </div>

            {actionMessage && (
              <span className="text-xs px-3 py-1 rounded-lg bg-[#43b581]/15 text-[#43b581] border border-[#43b581]/30">
                {actionMessage}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Xác nhận Admin ID (1402913586853974156)"
              value={inputAdminId}
              onChange={(e) => setInputAdminId(e.target.value)}
              className="sm:col-span-2 bg-[#0e1015] border border-[#202225] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#72767d] focus:outline-none focus:border-[#f04747]"
            />

            <button
              onClick={() => handleAdminAction('start')}
              disabled={loadingAction !== null}
              className="px-4 py-2.5 rounded-xl bg-[#43b581] hover:bg-[#3ba55d] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 shadow-md shadow-[#43b581]/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAction === 'start' ? 'animate-spin' : ''}`} />
              Kích Hoạt / Bật Bot
            </button>

            <button
              onClick={() => handleAdminAction('stop')}
              disabled={loadingAction !== null}
              className="px-4 py-2.5 rounded-xl bg-[#f04747] hover:bg-[#d83c3e] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 shadow-md shadow-[#f04747]/20"
            >
              <Power className="w-3.5 h-3.5" />
              Tạm Dừng Bot (Chỉ Admin)
            </button>
          </div>
        </section>

        {/* Export & GitHub Cloud Deploy Center */}
        <section className="p-6 rounded-2xl bg-[#181b22] border border-[#2a2d36] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#232730] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Github className="w-5 h-5 text-white" />
                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                  Xuất File Lệnh Bot &amp; Tự Động Đẩy Lên GitHub
                </h2>
              </div>
              <p className="text-xs text-[#8e9297] mt-1">
                Tải về toàn bộ mã nguồn bot (.ZIP) hoặc tự động đẩy trực tiếp lên kho lưu trữ GitHub của bạn chỉ với 1 cú click.
              </p>
            </div>

            <button
              onClick={handleDownloadZip}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#5865F2] to-[#7289da] hover:from-[#4752c4] hover:to-[#5865F2] text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-[#5865F2]/25"
            >
              <Download className="w-4 h-4" />
              Tải Toàn Bộ File Bot (.ZIP)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Box 1: Tải File ZIP & Giải Thích Các File */}
            <div className="p-4 rounded-xl bg-[#121419] border border-[#202225] space-y-3">
              <h3 className="text-xs font-bold text-[#faa61a] uppercase tracking-wider flex items-center gap-1.5">
                <FolderArchive className="w-4 h-4" />
                1. Trọn Bộ Mã Nguồn Trong File ZIP
              </h3>
              <p className="text-xs text-[#8e9297]">
                File nén chứa 100% tất cả các file lệnh bot và cấu trúc dự án:
              </p>
              <ul className="text-xs text-[#dcddde] space-y-1.5 font-mono bg-[#0e1015] p-3 rounded-lg border border-[#202225]">
                <li className="flex items-center gap-1.5 text-[#5865F2]">
                  <span>📁 src/bot/commands/</span>
                  <span className="text-[#8e9297] font-sans text-[11px]">(Tất cả lệnh *Phelp, *Pgacha, *Plmvc...)</span>
                </li>
                <li className="flex items-center gap-1.5 text-[#43b581]">
                  <span>📁 src/bot/interactions/</span>
                  <span className="text-[#8e9297] font-sans text-[11px]">(Xử lý nút Gacha, nút nhận đơn, mua nhà...)</span>
                </li>
                <li className="flex items-center gap-1.5 text-[#faa61a]">
                  <span>📁 src/bot/services/</span>
                  <span className="text-[#8e9297] font-sans text-[11px]">(Kinh tế KC, Quỹ lợn đất, Supervisor 24/7)</span>
                </li>
                <li className="flex items-center gap-1.5 text-[#00bcd4]">
                  <span>📄 server.ts, Procfile, package.json</span>
                  <span className="text-[#8e9297] font-sans text-[11px]">(Sẵn sàng host trên Render/VPS)</span>
                </li>
              </ul>
              <button
                onClick={handleDownloadZip}
                className="w-full py-2.5 rounded-lg bg-[#282d38] hover:bg-[#343a46] text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <Download className="w-3.5 h-3.5 text-[#faa61a]" />
                Nhấp Vào Đây Để Tải File ZIP
              </button>
            </div>

            {/* Box 2: Tự Động Đẩy Lên GitHub */}
            <div className="p-4 rounded-xl bg-[#121419] border border-[#202225] space-y-3">
              <h3 className="text-xs font-bold text-[#43b581] uppercase tracking-wider flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4" />
                2. Tự Động Push Code Lên GitHub Của Bạn
              </h3>
              <p className="text-xs text-[#8e9297]">
                Nhập link Repository GitHub và Token, hệ thống sẽ tự động commit và đẩy mã nguồn lên:
              </p>

              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-[#8e9297] block mb-1">
                    Link Repository GitHub:
                  </label>
                  <input
                    type="text"
                    placeholder="https://github.com/username/my-discord-bot.git"
                    value={githubRepoUrl}
                    onChange={(e) => setGithubRepoUrl(e.target.value)}
                    className="w-full bg-[#0e1015] border border-[#202225] rounded-lg px-3 py-2 text-xs text-white placeholder-[#72767d] focus:outline-none focus:border-[#43b581]"
                  />
                </div>

                <div>
                  <div className="text-[11px] text-[#8e9297] flex items-center justify-between mb-1">
                    <span>GitHub Personal Access Token (PAT):</span>
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#5865F2] hover:underline"
                    >
                      Lấy token tại đây ↗
                    </a>
                  </div>
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    className="w-full bg-[#0e1015] border border-[#202225] rounded-lg px-3 py-2 text-xs text-white placeholder-[#72767d] focus:outline-none focus:border-[#43b581]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-1/3">
                    <label className="text-[11px] text-[#8e9297] block mb-1">Nhánh (Branch):</label>
                    <input
                      type="text"
                      value={githubBranch}
                      onChange={(e) => setGithubBranch(e.target.value)}
                      className="w-full bg-[#0e1015] border border-[#202225] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#43b581]"
                    />
                  </div>
                  <div className="w-2/3 pt-4">
                    <button
                      onClick={handlePushGithub}
                      disabled={pushingGithub}
                      className="w-full py-2 rounded-lg bg-[#43b581] hover:bg-[#3ba55d] text-white text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-md shadow-[#43b581]/20"
                    >
                      <UploadCloud className={`w-3.5 h-3.5 ${pushingGithub ? 'animate-bounce' : ''}`} />
                      {pushingGithub ? 'Đang Đẩy Lên GitHub...' : 'Đẩy Code Lên GitHub Ngay'}
                    </button>
                  </div>
                </div>

                {githubResult && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                      githubResult.success
                        ? 'bg-[#43b581]/15 text-[#43b581] border border-[#43b581]/30'
                        : 'bg-[#f04747]/15 text-[#f04747] border border-[#f04747]/30'
                    }`}
                  >
                    {githubResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>{githubResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Server Setup & Configuration Center (Permanent 24/7 Persistence) */}
        <section className="p-6 rounded-2xl bg-[#181b22] border border-[#2a2d36] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#232730] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#5865F2]" />
                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                  Cấu Hình Server &amp; Lệnh Setup (Lưu Vĩnh Viễn 24/7)
                </h2>
              </div>
              <p className="text-xs text-[#8e9297] mt-1">
                Tất cả thiết lập kênh và role được ghi đè trực tiếp vào SQLite database. Bạn có thể cài đặt bằng lệnh Discord hoặc chỉnh sửa tại đây.
              </p>
            </div>

            {setupSaveMsg && (
              <span className="text-xs px-3 py-1.5 rounded-xl bg-[#43b581]/15 text-[#43b581] border border-[#43b581]/30 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {setupSaveMsg}
              </span>
            )}
          </div>

          {/* Server ID Picker */}
          <div className="p-4 rounded-xl bg-[#121419] border border-[#202225] flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="text-xs font-bold text-white whitespace-nowrap">
              Server / Guild ID:
            </div>
            {botStatus?.guilds && botStatus.guilds.length > 0 ? (
              <select
                value={setupGuildId}
                onChange={(e) => {
                  setSetupGuildId(e.target.value);
                  fetchSetup(e.target.value);
                }}
                className="bg-[#0e1015] border border-[#232730] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]"
              >
                {botStatus.guilds.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.id})
                  </option>
                ))}
              </select>
            ) : null}
            <input
              type="text"
              placeholder="Nhập Server ID (ví dụ: 123456789012345678)"
              value={setupGuildId}
              onChange={(e) => setSetupGuildId(e.target.value)}
              className="flex-1 bg-[#0e1015] border border-[#202225] rounded-lg px-3 py-2 text-xs text-white placeholder-[#72767d] focus:outline-none focus:border-[#5865F2]"
            />
            <button
              onClick={() => fetchSetup(setupGuildId.trim())}
              disabled={loadingSetup}
              className="px-3 py-2 rounded-lg bg-[#282d38] hover:bg-[#343a46] text-white text-xs font-medium transition"
            >
              {loadingSetup ? 'Đang tải...' : 'Tải Cấu Hình'}
            </button>
          </div>

          {/* Setup Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Box 1: Order & Nhận Đơn */}
            <div className="p-4 rounded-xl bg-[#121419] border border-[#202225] space-y-3">
              <h3 className="text-xs font-bold text-[#5865F2] uppercase tracking-wider flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5" />
                1. Kênh Order &amp; Tiếp Nhận Đơn Hàng
              </h3>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-[#8e9297] block mb-1">
                    ID Kênh Order (chỉ gõ được *Poder tại đây):
                  </label>
                  <input
                    type="text"
                    placeholder="Channel ID kênh order (hoặc dùng *Podersetup / /odersetup)"
                    value={setupData?.orderChannelId || ''}
                    onChange={(e) =>
                      setSetupData((prev) =>
                        prev ? { ...prev, orderChannelId: e.target.value } : null
                      )
                    }
                    className="w-full bg-[#0e1015] border border-[#202225] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8e9297] block mb-1">
                    ID Role Khách Hàng (được phép dùng lệnh order):
                  </label>
                  <input
                    type="text"
                    placeholder="Role ID khách hàng"
                    value={setupData?.customerRoleId || ''}
                    onChange={(e) =>
                      setSetupData((prev) =>
                        prev ? { ...prev, customerRoleId: e.target.value } : null
                      )
                    }
                    className="w-full bg-[#0e1015] border border-[#202225] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8e9297] block mb-1">
                    ID Kênh Nhận Đơn (nhân viên nhận thông báo đơn mới):
                  </label>
                  <input
                    type="text"
                    placeholder="Channel ID kênh nhận đơn (hoặc dùng *Psetupnhandon)"
                    value={setupData?.receiveOrderChannelId || ''}
                    onChange={(e) =>
                      setSetupData((prev) =>
                        prev ? { ...prev, receiveOrderChannelId: e.target.value } : null
                      )
                    }
                    className="w-full bg-[#0e1015] border border-[#202225] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8e9297] block mb-1">
                    ID Role Nhân Viên Tiếp Nhận Đơn (được quyền duyệt đơn):
                  </label>
                  <input
                    type="text"
                    placeholder="Role ID nhân viên tiếp nhận đơn"
                    value={setupData?.staffRoleId || ''}
                    onChange={(e) =>
                      setSetupData((prev) =>
                        prev ? { ...prev, staffRoleId: e.target.value } : null
                      )
                    }
                    className="w-full bg-[#0e1015] border border-[#202225] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]"
                  />
                </div>
              </div>
            </div>

            {/* Box 2: Kênh Thông Báo & Role Quản Trị */}
            <div className="p-4 rounded-xl bg-[#121419] border border-[#202225] space-y-3">
              <h3 className="text-xs font-bold text-[#faa61a] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                2. Kênh Thông Báo &amp; Role Quản Trị / Tranh Cử
              </h3>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-[#8e9297] block mb-1">
                    ID Kênh Thông Báo Sự Kiện / Bầu Cử / Thăng Chức:
                  </label>
                  <input
                    type="text"
                    placeholder="Channel ID kênh thông báo (hoặc dùng *Psetupthongbao)"
                    value={setupData?.notificationChannelId || ''}
                    onChange={(e) =>
                      setSetupData((prev) =>
                        prev ? { ...prev, notificationChannelId: e.target.value } : null
                      )
                    }
                    className="w-full bg-[#0e1015] border border-[#202225] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#faa61a]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8e9297] block mb-1">
                    ID Role Quản Trị Viên (Mod):
                  </label>
                  <input
                    type="text"
                    placeholder="Role ID Mod (*Psetuprole mod @role)"
                    value={setupData?.roles?.role_mod || ''}
                    onChange={(e) =>
                      setSetupData((prev) =>
                        prev
                          ? { ...prev, roles: { ...prev.roles, role_mod: e.target.value } }
                          : null
                      )
                    }
                    className="w-full bg-[#0e1015] border border-[#202225] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#faa61a]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8e9297] block mb-1">
                    ID Role Mod Thực Tập (MTT):
                  </label>
                  <input
                    type="text"
                    placeholder="Role ID MTT (*Psetuprole mtt @role)"
                    value={setupData?.roles?.role_mtt || ''}
                    onChange={(e) =>
                      setSetupData((prev) =>
                        prev
                          ? { ...prev, roles: { ...prev.roles, role_mtt: e.target.value } }
                          : null
                      )
                    }
                    className="w-full bg-[#0e1015] border border-[#202225] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#faa61a]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8e9297] block mb-1">
                    ID Role Tranh Cử Mod (trao cho Chủ tịch đạt 150 ca):
                  </label>
                  <input
                    type="text"
                    placeholder="Role ID Tranh cử Mod (*Psetuprole tranhcu @role)"
                    value={setupData?.roles?.role_tranh_cu_mod || ''}
                    onChange={(e) =>
                      setSetupData((prev) =>
                        prev
                          ? { ...prev, roles: { ...prev.roles, role_tranh_cu_mod: e.target.value } }
                          : null
                      )
                    }
                    className="w-full bg-[#0e1015] border border-[#202225] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#faa61a]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Box 3: 5 Role Chức Vụ Công Ty */}
          <div className="p-4 rounded-xl bg-[#121419] border border-[#202225] space-y-3">
            <h3 className="text-xs font-bold text-[#00bcd4] uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              3. 5 Role Chức Vụ Công Ty (Tự động cấp khi thăng chức)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-[10px] text-[#8e9297] block mb-1">Chủ Tịch (CT):</label>
                <input
                  type="text"
                  placeholder="Role ID CT (*Psetuprolect)"
                  value={setupData?.roles?.role_ct || ''}
                  onChange={(e) =>
                    setSetupData((prev) =>
                      prev
                        ? { ...prev, roles: { ...prev.roles, role_ct: e.target.value } }
                        : null
                    )
                  }
                  className="w-full bg-[#0e1015] border border-[#202225] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00bcd4]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8e9297] block mb-1">Thư Kí (TK):</label>
                <input
                  type="text"
                  placeholder="Role ID TK (*Psetuproletk)"
                  value={setupData?.roles?.role_tk || ''}
                  onChange={(e) =>
                    setSetupData((prev) =>
                      prev
                        ? { ...prev, roles: { ...prev.roles, role_tk: e.target.value } }
                        : null
                    )
                  }
                  className="w-full bg-[#0e1015] border border-[#202225] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00bcd4]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8e9297] block mb-1">Trưởng Phòng (TP):</label>
                <input
                  type="text"
                  placeholder="Role ID TP (*Psetuproletp)"
                  value={setupData?.roles?.role_tp || ''}
                  onChange={(e) =>
                    setSetupData((prev) =>
                      prev
                        ? { ...prev, roles: { ...prev.roles, role_tp: e.target.value } }
                        : null
                    )
                  }
                  className="w-full bg-[#0e1015] border border-[#202225] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00bcd4]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8e9297] block mb-1">Nhân Viên (NV):</label>
                <input
                  type="text"
                  placeholder="Role ID NV (*Psetuprolenv)"
                  value={setupData?.roles?.role_nv || ''}
                  onChange={(e) =>
                    setSetupData((prev) =>
                      prev
                        ? { ...prev, roles: { ...prev.roles, role_nv: e.target.value } }
                        : null
                    )
                  }
                  className="w-full bg-[#0e1015] border border-[#202225] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00bcd4]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8e9297] block mb-1">NV Thực Tập (NVTT):</label>
                <input
                  type="text"
                  placeholder="Role ID NVTT (*Psetuprolenvtt)"
                  value={setupData?.roles?.role_nvtt || ''}
                  onChange={(e) =>
                    setSetupData((prev) =>
                      prev
                        ? { ...prev, roles: { ...prev.roles, role_nvtt: e.target.value } }
                        : null
                    )
                  }
                  className="w-full bg-[#0e1015] border border-[#202225] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00bcd4]"
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-[#232730]">
            <p className="text-xs text-[#8e9297]">
              Lưu ý: Bạn cũng có thể dùng lệnh Discord <code>*Pchecksetup</code> hoặc <code>/checksetup</code> để xem cấu hình trực quan trong server bất cứ lúc nào.
            </p>
            <button
              onClick={handleSaveSetup}
              disabled={savingSetup}
              className="px-6 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-md shadow-[#5865F2]/25"
            >
              <Save className="w-4 h-4" />
              {savingSetup ? 'Đang lưu vào SQLite...' : 'Lưu Cấu Hình Vào Database'}
            </button>
          </div>
        </section>

        {/* Bot Invite Configuration */}
        <section className="p-6 rounded-2xl bg-[#181b22] border border-[#232730]">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#faa61a]" />
            Tạo Link Mời Bot Vào Server Discord
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <input
              type="text"
              placeholder="Dán Application / Client ID (ví dụ: 123456789012345678)"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="flex-1 bg-[#0e1015] border border-[#202225] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#72767d] focus:outline-none focus:border-[#5865F2]"
            />
            {inviteUrl ? (
              <a
                href={inviteUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-[#5865F2]/25"
              >
                Mời Bot Vào Server
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <button
                disabled
                className="px-5 py-2.5 rounded-xl bg-[#282d38] text-[#72767d] text-sm font-semibold cursor-not-allowed"
              >
                Nhập Client ID để tạo link
              </button>
            )}
          </div>
        </section>

        {/* Command Reference & Workflow */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prefix Commands Table */}
          <div className="p-6 rounded-2xl bg-[#181b22] border border-[#232730]">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-[#5865F2]" />
              Danh Sách Lệnh Thành Viên &amp; Kinh Tế ({prefix})
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#121419] border border-[#202225]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-[#5865F2]">{prefix}help</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#43b581]/10 text-[#43b581]">Mọi người</span>
                </div>
                <p className="text-xs text-[#8e9297] mt-1">
                  Hiển thị menu trợ giúp tổng quan phân 2 mục lớn + nút điều hướng tương tác.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#121419] border border-[#202225]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-[#00bcd4]">{prefix}cty</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#00bcd4]/10 text-[#00bcd4]">Công ty</span>
                </div>
                <p className="text-xs text-[#8e9297] mt-1">
                  Xem danh sách công ty kèm nút bấm <strong>[💼 Xin vào]</strong>. Mỗi người chỉ ở 1 công ty.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#121419] border border-[#202225]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-[#00bcd4]">{prefix}lmvc</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#00bcd4]/10 text-[#00bcd4]">Làm việc</span>
                </div>
                <p className="text-xs text-[#8e9297] mt-1">
                  Đi làm nhận lương ngẫu nhiên (1k-10k kc), cooldown 5s/lần, tích luỹ ca thăng chức.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#121419] border border-[#202225]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-[#00bcd4]">{prefix}checkvc</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#00bcd4]/10 text-[#00bcd4]">Hồ sơ việc</span>
                </div>
                <p className="text-xs text-[#8e9297] mt-1">
                  Xem chức vụ, lương kiếm hôm nay, tổng lương từ làm việc và tiến độ thăng chức.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#121419] border border-[#202225]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-[#faa61a]">{prefix}dd</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#faa61a]/10 text-[#faa61a]">Hằng ngày</span>
                </div>
                <p className="text-xs text-[#8e9297] mt-1">
                  Điểm danh nhận kim cương (1 lần/ngày, reset 00:00).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#121419] border border-[#202225]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-[#faa61a]">{prefix}lixi &lt;số KC&gt;</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#faa61a]/10 text-[#faa61a]">Lì xì</span>
                </div>
                <p className="text-xs text-[#8e9297] mt-1">
                  Lì xì vào kênh chat (tối đa 10M, hỗ trợ viết tắt: 100k, 5m, 1b).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#121419] border border-[#202225]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-[#faa61a]">{prefix}give @user &lt;số KC&gt;</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#faa61a]/10 text-[#faa61a]">Chuyển KC</span>
                </div>
                <p className="text-xs text-[#8e9297] mt-1">
                  Chuyển kim cương trực tiếp từ ví sang ví người chơi khác.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#121419] border border-[#202225]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-[#faa61a]">{prefix}phatloc &lt;số KC&gt;</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#faa61a]/10 text-[#faa61a]">Phát lộc</span>
                </div>
                <p className="text-xs text-[#8e9297] mt-1">
                  Tạo túi phát lộc (tối đa 1M) cho 1 người bấm nút [🎁 Nhận lộc] nhanh nhất.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#121419] border border-[#202225]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-[#FEE75C]">{prefix}gacha</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#FEE75C]/10 text-[#FEE75C]">Gacha</span>
                </div>
                <p className="text-xs text-[#8e9297] mt-1">
                  Mở hòm quay Gacha ảnh ngẫu nhiên với nút [🎰 QUAY NÀO!].
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#121419] border border-[#202225]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-[#ec4899]">*Phs &amp; *Pvi</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#ec4899]/10 text-[#ec4899]">Cá nhân</span>
                </div>
                <p className="text-xs text-[#8e9297] mt-1">
                  <code>*Phs</code>: Hồ sơ tổng quát. <code>*Pvi</code>: Biến động chi tiết số dư ví.
                </p>
              </div>
            </div>
          </div>

          {/* Admin & Security Section */}
          <div className="p-6 rounded-2xl bg-[#181b22] border border-[#232730] flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
                <Coffee className="w-4 h-4 text-[#43b581]" />
                Lệnh Quản Trị Admin, Mod &amp; Bảo Mật
              </h3>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#121419] border border-[#202225]">
                  <div className="font-mono text-sm font-bold text-[#f04747]">{prefix}tatbot / {prefix}batbot</div>
                  <p className="text-xs text-[#8e9297] mt-1">
                    <strong>Chỉ duy nhất Admin tối cao.</strong> Tắt hoặc bật lại Bot. Người khác dùng sẽ bị auto-mute 10 phút!
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#121419] border border-[#202225]">
                  <div className="font-mono text-sm font-bold text-[#faa61a]">{prefix}mute @user &lt;thời gian&gt;</div>
                  <p className="text-xs text-[#8e9297] mt-1">Admin &amp; Mod. Khóa quyền dùng bot: <code>10s</code>, <code>10p</code>, <code>2h</code>, <code>vv</code>.</p>
                </div>

                <div className="p-3 rounded-xl bg-[#121419] border border-[#202225]">
                  <div className="font-mono text-sm font-bold text-[#faa61a]">{prefix}unmute @user</div>
                  <p className="text-xs text-[#8e9297] mt-1">Admin &amp; Mod. Gỡ trạng thái mute bot cho thành viên.</p>
                </div>

                <div className="p-3 rounded-xl bg-[#121419] border border-[#202225]">
                  <div className="font-mono text-sm font-bold text-[#f04747]">{prefix}capkc @user &lt;số kc&gt;</div>
                  <p className="text-xs text-[#8e9297] mt-1">Chỉ Admin. Cấp kim cương trực tiếp vào ví user.</p>
                </div>

                <div className="p-3 rounded-xl bg-[#121419] border border-[#202225]">
                  <div className="font-mono text-sm font-bold text-[#f04747]">{prefix}tochuctranhcumod</div>
                  <p className="text-xs text-[#8e9297] mt-1">Chỉ Admin. Phát động đại hội bầu cử Mod gửi @everyone tại kênh thông báo.</p>
                </div>

                <div className="p-3 rounded-xl bg-[#121419] border border-[#202225]">
                  <div className="font-mono text-sm font-bold text-[#5865F2]">{prefix}Podersetup #kênh @role</div>
                  <p className="text-xs text-[#8e9297] mt-1">Chỉ Admin/Mod. Cài đặt kênh order và role khách hàng (lưu ngay vào database).</p>
                </div>

                <div className="p-3 rounded-xl bg-[#121419] border border-[#202225]">
                  <div className="font-mono text-sm font-bold text-[#5865F2]">{prefix}setupnhandon #kênh @role</div>
                  <p className="text-xs text-[#8e9297] mt-1">Chỉ Admin/Mod. Cài đặt kênh nhận đơn và role nhân viên tiếp nhận đơn.</p>
                </div>

                <div className="p-3 rounded-xl bg-[#121419] border border-[#202225]">
                  <div className="font-mono text-sm font-bold text-[#5865F2]">{prefix}setupthongbao #kênh</div>
                  <p className="text-xs text-[#8e9297] mt-1">Chỉ Admin/Mod. Cài đặt kênh phát thông báo sự kiện, bầu cử và vinh danh.</p>
                </div>

                <div className="p-3 rounded-xl bg-[#121419] border border-[#202225]">
                  <div className="font-mono text-sm font-bold text-[#5865F2]">{prefix}setuprole &lt;key&gt; @role</div>
                  <p className="text-xs text-[#8e9297] mt-1">Chỉ Admin/Mod. Gán role theo chức vụ (mod, mtt, tranhcu, nv, nvtt, tp, ct, tk).</p>
                </div>

                <div className="p-3 rounded-xl bg-[#121419] border border-[#202225]">
                  <div className="font-mono text-sm font-bold text-[#43b581]">{prefix}checksetup</div>
                  <p className="text-xs text-[#8e9297] mt-1">Chỉ Admin/Mod. Kiểm tra toàn bộ cấu hình kênh và role đã lưu trong server.</p>
                </div>
              </div>

              <div className="mt-5 p-4 rounded-xl bg-[#0e1015] border border-[#202225] space-y-2">
                <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Home className="w-4 h-4 text-[#faa61a]" />
                  Quy Tắc Thăng Chức &amp; Tranh Cử Mod
                </div>
                <ol className="text-xs text-[#8e9297] space-y-1.5 list-decimal list-inside">
                  <li>Nhân viên thực tập (NVTT): 20 ca ➔ Thăng cấp Nhân viên (NV).</li>
                  <li>Nhân viên (NV): 40 ca ➔ Thăng cấp Trưởng phòng (TP).</li>
                  <li>Trưởng phòng (TP): 50 ca ➔ Thăng cấp Thư kí (TK).</li>
                  <li>Thư kí (TK): 60 ca ➔ Thăng cấp Chủ tịch (CT).</li>
                  <li>Chủ tịch (CT): 150 ca ➔ Đạt chuẩn Đủ điều kiện Tranh cử Mod!</li>
                  <li>Mỗi lần thăng cấp được thưởng nóng <strong>+100.000 KC</strong> vào ví!</li>
                </ol>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-[#f04747]/10 border border-[#f04747]/20 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#f04747] shrink-0 mt-0.5" />
              <p className="text-xs text-[#f04747]">
                <strong>Bảo Mật Tuyệt Đối:</strong> Mọi tiến trình người chơi đều được lưu tự động. Người không có quyền cố ý gọi lệnh Admin/Mod sẽ bị hệ thống tự động <strong>MUTE BOT 10 PHÚT</strong>!
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

"""Conversational AI IT Copilot for non-technical employees.
Answers questions directly with step-by-step guidance and exact keyboard shortcuts FIRST,
then provides optional automated diagnostics and 1-click tickets as secondary assistance.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.tools.registry import ToolDispatcher
from app.agent.gemini_client import GeminiAgentClient
from app.agent.prompts import COPILOT_SYSTEM_PROMPT

router = APIRouter(prefix="/copilot", tags=["Copilot"])


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str


class CopilotChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Question or problem from employee")
    history: Optional[List[ChatMessage]] = Field(default_factory=list)
    device_id: Optional[str] = "CORP-LAPTOP-042"


class CopilotAction(BaseModel):
    action_type: str = Field(..., description="'diagnose', 'ticket', 'info', or 'shortcut'")
    label: str
    payload: Optional[Dict[str, Any]] = None


class CopilotChatResponse(BaseModel):
    reply: str
    suggested_actions: List[CopilotAction] = []
    quick_diagnosis: Optional[Dict[str, Any]] = None


class QuickDiagnosisResponse(BaseModel):
    device_id: str
    overall_status: str  # 'HEALTHY', 'NEEDS_ATTENTION', 'CRITICAL'
    plain_english_summary: str
    findings: List[str]
    suggested_ticket_description: Optional[str] = None


@router.post("/chat", response_model=CopilotChatResponse)
async def chat_with_copilot(payload: CopilotChatRequest):
    """Answers employee questions directly with step-by-step instructions and keyboard keys FIRST,
    followed by optional diagnostic checks and ticket creation.
    """
    user_msg = payload.message.strip()
    lower_msg = user_msg.lower()
    dev_id = payload.device_id or "CORP-LAPTOP-042"

    # =========================================================================
    # 1. TASK MANAGER, KILL PROCESS, END TASK & FORCE QUIT
    # =========================================================================
    if any(k in lower_msg for k in [
        "task manager", "kill process", "kill the process", "end task", "force quit",
        "kill app", "close app", "frozen", "freeze", "stuck", "not responding",
        "hang", "hangs", "kill", "close frozen"
    ]):
        reply = (
            "### Step-by-Step: How to Open Task Manager and Kill a Stuck Process\n\n"
            "Here is the exact step-by-step guide to force-close any frozen program:\n\n"
            "1. **Press the direct keyboard shortcut:**\n"
            "   👉 Press `Ctrl` + `Shift` + `Esc` at the exact same time.\n"
            "   *(This immediately opens Windows Task Manager directly without going through any extra menus)*.\n\n"
            "2. **Find the stuck application:**\n"
            "   In the Task Manager window, make sure you are on the **Processes** tab. Look under **Apps** for the frozen program (e.g., *Google Chrome*, *Microsoft Excel*, or *Teams*).\n\n"
            "3. **Kill the process:**\n"
            "   Click on the frozen program to highlight it, then click the **End task** button in the top-right corner (or right-click the program and choose **End task**).\n\n"
            "4. **Alternative Method 1 (Mouse Only):**\n"
            "   Right-click the **Windows Start icon** (the four-square Windows logo at the bottom of your screen) and select **Task Manager** from the menu.\n\n"
            "5. **Alternative Method 2 (Emergency Keystrokes):**\n"
            "   Press `Ctrl` + `Alt` + `Delete`, then click **Task Manager** from the blue security screen.\n\n"
            "6. **Advanced Command Prompt Kill (If app still won't close):**\n"
            "   Press `Windows Key` + `R`, type `cmd`, and press `Enter`.\n"
            "   Type: `taskkill /IM processname.exe /F` (for example: `taskkill /IM excel.exe /F`) and press `Enter`.\n\n"
            "---\n"
            "💡 **Next Step:** Once you have closed the app, if your laptop is still running slow or you want to check hardware and network health, you can run a diagnostic check below."
        )
        return CopilotChatResponse(
            reply=reply,
            suggested_actions=[
                CopilotAction(
                    action_type="diagnose",
                    label="🔍 Run Quick Diagnostics on My Laptop",
                    payload={"device_id": dev_id}
                ),
                CopilotAction(
                    action_type="ticket",
                    label="🎫 Create IT Support Ticket for Frozen App",
                    payload={"description": f"Application frozen and not responding on {dev_id}. Need IT support."}
                )
            ]
        )

    # =========================================================================
    # 2. KEYBOARD SHORTCUTS & WINDOWS KEYS
    # =========================================================================
    if any(k in lower_msg for k in ["shortcut", "shortcuts", "keys", "hotkey", "key combination", "key to open", "keys to open"]):
        reply = (
            "### Essential Windows Keyboard Shortcuts Guide\n\n"
            "Here are the most useful Windows keyboard shortcuts for everyday productivity and troubleshooting:\n\n"
            "• **Open Task Manager directly:** `Ctrl` + `Shift` + `Esc`\n"
            "• **Emergency Windows Options / Lock / Sign-out:** `Ctrl` + `Alt` + `Delete`\n"
            "• **Open the Run Command dialog:** `Windows Key` + `R`\n"
            "• **Lock your computer immediately:** `Windows Key` + `L`\n"
            "• **Open File Explorer:** `Windows Key` + `E`\n"
            "• **Switch between open applications:** `Alt` + `Tab`\n"
            "• **Force close the current active window:** `Alt` + `F4`\n"
            "• **Dual Monitor / Project Screen options:** `Windows Key` + `P`\n"
            "• **Quick Settings (Wi-Fi, Volume, Bluetooth):** `Windows Key` + `A`\n"
            "• **Hard refresh a browser page (bypassing cache):** `Ctrl` + `Shift` + `R` or `Ctrl` + `F5`\n\n"
            "---\n"
            "💡 **Next Step:** If you are having a specific issue with an app or network connection, let me know or run a health check below."
        )
        return CopilotChatResponse(
            reply=reply,
            suggested_actions=[
                CopilotAction(
                    action_type="shortcut",
                    label="🛠️ How do I kill a frozen program?",
                    payload={"query": "How do I open Task Manager and end task for a frozen app?"}
                ),
                CopilotAction(
                    action_type="diagnose",
                    label="🔍 Test Laptop Health",
                    payload={"device_id": dev_id}
                )
            ]
        )

    # =========================================================================
    # 3. INTERNET, WI-FI & NETWORK TROUBLESHOOTING
    # =========================================================================
    if any(k in lower_msg for k in ["wifi", "wi-fi", "internet", "website won't load", "no connection", "network", "can't connect", "disconnect"]):
        reply = (
            "### Step-by-Step: How to Fix Wi-Fi and Internet Connection Issues\n\n"
            "Follow these steps in order to restore your network connection:\n\n"
            "1. **Check your Wi-Fi status on the taskbar:**\n"
            "   Look at the bottom-right corner of your screen (near the clock). Click the **Network / Wi-Fi icon** (or press `Windows Key` + `A`).\n\n"
            "2. **Cycle your Wi-Fi adapter off and on:**\n"
            "   Click the **Wi-Fi button** to turn it OFF. Wait 5 seconds, then click it again to turn it ON. Allow it 10 seconds to re-authenticate with the router.\n\n"
            "3. **Forget and reconnect to your network:**\n"
            "   Click `Start` > `Settings` > `Network & internet` > `Wi-Fi` > `Manage known networks`. Find your office or home network, click **Forget**, then reconnect and enter the password.\n\n"
            "4. **Flush your local DNS cache:**\n"
            "   Press `Windows Key` + `R`, type `cmd`, and press `Enter`. Type `ipconfig /flushdns` and press `Enter` to clear corrupt address entries.\n\n"
            "5. **Check Corporate VPN Status:**\n"
            "   If public websites (like Google.com) load normally, but internal company portals fail, your Corporate VPN client is disconnected. Open **Cisco AnyConnect** and click **Connect**.\n\n"
            "---\n"
            "💡 **Next Step:** If you have tried these steps and still cannot connect, click below to run an automated diagnostic test on your network gateway."
        )
        return CopilotChatResponse(
            reply=reply,
            suggested_actions=[
                CopilotAction(
                    action_type="diagnose",
                    label="🔍 Run Full Network Diagnostics",
                    payload={"device_id": dev_id}
                ),
                CopilotAction(
                    action_type="ticket",
                    label="🎫 File Network IT Ticket",
                    payload={"description": f"Network connection failure on {dev_id}. Internet and corporate resources unreachable."}
                )
            ]
        )

    # =========================================================================
    # 4. DNS FLUSH & IP CONFIG COMMANDS
    # =========================================================================
    if any(k in lower_msg for k in ["dns", "flush", "flushdns", "ipconfig", "clear dns", "renew ip"]):
        reply = (
            "### Step-by-Step: How to Flush DNS and Renew IP Address\n\n"
            "Flushing your DNS resolver cache clears outdated or corrupted domain name mappings:\n\n"
            "1. **Open the Run box:**\n"
            "   👉 Press `Windows Key` + `R` on your keyboard.\n\n"
            "2. **Open Command Prompt:**\n"
            "   Type `cmd` in the box and press `Enter` (or press `Ctrl` + `Shift` + `Enter` to run as administrator).\n\n"
            "3. **Flush the DNS cache:**\n"
            "   Type the following command and press `Enter`:\n"
            "   `ipconfig /flushdns`\n"
            "   *(You should see a message: 'Successfully flushed the DNS Resolver Cache')*.\n\n"
            "4. **Renew your IP address:**\n"
            "   Type: `ipconfig /release` and press `Enter`.\n"
            "   Then type: `ipconfig /renew` and press `Enter`.\n\n"
            "---\n"
            "💡 **Next Step:** After flushing your DNS, you can run automated telemetry diagnostics to verify if your device can reach corporate gateways."
        )
        return CopilotChatResponse(
            reply=reply,
            suggested_actions=[
                CopilotAction(
                    action_type="diagnose",
                    label="🔍 Verify DNS & Gateway Telemetry",
                    payload={"device_id": dev_id}
                )
            ]
        )

    # =========================================================================
    # 5. VPN & CISCO ANYCONNECT
    # =========================================================================
    if any(k in lower_msg for k in ["vpn", "anyconnect", "cisco", "tunnel", "gateway"]):
        reply = (
            "### Step-by-Step: How to Connect or Troubleshoot Corporate VPN\n\n"
            "If your Cisco AnyConnect VPN is failing or dropping tunnel connections:\n\n"
            "1. **Open Cisco AnyConnect:**\n"
            "   Click the **Windows Start menu**, type `AnyConnect`, and open **Cisco AnyConnect Secure Mobility Client** (or click the lock icon in the bottom-right taskbar).\n\n"
            "2. **Verify the Gateway Address:**\n"
            "   Ensure the connection box contains the official corporate gateway:\n"
            "   `vpn.corporate.internal` *(or IP `10.0.4.50`)*.\n\n"
            "3. **Authenticate:**\n"
            "   Click **Connect**, enter your corporate domain username and password, and approve the Microsoft Authenticator notification on your phone.\n\n"
            "4. **Fix 'Virtual Adapter Error 502' or Service Hang:**\n"
            "   Press `Windows Key` + `R`, type `services.msc`, and press `Enter`.\n"
            "   Locate **Cisco AnyConnect Secure Mobility Agent**, right-click it, and select **Restart**.\n\n"
            "---\n"
            "💡 **Next Step:** You can run our automated VPN adapter and gateway probe below to isolate any configuration faults."
        )
        return CopilotChatResponse(
            reply=reply,
            suggested_actions=[
                CopilotAction(
                    action_type="diagnose",
                    label="🔍 Probe VPN Adapter & Gateway",
                    payload={"device_id": dev_id}
                ),
                CopilotAction(
                    action_type="ticket",
                    label="🎫 File VPN Support Ticket",
                    payload={"description": f"Corporate VPN connection failure on {dev_id}. Gateway unreachable."}
                )
            ]
        )

    # =========================================================================
    # 6. CLEAR BROWSER CACHE & COOKIES
    # =========================================================================
    if any(k in lower_msg for k in ["cache", "cookies", "clear cache", "browser cache", "hard refresh", "chrome cache"]):
        reply = (
            "### Step-by-Step: How to Clear Browser Cache and Cookies\n\n"
            "Clearing cached browser files fixes outdated web pages, styling errors, and login loops:\n\n"
            "1. **Quick Hard Refresh (Single Tab):**\n"
            "   👉 On the webpage you are viewing, press `Ctrl` + `Shift` + `R` (or `Ctrl` + `F5`).\n"
            "   *(This reloads the page from the server without using saved cache)*.\n\n"
            "2. **Full Browser Cache Clearing (Google Chrome or Microsoft Edge):**\n"
            "   👉 Press `Ctrl` + `Shift` + `Delete` at the same time.\n"
            "   This directly opens the **Clear browsing data** settings dialog.\n\n"
            "3. **Select items to clear:**\n"
            "   - Set the Time Range to **All time**.\n"
            "   - Check **Cached images and files**.\n"
            "   - Check **Cookies and other site data**.\n"
            "   - Click **Clear data**.\n\n"
            "4. **Restart Browser:**\n"
            "   Close all browser windows and reopen them.\n\n"
            "---\n"
            "💡 **Next Step:** If your web application still fails to load, test your network connection below."
        )
        return CopilotChatResponse(
            reply=reply,
            suggested_actions=[
                CopilotAction(
                    action_type="diagnose",
                    label="🔍 Test Web Connection",
                    payload={"device_id": dev_id}
                )
            ]
        )

    # =========================================================================
    # 7. AUDIO, MICROPHONE & WEBCAM (TEAMS / ZOOM)
    # =========================================================================
    if any(k in lower_msg for k in ["mic", "microphone", "sound", "audio", "speaker", "hear", "camera", "webcam", "video call"]):
        reply = (
            "### Step-by-Step: How to Fix Microphone, Audio, or Camera Issues\n\n"
            "If your colleagues cannot hear or see you during calls (Teams, Zoom, or Slack):\n\n"
            "1. **Check the physical hardware mute:**\n"
            "   Check your laptop keyboard for a microphone mute key (often `F4` or `Fn` + `F4`). Check if a red LED light is lit on the key. Check physical switches on headset cables.\n\n"
            "2. **Check Windows Sound Settings:**\n"
            "   Press `Windows Key` + `I` to open **Settings** > `System` > `Sound`.\n"
            "   Under **Input**, make sure your actual microphone (e.g. *Headset Microphone* or *Realtek Audio*) is selected, and speak to see if the volume bar moves.\n\n"
            "3. **Verify Windows Privacy Permissions:**\n"
            "   Go to `Settings` > `Privacy & security` > `Microphone` (and `Camera`). Ensure **Let apps access your microphone** is toggled **ON**.\n\n"
            "4. **In Microsoft Teams / Zoom:**\n"
            "   In Teams, click the three dots `...` next to your profile picture > `Settings` > `Devices` > click **Make a test call** to verify your setup.\n\n"
            "---\n"
            "💡 **Next Step:** If you have an upcoming meeting, you can use our Emergency Fast-Track to page an IT engineer directly."
        )
        return CopilotChatResponse(
            reply=reply,
            suggested_actions=[
                CopilotAction(
                    action_type="diagnose",
                    label="🔍 Run Laptop Health Check",
                    payload={"device_id": dev_id}
                )
            ]
        )

    # =========================================================================
    # 8. DUAL MONITORS & EXTERNAL SCREENS
    # =========================================================================
    if any(k in lower_msg for k in ["monitor", "monitors", "screen", "display", "dual screen", "projector", "hdmi"]):
        reply = (
            "### Step-by-Step: How to Setup or Fix External Monitors\n\n"
            "If your external monitor is black or not extending properly:\n\n"
            "1. **Open the Windows Display Projection Menu:**\n"
            "   👉 Press `Windows Key` + `P` at the same time.\n\n"
            "2. **Choose your display mode:**\n"
            "   - Click **Extend** to use both screens as separate desktops.\n"
            "   - Click **Duplicate** to show the exact same screen on both monitors.\n\n"
            "3. **Reseat the display cable:**\n"
            "   Unplug the HDMI, DisplayPort, or USB-C cable from your laptop. Wait 5 seconds, and plug it back in firmly.\n\n"
            "4. **Force Windows to detect display:**\n"
            "   Go to `Settings` > `System` > `Display`. Scroll down to the **Multiple displays** section and click the **Detect** button.\n\n"
            "---\n"
            "💡 **Next Step:** If the monitor still does not turn on, test your system health or submit a hardware ticket."
        )
        return CopilotChatResponse(
            reply=reply,
            suggested_actions=[
                CopilotAction(
                    action_type="diagnose",
                    label="🔍 Test Laptop Telemetry",
                    payload={"device_id": dev_id}
                ),
                CopilotAction(
                    action_type="ticket",
                    label="🎫 Request External Monitor Support",
                    payload={"description": f"External monitor not detected on {dev_id}. Cables verified."}
                )
            ]
        )

    # =========================================================================
    # 9. LAPTOP RUNNING SLOW, HIGH CPU & LAG
    # =========================================================================
    if any(k in lower_msg for k in ["slow", "sluggish", "lag", "fan", "battery", "freezing", "high cpu", "memory"]):
        reply = (
            "### Step-by-Step: How to Speed Up a Slow Laptop\n\n"
            "Here is how to identify what is slowing down your laptop and fix it:\n\n"
            "1. **Check what is consuming your CPU and Memory:**\n"
            "   👉 Press `Ctrl` + `Shift` + `Esc` to open **Task Manager**.\n"
            "   Click on the **CPU** column header to see which application is using the most power. Click on the **Memory** column to see which app is using the most RAM.\n\n"
            "2. **Close heavy background applications:**\n"
            "   Highlight applications you aren't currently using (like extra browser windows with 20+ tabs, Spotify, or background apps) and click **End task**.\n\n"
            "3. **Clean up temporary files:**\n"
            "   Press `Windows Key` + `R`, type `%temp%`, and press `Enter`. Press `Ctrl` + `A` to select all files, and press `Delete` to remove temporary files.\n\n"
            "4. **Restart your laptop:**\n"
            "   Click `Start` > `Power` > `Restart`. A fresh reboot clears memory leaks and resets background Windows services.\n\n"
            "---\n"
            "💡 **Next Step:** You can run our automated laptop diagnostics below to test your CPU, gateway reachability, and network response time."
        )
        return CopilotChatResponse(
            reply=reply,
            suggested_actions=[
                CopilotAction(
                    action_type="diagnose",
                    label="🔍 Test Laptop Health & Diagnostics",
                    payload={"device_id": dev_id}
                )
            ]
        )

    # =========================================================================
    # 10. URGENT IMMINENT MEETING / DEADLINE
    # =========================================================================
    if any(k in lower_msg for k in ["emergency", "urgent", "meeting in", "presentation in", "starting soon", "deadline", "pitch in"]):
        reply = (
            "### 🚨 Urgent Meeting Emergency Fast-Track Guidance\n\n"
            "If an important meeting or presentation starts within 5 minutes and you are blocked:\n\n"
            "1. **Direct Fast-Track Action:**\n"
            "   Click the **Red Dispatch button** below. This bypasses the normal queue and pages the On-Call IT Engineer (**Sarah Connor**) with Priority **P1 VIP**.\n\n"
            "2. **Quick Backup Steps Right Now:**\n"
            "   - If Wi-Fi dropped: Enable your smartphone's Mobile Hotspot and connect to it.\n"
            "   - If audio/video failed: Join the meeting via the Teams or Zoom mobile app on your phone while your laptop resolves.\n"
            "   - Direct Callback: Our technician will call your callback extension immediately.\n\n"
            "---\n"
            "💡 **Next Step:** Click below to trigger the direct on-call engineer dispatch."
        )
        return CopilotChatResponse(
            reply=reply,
            suggested_actions=[
                CopilotAction(
                    action_type="emergency_ticket",
                    label="🚨 Dispatch Direct On-Call IT Support (Meeting in 5 Mins)",
                    payload={
                        "description": user_msg if len(user_msg) >= 10 else "CRITICAL URGENT: Client presentation / team meeting starting in 5 minutes! Need immediate IT support.",
                        "is_emergency": True,
                        "meeting_time": "In 5 minutes",
                        "emergency_contact": "+1 (555) 019-2834",
                        "emergency_reason": "Imminent critical meeting starting in 5 minutes",
                    }
                ),
                CopilotAction(
                    action_type="diagnose",
                    label="🔍 Quick 3-Second Network Diagnosis",
                    payload={"device_id": dev_id}
                )
            ]
        )

    # =========================================================================
    # 11. STORAGE, DISK & TEMP FILES CLEANUP
    # =========================================================================
    if any(k in lower_msg for k in ["temp", "temp files", "storage", "disk", "free up space", "clean files"]):
        reply = (
            "### Step-by-Step: How to Clean Up Temporary Files & Free Disk Space\n\n"
            "Follow these steps to clean out junk cache and free up drive space:\n\n"
            "1. **Delete Windows Temporary Files:**\n"
            "   👉 Press `Windows Key` + `R`, type `%temp%`, and press `Enter`.\n"
            "   Press `Ctrl` + `A` to highlight all files, and press `Delete` (skip any files currently in use).\n\n"
            "2. **Use Windows Storage Sense:**\n"
            "   Open **Settings** (`Windows Key` + `I`) > `System` > `Storage`.\n"
            "   Click on **Temporary files** and click **Remove files** to safely delete old update logs and recycle bin contents.\n\n"
            "3. **Empty Recycle Bin:**\n"
            "   Right-click the **Recycle Bin** on your desktop and select **Empty Recycle Bin**.\n\n"
            "---\n"
            "💡 **Next Step:** You can run our laptop health test below to check overall device and memory status."
        )
        return CopilotChatResponse(
            reply=reply,
            suggested_actions=[
                CopilotAction(action_type="diagnose", label="🔍 Test Laptop Health", payload={"device_id": dev_id})
            ]
        )

    # =========================================================================
    # 12. GEMINI LLM DYNAMIC RESPONDER (ANSWERS QUESTIONS FIRST!)
    # =========================================================================
    gemini = GeminiAgentClient()
    if gemini._client:
        try:
            from google.genai import types
            prompt = (
                f"{COPILOT_SYSTEM_PROMPT}\n\n"
                f"Employee Device ID: {dev_id}\n"
                f"User Question: {user_msg}\n\n"
                f"STRICT INSTRUCTIONS:\n"
                f"1. You MUST answer the user's specific question FIRST with clear, numbered, step-by-step instructions.\n"
                f"2. Mention exact keyboard shortcuts (using backticks like `Ctrl` + `Shift` + `Esc` or `Windows Key` + `R`).\n"
                f"3. Do NOT defer to diagnostics or suggest running tests until you have fully explained the answer to their question.\n"
                f"4. At the very end, mention that if these steps do not solve the problem, they can optionally run a diagnostic check or submit a ticket."
            )
            response = gemini._client.models.generate_content(
                model=gemini.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.3),
            )
            if response.text and len(response.text.strip()) > 20:
                return CopilotChatResponse(
                    reply=response.text.strip(),
                    suggested_actions=[
                        CopilotAction(action_type="diagnose", label="🔍 Run Automated Diagnostics on My Laptop", payload={"device_id": dev_id}),
                        CopilotAction(action_type="ticket", label="🎫 Submit as Official IT Ticket", payload={"description": user_msg})
                    ]
                )
        except Exception:
            pass

    # =========================================================================
    # 12. GENERAL COMPREHENSIVE STEP-BY-STEP FALLBACK
    # =========================================================================
    reply = (
        f"### Step-by-Step Guide for: \"{user_msg}\"\n\n"
        "Here are the recommended steps to resolve this on your Windows laptop:\n\n"
        "1. **Immediate Check & Shortcut:**\n"
        "   If a window or program is frozen, press `Ctrl` + `Shift` + `Esc` to open **Task Manager**, select the program, and click **End task**.\n\n"
        "2. **Check Windows Settings:**\n"
        "   Press `Windows Key` + `I` to open **Windows Settings**. Check the relevant category (e.g., *System*, *Network & internet*, or *Apps*) to verify configuration.\n\n"
        "3. **Perform a Clean Restart:**\n"
        "   Click `Start` > `Power` > `Restart`. Restarting resets active memory, refreshes system drivers, and resolves most software anomalies.\n\n"
        "4. **Command-Line Network / DNS Refresh (if connection related):**\n"
        "   Press `Windows Key` + `R`, type `cmd`, and press `Enter`. Type `ipconfig /flushdns` to clear network caches.\n\n"
        "---\n"
        "💡 **Next Step:** If following these steps did not resolve your issue, you can run an automated diagnostic probe on your laptop or submit an official ticket below."
    )
    return CopilotChatResponse(
        reply=reply,
        suggested_actions=[
            CopilotAction(action_type="diagnose", label="🔍 Run Quick Diagnostics on My Laptop", payload={"device_id": dev_id}),
            CopilotAction(action_type="ticket", label="🎫 Submit as Official IT Ticket", payload={"description": user_msg})
        ]
    )


@router.post("/diagnose-quick", response_model=QuickDiagnosisResponse)
async def diagnose_quick(device_id: Optional[str] = "CORP-LAPTOP-042"):
    """Runs non-intrusive safe diagnostic probes and converts the raw findings
    into crystal-clear, non-technical plain English explanations.
    """
    dev = device_id or "CORP-LAPTOP-042"
    findings = []
    has_critical_issue = False

    # Probe 1: Ping Gateway
    try:
        ping_res = ToolDispatcher.execute_tool("ping_gateway", {"ip": "10.0.4.1", "device_id": dev})
        loss = ping_res.get("packet_loss_percent", 0)
        if loss > 0:
            findings.append("❌ Office Network Connection: Cannot reach corporate gateway (100% packet loss).")
            has_critical_issue = True
        else:
            findings.append("✅ Office Network Connection: Normal (0% packet loss).")
    except Exception as e:
        findings.append(f"⚠️ Network check warning: {str(e)}")

    # Probe 2: Resolve DNS
    try:
        dns_res = ToolDispatcher.execute_tool("resolve_dns", {"host": "vpn.corporate.internal", "device_id": dev})
        resolved = dns_res.get("resolved_ip")
        expected = dns_res.get("expected_ip")
        if resolved != expected:
            findings.append(f"⚠️ Internal Company Address: Resolving to stale address ({resolved} instead of {expected}).")
            has_critical_issue = True
        else:
            findings.append("✅ Company Domain Resolution: Normal.")
    except Exception as e:
        findings.append(f"⚠️ Domain check warning: {str(e)}")

    # Probe 3: VPN Adapter Status
    try:
        vpn_res = ToolDispatcher.execute_tool("check_vpn_adapter_status", {"device_id": dev})
        state = vpn_res.get("state", "").upper()
        if state != "UP" and state != "CONNECTED":
            findings.append(f"⚠️ Corporate VPN Adapter: Currently {state or 'DISCONNECTED'}.")
            has_critical_issue = True
        else:
            findings.append("✅ Corporate VPN Adapter: Active and connected.")
    except Exception as e:
        findings.append(f"⚠️ Adapter check warning: {str(e)}")

    if has_critical_issue:
        summary = (
            "We detected an issue with your corporate network connection. "
            "Your laptop cannot reach company internal tools right now. "
            "This can be repaired automatically by our IT Agent."
        )
        status = "NEEDS_ATTENTION"
        ticket_desc = (
            "Automated laptop diagnosis detected unreachable corporate gateway and stale DNS record on "
            + dev
            + ". Requesting autonomous remediation."
        )
    else:
        summary = "All checks passed! Your network connection and laptop telemetry are healthy and operating normally."
        status = "HEALTHY"
        ticket_desc = None

    return QuickDiagnosisResponse(
        device_id=dev,
        overall_status=status,
        plain_english_summary=summary,
        findings=findings,
        suggested_ticket_description=ticket_desc,
    )

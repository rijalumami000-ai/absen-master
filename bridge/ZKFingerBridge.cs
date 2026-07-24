using System;
using System.IO;
using System.Drawing;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
using System.Text.RegularExpressions;
using Microsoft.Win32;
using ZKFPEngXControl;

// =============================
// Custom AxHost wrapper to host the ZKFPEngX ActiveX control visually
// =============================
public class AxZKFPEngX : AxHost {
    public AxZKFPEngX() : base("ca69969c-2f27-41d3-954d-a48b941c3ba7") {
    }

    public ZKFPEngX Ocx {
        get { return (ZKFPEngX)this.GetOcx(); }
    }
}

// =============================
// COM IConnectionPoint Interfaces
// =============================
[ComImport, Guid("B196B284-BAB4-101A-B69C-00AA00341D07"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMyConnectionPointContainer {
    void EnumConnectionPoints(out IntPtr ppEnum);
    void FindConnectionPoint([In] ref Guid riid, [MarshalAs(UnmanagedType.Interface)] out IConnectionPoint ppCP);
}

// =============================
// Event Sink — implements IZKFPEngXEvents dispatch interface
// =============================
[ComVisible(true)]
[ClassInterface(ClassInterfaceType.None)]
public class ZKEventSink : IZKFPEngXEvents {
    private BridgeForm form;
    public ZKEventSink(BridgeForm form) { this.form = form; }

    public void OnFingerTouching() {
        form.SafeLog("Jari menyentuh sensor...");
    }
    public void OnCaptureToFile(bool ActionResult) {}
    public void OnFingerLeaving() {
        form.SafeLog("Jari diangkat dari sensor.");
    }
    public void OnFeatureInfo(int AQuality) {
        form.HandleFeatureInfo(AQuality);
    }
    public void OnImageReceived(ref bool AImageValid) {
        form.SafeLog(string.Format("Gambar sidik jari diterima (Valid: {0})", AImageValid));
    }
    public void OnEnroll(bool ActionResult, object ATemplate) {
        form.HandleEnroll(ActionResult, ATemplate);
    }
    public void OnCapture(bool ActionResult, object ATemplate) {
        form.HandleCapture(ActionResult, ATemplate);
    }
    public void OnEnrollToFile(bool ActionResult) {}
}

// =============================
// Main Form — System Tray Application
// =============================
public class BridgeForm : Form {
    private AxZKFPEngX axFp;
    private ZKFPEngX fp;
    private int fpcHandle;
    private int eventCookie;
    private IConnectionPoint connectionPoint;
    private string templateDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "ZKFingerTemplates");
    
    // Server Configuration
    private string serverUrl = "https://absen.alhamidcintamulya.my.id";
    private string configPath;

    // UI Controls
    private Label lblStatus;
    private Label lblSensorInfo;
    private Label lblServerStatus;
    private Button btnVerifyMode;
    private Button btnRegisterMode;
    private Button btnSync;
    private ListBox lstLog;
    private Label lblTemplateCount;
    public bool isRegisterMode = false;
    private System.Windows.Forms.Timer enrollPollTimer;
    private int enrollingSantriId = 0;
    private Label[] pnlProgress = new Label[3];
    private int enrollSamplesCount = 0;

    // System Tray
    private NotifyIcon trayIcon;
    private ContextMenuStrip trayMenu;
    private bool isExiting = false;

    private const string APP_NAME = "ZKFingerBridge";
    private const string STARTUP_REG_KEY = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Run";

    [STAThread]
    public static void Main() {
        // Force TLS 1.2 / TLS 1.1 / TLS 1.0 support for HTTPS requests
        try {
            System.Net.ServicePointManager.SecurityProtocol = 
                System.Net.SecurityProtocolType.Tls12 | 
                System.Net.SecurityProtocolType.Tls11 | 
                System.Net.SecurityProtocolType.Tls;
            System.Net.ServicePointManager.ServerCertificateValidationCallback = (sender, cert, chain, sslPolicyErrors) => true;
        } catch {}

        // Prevent duplicate instances
        bool createdNew;
        using (var mutex = new Mutex(true, "Global\\ZKFingerBridge_SingleInstance", out createdNew)) {
            if (!createdNew) {
                MessageBox.Show("ZKFingerBridge sudah berjalan di system tray.", APP_NAME, MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new BridgeForm());
        }
    }

    public BridgeForm() {
        // Resolve config path relative to the exe location
        string exeDir = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location);
        configPath = Path.Combine(exeDir, "bridge_config.json");

        this.Text = "PP. Al-Hamid - ZKFinger API Bridge";
        this.Size = new Size(720, 520);
        this.FormBorderStyle = FormBorderStyle.FixedSingle;
        this.MaximizeBox = false;
        this.StartPosition = FormStartPosition.CenterScreen;
        this.BackColor = Color.FromArgb(240, 244, 248);

        // Start hidden in system tray
        this.WindowState = FormWindowState.Minimized;
        this.ShowInTaskbar = false;

        LoadConfig();
        SetupSystemTray();
        RegisterProtocolHandler();
        BuildUI();

        this.Load += (s, e) => {
            // Hide the form immediately on load
            this.Hide();
            InitializeSensor();
            // Start polling server for enroll-status every 2 seconds
            enrollPollTimer = new System.Windows.Forms.Timer();
            enrollPollTimer.Interval = 2000;
            enrollPollTimer.Tick += (s2, e2) => PollEnrollStatus();
            enrollPollTimer.Start();
            
            ShowBalloon("ZKFingerBridge Aktif", "Aplikasi berjalan di latar belakang.\nMode Absensi otomatis aktif.", ToolTipIcon.Info);
        };
    }

    // =============================
    // System Tray Setup
    // =============================
    private void SetupSystemTray() {
        trayMenu = new ContextMenuStrip();
        trayMenu.BackColor = Color.White;
        trayMenu.Font = new Font("Segoe UI", 9);
        
        var itemShow = new ToolStripMenuItem("📊 Buka Dashboard");
        itemShow.Font = new Font("Segoe UI", 9, FontStyle.Bold);
        itemShow.Click += (s, e) => ShowDashboard();
        
        var itemSep1 = new ToolStripSeparator();
        
        var itemAbsensi = new ToolStripMenuItem("✅ Mode Absensi");
        itemAbsensi.Click += (s, e) => { SetVerifyMode(); ShowBalloon("Mode Absensi", "Sensor siap untuk scan absensi.", ToolTipIcon.Info); };
        
        var itemDaftar = new ToolStripMenuItem("📝 Mode Daftar");
        itemDaftar.Click += (s, e) => { SetRegisterMode(); ShowBalloon("Mode Daftar", "Sensor siap untuk pendaftaran sidik jari.", ToolTipIcon.Info); };
        
        var itemSync = new ToolStripMenuItem("🔄 Sinkronisasi Template");
        itemSync.Click += (s, e) => SyncTemplates();
        
        var itemSep2 = new ToolStripSeparator();
        
        var itemStartup = new ToolStripMenuItem("🚀 Jalankan Saat Windows Start");
        itemStartup.Checked = IsStartupEnabled();
        itemStartup.Click += (s, e) => {
            if (IsStartupEnabled()) {
                DisableStartup();
                itemStartup.Checked = false;
                ShowBalloon("Auto-Start Dinonaktifkan", "ZKFingerBridge tidak akan berjalan otomatis saat Windows menyala.", ToolTipIcon.Info);
            } else {
                EnableStartup();
                itemStartup.Checked = true;
                ShowBalloon("Auto-Start Diaktifkan", "ZKFingerBridge akan berjalan otomatis saat Windows menyala.", ToolTipIcon.Info);
            }
        };
        
        var itemSep3 = new ToolStripSeparator();
        
        var itemExit = new ToolStripMenuItem("❌ Keluar");
        itemExit.Click += (s, e) => ExitApplication();
        
        trayMenu.Items.AddRange(new ToolStripItem[] {
            itemShow, itemSep1, itemAbsensi, itemDaftar, itemSync, itemSep2, itemStartup, itemSep3, itemExit
        });

        trayIcon = new NotifyIcon();
        trayIcon.Text = "ZKFingerBridge — PP. Al-Hamid";
        trayIcon.Icon = SystemIcons.Shield;
        trayIcon.ContextMenuStrip = trayMenu;
        trayIcon.Visible = true;
        trayIcon.DoubleClick += (s, e) => ShowDashboard();
    }

    private void ShowDashboard() {
        this.Show();
        this.WindowState = FormWindowState.Normal;
        this.ShowInTaskbar = true;
        this.BringToFront();
        this.Activate();
    }

    private void ShowBalloon(string title, string message, ToolTipIcon icon) {
        if (trayIcon != null) {
            trayIcon.BalloonTipTitle = title;
            trayIcon.BalloonTipText = message;
            trayIcon.BalloonTipIcon = icon;
            trayIcon.ShowBalloonTip(2500);
        }
    }

    private void ExitApplication() {
        isExiting = true;
        if (trayIcon != null) {
            trayIcon.Visible = false;
            trayIcon.Dispose();
        }
        Application.Exit();
    }

    // =============================
    // Windows Startup Registration
    // =============================
    private bool IsStartupEnabled() {
        try {
            using (RegistryKey key = Registry.CurrentUser.OpenSubKey(STARTUP_REG_KEY, false)) {
                return key != null && key.GetValue(APP_NAME) != null;
            }
        } catch { return false; }
    }

    private void EnableStartup() {
        try {
            string exePath = System.Reflection.Assembly.GetExecutingAssembly().Location;
            using (RegistryKey key = Registry.CurrentUser.OpenSubKey(STARTUP_REG_KEY, true)) {
                key.SetValue(APP_NAME, "\"" + exePath + "\"");
            }
            Log("Auto-Start Windows diaktifkan.");
        } catch (Exception ex) {
            Log("Gagal mengaktifkan auto-start: " + ex.Message);
        }
    }

    private void DisableStartup() {
        try {
            using (RegistryKey key = Registry.CurrentUser.OpenSubKey(STARTUP_REG_KEY, true)) {
                key.DeleteValue(APP_NAME, false);
            }
            Log("Auto-Start Windows dinonaktifkan.");
        } catch (Exception ex) {
            Log("Gagal menonaktifkan auto-start: " + ex.Message);
        }
    }

    private void RegisterProtocolHandler() {
        try {
            string exePath = System.Reflection.Assembly.GetExecutingAssembly().Location;
            using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Classes\zkfingerbridge")) {
                key.SetValue("", "URL:ZKFingerBridge Protocol");
                key.SetValue("URL Protocol", "");
                using (RegistryKey defaultIcon = key.CreateSubKey("DefaultIcon")) {
                    defaultIcon.SetValue("", "\"" + exePath + "\",1");
                }
                using (RegistryKey commandKey = key.CreateSubKey(@"shell\open\command")) {
                    commandKey.SetValue("", "\"" + exePath + "\" \"%1\"");
                }
            }
        } catch {}
    }

    // =============================
    // UI Construction
    // =============================
    private void BuildUI() {
        // Header Panel
        Panel headerPanel = new Panel();
        headerPanel.Size = new Size(720, 60);
        headerPanel.BackColor = Color.FromArgb(79, 70, 229); // Modern Indigo
        
        Label lblHeader = new Label();
        lblHeader.Text = "ZKFingerprint API Bridge Dashboard";
        lblHeader.ForeColor = Color.White;
        lblHeader.Font = new Font("Segoe UI", 12, FontStyle.Bold);
        lblHeader.Location = new Point(15, 18);
        lblHeader.AutoSize = true;
        headerPanel.Controls.Add(lblHeader);
        this.Controls.Add(headerPanel);

        // Sensor Info
        lblSensorInfo = new Label();
        lblSensorInfo.Text = "Mendeteksi sensor biometrik...";
        lblSensorInfo.Font = new Font("Segoe UI", 9, FontStyle.Regular);
        lblSensorInfo.Location = new Point(15, 75);
        lblSensorInfo.Size = new Size(300, 20);
        this.Controls.Add(lblSensorInfo);

        // Server Status Info
        lblServerStatus = new Label();
        lblServerStatus.Text = "Server: Menghubungkan...";
        lblServerStatus.Font = new Font("Segoe UI", 9, FontStyle.Bold);
        lblServerStatus.ForeColor = Color.Orange;
        lblServerStatus.Location = new Point(320, 75);
        lblServerStatus.Size = new Size(150, 20);
        lblServerStatus.TextAlign = ContentAlignment.TopRight;
        this.Controls.Add(lblServerStatus);

        // Current Mode Status Box
        Panel statusBox = new Panel();
        statusBox.Location = new Point(15, 100);
        statusBox.Size = new Size(450, 80);
        statusBox.BackColor = Color.White;
        statusBox.BorderStyle = BorderStyle.FixedSingle;
        
        lblStatus = new Label();
        lblStatus.Text = "STATUS: MENGHUBUNGKAN...";
        lblStatus.Font = new Font("Segoe UI", 12, FontStyle.Bold);
        lblStatus.ForeColor = Color.DarkGray;
        lblStatus.Location = new Point(15, 12);
        lblStatus.Size = new Size(420, 30);
        statusBox.Controls.Add(lblStatus);

        for (int i = 0; i < 3; i++) {
            pnlProgress[i] = new Label();
            pnlProgress[i].Text = "Sentuhan " + (i + 1);
            pnlProgress[i].Font = new Font("Segoe UI", 8.5f, FontStyle.Bold);
            pnlProgress[i].TextAlign = ContentAlignment.MiddleCenter;
            pnlProgress[i].Size = new Size(130, 22);
            pnlProgress[i].Location = new Point(15 + (i * 145), 48);
            pnlProgress[i].BackColor = Color.FromArgb(241, 245, 249);
            pnlProgress[i].ForeColor = Color.FromArgb(100, 116, 139);
            pnlProgress[i].BorderStyle = BorderStyle.FixedSingle;
            pnlProgress[i].Visible = false;
            statusBox.Controls.Add(pnlProgress[i]);
        }
        this.Controls.Add(statusBox);

        // Control Buttons
        btnVerifyMode = new Button();
        btnVerifyMode.Text = "MODE ABSENSI";
        btnVerifyMode.Font = new Font("Segoe UI", 9, FontStyle.Bold);
        btnVerifyMode.Location = new Point(15, 185);
        btnVerifyMode.Size = new Size(130, 35);
        btnVerifyMode.BackColor = Color.FromArgb(16, 185, 129);
        btnVerifyMode.ForeColor = Color.White;
        btnVerifyMode.FlatStyle = FlatStyle.Flat;
        btnVerifyMode.Click += (s, e) => SetVerifyMode();
        this.Controls.Add(btnVerifyMode);

        btnRegisterMode = new Button();
        btnRegisterMode.Text = "MODE DAFTAR";
        btnRegisterMode.Font = new Font("Segoe UI", 9, FontStyle.Bold);
        btnRegisterMode.Location = new Point(155, 185);
        btnRegisterMode.Size = new Size(130, 35);
        btnRegisterMode.BackColor = Color.FromArgb(148, 163, 184);
        btnRegisterMode.ForeColor = Color.White;
        btnRegisterMode.FlatStyle = FlatStyle.Flat;
        btnRegisterMode.Click += (s, e) => SetRegisterMode();
        this.Controls.Add(btnRegisterMode);

        btnSync = new Button();
        btnSync.Text = "SYNC TEMPLATE";
        btnSync.Font = new Font("Segoe UI", 9, FontStyle.Bold);
        btnSync.Location = new Point(295, 185);
        btnSync.Size = new Size(170, 35);
        btnSync.BackColor = Color.FromArgb(79, 70, 229);
        btnSync.ForeColor = Color.White;
        btnSync.FlatStyle = FlatStyle.Flat;
        btnSync.Click += (s, e) => SyncTemplates();
        this.Controls.Add(btnSync);

        // Minimize to Tray Button
        Button btnMinimize = new Button();
        btnMinimize.Text = "⬇ SEMBUNYIKAN KE TRAY";
        btnMinimize.Font = new Font("Segoe UI", 8, FontStyle.Bold);
        btnMinimize.Location = new Point(15, 225);
        btnMinimize.Size = new Size(450, 28);
        btnMinimize.BackColor = Color.FromArgb(241, 245, 249);
        btnMinimize.ForeColor = Color.FromArgb(100, 116, 139);
        btnMinimize.FlatStyle = FlatStyle.Flat;
        btnMinimize.Click += (s, e) => {
            this.Hide();
            this.ShowInTaskbar = false;
            ShowBalloon("Dashboard Disembunyikan", "ZKFingerBridge tetap berjalan di latar belakang.\nDouble-click ikon tray untuk membuka kembali.", ToolTipIcon.Info);
        };
        this.Controls.Add(btnMinimize);

        // Logs
        Label lblLog = new Label();
        lblLog.Text = "Log Aktivitas:";
        lblLog.Font = new Font("Segoe UI", 9, FontStyle.Bold);
        lblLog.Location = new Point(15, 260);
        this.Controls.Add(lblLog);

        lstLog = new ListBox();
        lstLog.Location = new Point(15, 280);
        lstLog.Size = new Size(450, 155);
        lstLog.Font = new Font("Consolas", 8.5f, FontStyle.Regular);
        this.Controls.Add(lstLog);

        // Visual Sensor Box Title
        Label lblVisual = new Label();
        lblVisual.Text = "Sensor Visual (Sidik Jari):";
        lblVisual.Font = new Font("Segoe UI", 9, FontStyle.Bold);
        lblVisual.Location = new Point(485, 75);
        lblVisual.Size = new Size(200, 20);
        this.Controls.Add(lblVisual);

        // Footer / Template count
        lblTemplateCount = new Label();
        lblTemplateCount.Text = "Jumlah Sidik Jari Terdaftar: 0";
        lblTemplateCount.Font = new Font("Segoe UI", 9, FontStyle.Italic);
        lblTemplateCount.Location = new Point(15, 445);
        lblTemplateCount.Size = new Size(450, 20);
        this.Controls.Add(lblTemplateCount);
    }

    // =============================
    // Configuration
    // =============================
    private void LoadConfig() {
        serverUrl = "https://absen.alhamidcintamulya.my.id";
        try {
            if (File.Exists(configPath)) {
                string text = File.ReadAllText(configPath);
                Match match = Regex.Match(text, @"""(server_url|serverurl)""\s*:\s*""([^""]+)""", RegexOptions.IgnoreCase);
                if (match.Success && !string.IsNullOrEmpty(match.Groups[2].Value)) {
                    serverUrl = match.Groups[2].Value.TrimEnd('/');
                }
            } else {
                string defaultJson = "{\n  \"ServerUrl\": \"https://absen.alhamidcintamulya.my.id\"\n}";
                File.WriteAllText(configPath, defaultJson);
            }
        } catch {}
    }

    // =============================
    // HTTP Helpers
    // =============================
    private string HttpPost(string path, string json) {
        try {
            using (var client = new System.Net.WebClient()) {
                client.Headers[System.Net.HttpRequestHeader.ContentType] = "application/json";
                client.Encoding = Encoding.UTF8;
                return client.UploadString(serverUrl + path, "POST", json);
            }
        } catch (Exception ex) {
            return "ERROR: " + ex.Message;
        }
    }

    private string HttpGet(string path) {
        try {
            using (var client = new System.Net.WebClient()) {
                client.Encoding = Encoding.UTF8;
                return client.DownloadString(serverUrl + path);
            }
        } catch (Exception ex) {
            return "ERROR: " + ex.Message;
        }
    }

    // =============================
    // Logging
    // =============================
    private void Log(string message) {
        string ts = DateTime.Now.ToString("HH:mm:ss");
        string formatted = string.Format("[{0}] {1}", ts, message);
        Console.WriteLine(formatted);
        if (lstLog != null) {
            lstLog.Items.Add(formatted);
            if (lstLog.Items.Count > 500) lstLog.Items.RemoveAt(0); // Prevent memory leak
            lstLog.SelectedIndex = lstLog.Items.Count - 1;
            lstLog.ClearSelected();
        }
    }

    public void SafeLog(string message) {
        if (this.InvokeRequired) {
            this.BeginInvoke((MethodInvoker)delegate { Log(message); });
        } else {
            Log(message);
        }
    }

    // =============================
    // Server Health Check
    // =============================
    private void CheckServerStatus() {
        new Thread(() => {
            try {
                using (var client = new System.Net.WebClient()) {
                    client.DownloadString(serverUrl + "/");
                    this.BeginInvoke((MethodInvoker)delegate {
                        lblServerStatus.Text = "Server: ONLINE";
                        lblServerStatus.ForeColor = Color.Green;
                    });
                }
            } catch {
                this.BeginInvoke((MethodInvoker)delegate {
                    lblServerStatus.Text = "Server: OFFLINE";
                    lblServerStatus.ForeColor = Color.Red;
                });
            }
        }).Start();
    }

    private void SendStatusToServer(string logMessage = null) {
        new Thread(() => {
            try {
                string modeStr = isRegisterMode ? "register" : "verify";
                string snStr = (fp != null && !string.IsNullOrEmpty(fp.SensorSN)) ? fp.SensorSN : "-";
                int count = cacheIdMap.Count;
                
                string escapedLog = logMessage != null ? logMessage.Replace("\"", "\\\"").Replace("\r", "").Replace("\n", "") : "";
                string payload = string.Format("{{\"mode\":\"{0}\",\"sensor_sn\":\"{1}\",\"templates_count\":{2},\"log\":\"{3}\",\"enroll_samples\":{4}}}", 
                    modeStr, snStr, count, escapedLog, enrollSamplesCount);
                
                HttpPost("/api/fingerprint/bridge-status", payload);
            } catch {}
        }).Start();
    }

    // =============================
    // Auto-Mode Polling & Remote Command Listener
    // =============================
    private void PollEnrollStatus() {
        if (fp == null) return;
        new Thread(() => {
            try {
                // 1. Send periodic heartbeat status
                SendStatusToServer(null);

                // 2. Poll remote command from Web UI
                string cmdJson = HttpGet("/api/fingerprint/bridge-command-poll");
                if (!string.IsNullOrEmpty(cmdJson) && !cmdJson.StartsWith("ERROR")) {
                    if (cmdJson.Contains("\"set_verify\"")) {
                        this.BeginInvoke((MethodInvoker)delegate {
                            SafeLog("Perintah dari Web: Masuk Mode Absensi");
                            SetVerifyMode();
                        });
                    } else if (cmdJson.Contains("\"set_register\"")) {
                        this.BeginInvoke((MethodInvoker)delegate {
                            SafeLog("Perintah dari Web: Masuk Mode Daftar");
                            SetRegisterMode();
                        });
                    } else if (cmdJson.Contains("\"sync_templates\"")) {
                        this.BeginInvoke((MethodInvoker)delegate {
                            SafeLog("Perintah dari Web: Sync Template");
                            SyncTemplates();
                        });
                    }
                }

                // 3. Poll active enrollment session if not already in register mode
                if (!isRegisterMode) {
                    string json = HttpGet("/api/fingerprint/enroll-status");
                    if (json.Contains("\"active\": true") || json.Contains("\"active\":true")) {
                        var idMatch = Regex.Match(json, @"""santri_id""\s*:\s*(\d+)");
                        int sid = idMatch.Success ? int.Parse(idMatch.Groups[1].Value) : 0;
                        var nameMatch = Regex.Match(json, @"""name""\s*:\s*""([^""]+)""");
                        string sname = nameMatch.Success ? nameMatch.Groups[1].Value : "";
                        
                        if (sid > 0 && enrollingSantriId != sid) {
                            enrollingSantriId = sid;
                            this.BeginInvoke((MethodInvoker)delegate {
                                SafeLog("Server meminta pendaftaran sidik jari untuk: " + sname + " (ID: " + sid + ")");
                                SetRegisterMode();
                                ShowBalloon("Pendaftaran Sidik Jari", "Tempelkan jari " + sname + " ke sensor 3 kali.", ToolTipIcon.Info);
                            });
                        }
                    } else {
                        if (enrollingSantriId != 0) {
                            enrollingSantriId = 0;
                        }
                    }
                }
            } catch {}
        }).Start();
    }

    // =============================
    // Sensor Initialization
    // =============================
    private void InitializeSensor() {
        try {
            if (!Directory.Exists(templateDir)) {
                Directory.CreateDirectory(templateDir);
            }

            CheckServerStatus();

            Log("Membuat ActiveX container (AxHost)...");
            axFp = new AxZKFPEngX();
            axFp.Location = new Point(485, 100);
            axFp.Size = new Size(200, 295);
            axFp.Visible = true;
            this.Controls.Add(axFp);
            IntPtr forcedHandle = axFp.Handle;
            axFp.CreateControl();

            fp = axFp.Ocx;
            
            if (fp == null) {
                throw new Exception("Gagal menginstansiasi ActiveX control. Ocx bernilai null.");
            }

            int initRes = fp.InitEngine();
            if (initRes != 0) {
                lblSensorInfo.Text = "Sensor Gagal Dihubungkan! (Error Code: " + initRes + ")";
                lblSensorInfo.ForeColor = Color.Red;
                lblStatus.Text = "ERROR: SENSOR TIDAK TERHUBUNG";
                lblStatus.ForeColor = Color.Red;
                Log("Gagal inisialisasi sensor. Cek kabel USB.");
                ShowBalloon("Sensor Error", "Sensor sidik jari tidak terdeteksi.\nPastikan kabel USB terhubung.", ToolTipIcon.Error);
                return;
            }

            // Official ZKFinger 10.0 Engine Configuration
            fp.FPEngineVersion = "10";
            fp.Threshold = 30; // Recommended responsive 1:N threshold for ZKFinger 10.0
            
            Log("FPEngineVersion set to: " + fp.FPEngineVersion + ", Threshold set to: " + fp.Threshold);

            fp.Active = true;
            
            Log(string.Format("Sensor SN: {0} | Engine: v{1} | SensorCount: {2} | SensorIndex: {3}",
                fp.SensorSN, fp.FPEngineVersion, fp.SensorCount, fp.SensorIndex));
            lblSensorInfo.Text = string.Format("Sensor SN: {0} | Sensors: {1}", fp.SensorSN, fp.SensorCount);
            lblSensorInfo.ForeColor = Color.Green;

            fpcHandle = fp.CreateFPCacheDB();
            Log("FPCacheDB berhasil dibuat.");

            // Register COM connection point events AFTER engine is initialized and active
            Log("Mendaftarkan event sink via IConnectionPoint...");
            try {
                IMyConnectionPointContainer container = (IMyConnectionPointContainer)fp;
                Guid eventsIID = new Guid("8aee2e53-7ebe-4b51-a964-009adc68d107"); // IZKFPEngXEvents
                container.FindConnectionPoint(ref eventsIID, out connectionPoint);

                ZKEventSink sink = new ZKEventSink(this);
                connectionPoint.Advise(sink, out eventCookie);
                Log("Event sink terdaftar! (cookie: " + eventCookie + ")");
            }
            catch (Exception ex) {
                Log("Event sink gagal: " + ex.Message);
            }

            // Sync templates from Server DB
            SyncTemplates();

            SetVerifyMode();
            Log("Alat pembaca sidik jari aktif.");
            
            // Update tray icon tooltip
            trayIcon.Text = "ZKFingerBridge — Aktif ✓";
        }
        catch (Exception ex) {
            Log("Error fatal: " + ex.Message);
            lblStatus.Text = "ERROR: " + ex.Message;
            lblStatus.ForeColor = Color.Red;
            ShowBalloon("Error Fatal", ex.Message, ToolTipIcon.Error);
        }
    }

    // =============================
    // Template Sync
    // =============================
    private void SyncTemplates() {
        Log("Menghubungkan ke server untuk sinkronisasi template...");
        new Thread(() => {
            string json = HttpGet("/api/fingerprint/templates");
            if (json.StartsWith("ERROR")) {
                SafeLog("Sinkronisasi gagal: " + json);
                return;
            }

            this.BeginInvoke((MethodInvoker)delegate {
                try {
                    // Empty current cache
                    fp.FreeFPCacheDB(fpcHandle);
                    fpcHandle = fp.CreateFPCacheDB();

                    // Clear old mappings
                    cacheIdMap.Clear();

                    // Regex parse response: [{"santri_id":X,"fingerprint_id":"Y","template_data":"Z"}]
                    var matches = Regex.Matches(json, @"\{""santri_id"":\d+,""fingerprint_id"":""([^""]+)"",""template_data"":""([^""]+)""\}");
                    int count = 0;
                    foreach (Match match in matches) {
                        string fpId = match.Groups[1].Value;
                        string tplData = match.Groups[2].Value;
                        
                        object decoded = null;
                        if (fp.DecodeTemplate(tplData, ref decoded)) {
                            // Convert fpId directly to int since it is a string representation of a positive 32-bit integer
                            int cacheId;
                            if (int.TryParse(fpId, out cacheId)) {
                                if (fp.AddRegTemplateToFPCacheDB(fpcHandle, cacheId, decoded) >= 0) {
                                    count++;
                                    Log(string.Format("Sync template: ID={0} mapped to cache ID={1}", fpId, cacheId));
                                    if (!cacheIdMap.ContainsKey(cacheId)) cacheIdMap.Add(cacheId, fpId);
                                    else cacheIdMap[cacheId] = fpId;
                                } else {
                                    Log(string.Format("Gagal menambah template cache: {0}", fpId));
                                }
                            } else {
                                Log(string.Format("ID Sidik jari bukan format integer: {0}", fpId));
                            }
                        } else {
                            Log(string.Format("Gagal mendecode template sidik jari ID: {0}", fpId));
                        }
                    }
                    lblTemplateCount.Text = "Jumlah Sidik Jari Terdaftar: " + count;
                    Log("Berhasil mensinkronkan " + count + " template sidik jari terpusat.");
                }
                catch (Exception ex) {
                    Log("Gagal memuat template: " + ex.Message);
                }
            });
        }).Start();
    }

    // =============================
    // Fingerprint Event Handlers
    // =============================
    public void HandleFeatureInfo(int quality) {
        if (this.InvokeRequired) {
            this.BeginInvoke((MethodInvoker)delegate { HandleFeatureInfo(quality); });
            return;
        }
        if (isRegisterMode) {
            enrollSamplesCount++;
            if (enrollSamplesCount > 3) enrollSamplesCount = 3;
            Log(string.Format("Tempel Jari ke-{0} Sukses! (Kualitas: {1}/100)", enrollSamplesCount, quality));
            UpdateProgressUI();
            if (enrollSamplesCount < 3) {
                lblStatus.Text = "MODE DAFTAR — Tempel jari ke-" + (enrollSamplesCount + 1);
            } else {
                lblStatus.Text = "MODE DAFTAR — Memproses template...";
            }
        } else {
            Log(string.Format("Scan Jari Sukses! (Kualitas: {0}/100)", quality));
        }
    }

    private void UpdateProgressUI() {
        if (this.InvokeRequired) {
            this.BeginInvoke((MethodInvoker)delegate { UpdateProgressUI(); });
            return;
        }
        for (int i = 0; i < 3; i++) {
            if (isRegisterMode) {
                pnlProgress[i].Visible = true;
                if (enrollSamplesCount > i) {
                    pnlProgress[i].BackColor = Color.FromArgb(16, 185, 129);
                    pnlProgress[i].ForeColor = Color.White;
                } else {
                    pnlProgress[i].BackColor = Color.FromArgb(241, 245, 249);
                    pnlProgress[i].ForeColor = Color.FromArgb(100, 116, 139);
                }
            } else {
                pnlProgress[i].Visible = false;
            }
        }
    }

    // =============================
    // Mode Switching
    // =============================
    private void SetVerifyMode() {
        if (fp == null) return;
        isRegisterMode = false;
        enrollingSantriId = 0;
        enrollSamplesCount = 0;
        btnVerifyMode.BackColor = Color.FromArgb(16, 185, 129);
        btnRegisterMode.BackColor = Color.FromArgb(148, 163, 184);
        try {
            if (fp.IsRegister) fp.CancelEnroll();
            fp.BeginCapture();
            Log("BeginCapture dipanggil untuk masuk mode absensi.");
        } catch (Exception ex) {
            Log("Error BeginCapture: " + ex.Message);
        }
        lblStatus.Text = "MODE ABSENSI — Tempel jari untuk absen";
        lblStatus.ForeColor = Color.FromArgb(16, 185, 129);
        Log("Mode Absensi aktif.");
        UpdateProgressUI();
        CheckServerStatus();
        
        // Update tray tooltip
        trayIcon.Text = "ZKFingerBridge — Mode Absensi ✓";
    }

    private void SetRegisterMode() {
        if (fp == null) return;
        isRegisterMode = true;
        enrollSamplesCount = 0;
        btnVerifyMode.BackColor = Color.FromArgb(148, 163, 184);
        btnRegisterMode.BackColor = Color.FromArgb(79, 70, 229);
        try {
            fp.CancelEnroll();
            fp.EnrollCount = 3;
            fp.BeginEnroll();
        } catch (Exception ex) {
            Log("Error BeginEnroll: " + ex.Message);
        }
        lblStatus.Text = "MODE DAFTAR — Tempel jari ke-1";
        lblStatus.ForeColor = Color.FromArgb(79, 70, 229);
        Log(string.Format("Mode Daftar aktif. Tempel jari ke-1. (IsRegister: {0})", fp.IsRegister));
        UpdateProgressUI();
        
        // Update tray tooltip
        trayIcon.Text = "ZKFingerBridge — Mode Daftar 📝";
    }

    // =============================
    // Capture Handler (Verification Mode)
    // =============================
    public void HandleCapture(bool actionResult, object template) {
        if (isRegisterMode) return;
        this.BeginInvoke((MethodInvoker)delegate {
            try {
                if (!actionResult) { Log("Scan gagal. Coba lagi."); return; }
                Log("Jari terdeteksi! Mencocokkan...");
                int score = 8, processed = 0;
                int matchedCacheID = fp.IdentificationInFPCacheDB(fpcHandle, template, ref score, ref processed);
                Log(string.Format("Hasil Pencocokan: ID Cocok={0}, Skor={1}, Jumlah Diproses={2}", matchedCacheID, score, processed));
                
                if (matchedCacheID > 0) {
                    string fpId = GetFingerprintIdFromCacheId(matchedCacheID);
                    if (!string.IsNullOrEmpty(fpId)) {
                        Log("COCOK! ID: " + fpId + " (skor: " + score + ")");
                        try { fp.ControlSensor(11, 1); fp.ControlSensor(13, 1); Thread.Sleep(100); fp.ControlSensor(13, 0); fp.ControlSensor(11, 0); } catch {}
                        
                        // Send HTTP request to backend
                        SendScanToServer(fpId, score);
                        
                        // Balloon notification for scan success
                        ShowBalloon("Absensi Tercatat ✓", "Sidik jari dikenali (Skor: " + score + ")", ToolTipIcon.Info);
                    } else {
                        Log("Error: Gagal mencocokkan cache ID lokal ke database.");
                    }
                } else {
                    Log("Tidak dikenali (skor: " + score + ")");
                    try { fp.ControlSensor(12, 1); fp.ControlSensor(13, 1); Thread.Sleep(200); fp.ControlSensor(13, 0); fp.ControlSensor(12, 0); } catch {}
                    ShowBalloon("Sidik Jari Tidak Dikenali", "Sidik jari tidak terdaftar di sistem.", ToolTipIcon.Warning);
                }
            } catch (Exception ex) { Log("Error Capture: " + ex.Message); }
        });
    }

    private System.Collections.Generic.Dictionary<int, string> cacheIdMap = new System.Collections.Generic.Dictionary<int, string>();

    private string GetFingerprintIdFromCacheId(int cacheId) {
        if (cacheIdMap.ContainsKey(cacheId)) {
            return cacheIdMap[cacheId];
        }
        return "";
    }

    private void SendScanToServer(string fpId, int score) {
        new Thread(() => {
            string payload = string.Format("{{\"fingerprint_id\":\"{0}\",\"score\":{1}}}", fpId, score);
            string response = HttpPost("/api/fingerprint/scan", payload);
            SafeLog("Server Response: " + response);
        }).Start();
    }

    // =============================
    // Enrollment Handler
    // =============================
    public void HandleEnroll(bool actionResult, object template) {
        if (!isRegisterMode) return;
        this.BeginInvoke((MethodInvoker)delegate {
            try {
                if (!actionResult) {
                    Log("Pendaftaran gagal! Coba lagi.");
                    try { fp.ControlSensor(12, 1); fp.ControlSensor(13, 1); Thread.Sleep(250); fp.ControlSensor(13, 0); fp.ControlSensor(12, 0); } catch {}
                    ShowBalloon("Pendaftaran Gagal", "Kualitas sidik jari kurang. Coba lagi.", ToolTipIcon.Warning);
                    return;
                }

                // Generate new unique ID
                Random rand = new Random();
                int newID = rand.Next(1000000000, 2147483647);
                string fpId = newID.ToString();
                
                string tplStr = fp.GetTemplateAsString();
                
                // Save locally for backup
                File.WriteAllText(Path.Combine(templateDir, fpId + ".tpl"), tplStr);
                
                // Add to cache
                int cacheId;
                if (int.TryParse(fpId, out cacheId)) {
                    fp.AddRegTemplateToFPCacheDB(fpcHandle, cacheId, template);
                    Log(string.Format("Pendaftaran lokal: ID={0} mapped to cache ID={1}", fpId, cacheId));
                    if (cacheIdMap.ContainsKey(cacheId)) cacheIdMap[cacheId] = fpId;
                    else cacheIdMap.Add(cacheId, fpId);
                } else {
                    Log(string.Format("Gagal mapping cache ID, format salah: {0}", fpId));
                }

                Log("SUKSES! ID Baru: " + fpId);
                try { fp.ControlSensor(11, 1); fp.ControlSensor(13, 1); Thread.Sleep(80); fp.ControlSensor(13, 0); Thread.Sleep(80); fp.ControlSensor(13, 1); Thread.Sleep(80); fp.ControlSensor(13, 0); fp.ControlSensor(11, 0); } catch {}
                ShowBalloon("Pendaftaran Berhasil ✓", "Sidik jari berhasil didaftarkan!", ToolTipIcon.Info);

                // Send to Server
                SendEnrollToServer(fpId, tplStr);

                SetVerifyMode();
            } catch (Exception ex) { Log("Error Enroll: " + ex.Message); }
        });
    }

    private void SendEnrollToServer(string fpId, string tplStr) {
        new Thread(() => {
            // Escape any weird characters in template data
            string escapedTpl = tplStr.Replace("\r", "").Replace("\n", "");
            string payload = string.Format("{{\"fingerprint_id\":\"{0}\",\"template_data\":\"{1}\"}}", fpId, escapedTpl);
            string response = HttpPost("/api/fingerprint/enroll", payload);
            SafeLog("Server Enroll Response: " + response);
            
            // Sync templates to ensure everything is matched up
            SyncTemplates();
        }).Start();
    }

    // =============================
    // Form Close → Minimize to Tray (not exit)
    // =============================
    protected override void OnFormClosing(FormClosingEventArgs e) {
        if (!isExiting) {
            // Minimize to tray instead of closing
            e.Cancel = true;
            this.Hide();
            this.ShowInTaskbar = false;
            ShowBalloon("ZKFingerBridge Tetap Aktif", "Aplikasi berjalan di latar belakang.\nKlik kanan ikon tray untuk menu.", ToolTipIcon.Info);
            return;
        }

        // Actually exiting — cleanup
        try {
            if (connectionPoint != null && eventCookie != 0)
                connectionPoint.Unadvise(eventCookie);
            if (fp != null) { fp.CancelEnroll(); fp.EndEngine(); fp.FreeFPCacheDB(fpcHandle); }
        } catch {}
        base.OnFormClosing(e);
    }
}

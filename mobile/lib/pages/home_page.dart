import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../services/fingerprint_service.dart';
import '../services/api_service.dart';
import '../helpers/database_helper.dart';
import 'manual_absensi_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({Key? key}) : super(key: key);

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with SingleTickerProviderStateMixin {
  String _currentTimeString = '';
  late Timer _clockTimer;
  bool _isSyncing = false;
  String _lastSyncText = 'Belum pernah sinkronisasi';
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _updateTime();
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (Timer t) => _updateTime());
    _loadLastSyncTime();

    // Pulse animation for fingerprint scanner
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    // Auto sync on app startup
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _autoSync();
      // Auto connect fingerprint scanner
      Provider.of<FingerprintService>(context, listen: false).connectDevice();
    });
  }

  void _updateTime() {
    final DateTime now = DateTime.now();
    final String formattedTime = _formatDateTime(now);
    if (mounted) {
      setState(() {
        _currentTimeString = formattedTime;
      });
    }
  }

  String _formatDateTime(DateTime dt) {
    final String hour = dt.hour.toString().padLeft(2, '0');
    final String minute = dt.minute.toString().padLeft(2, '0');
    final String second = dt.second.toString().padLeft(2, '0');
    return '$hour:$minute:$second';
  }

  Future<void> _loadLastSyncTime() async {
    final lastSync = await DatabaseHelper.instance.getLastSync();
    if (lastSync != null && mounted) {
      final dt = DateTime.parse(lastSync);
      setState(() {
        _lastSyncText = 'Terakhir Sinkronisasi: ${dt.day}/${dt.month} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
      });
    }
  }

  Future<void> _autoSync() async {
    setState(() => _isSyncing = true);
    final success = await ApiService.syncSantriData();
    if (success) {
      _loadLastSyncTime();
      // Reload templates to scanner
      if (mounted) {
        Provider.of<FingerprintService>(context, listen: false).reloadLocalDatabaseToDevice();
      }
    }
    if (mounted) {
      setState(() => _isSyncing = false);
    }
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour >= 4 && hour < 10) return 'Selamat Pagi';
    if (hour >= 10 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  }

  String _getActiveSholat() {
    final hour = DateTime.now().hour;
    if (hour >= 4 && hour < 6) return 'Sholat Subuh';
    if (hour >= 11 && hour < 14) return 'Sholat Dzuhur';
    if (hour >= 15 && hour < 17) return 'Sholat Ashar';
    if (hour >= 17 && hour < 19) return 'Sholat Maghrib';
    if (hour >= 19 && hour < 22) return 'Sholat Isya';
    return 'Waktu Bebas';
  }

  @override
  void dispose() {
    _clockTimer.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final fpService = Provider.of<FingerprintService>(context);
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC), // Slate 50
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // HEADER BRANDING
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _getGreeting(),
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF64748B), // Slate 500
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Ponpes Al-Hamid',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A), // Slate 900
                          letterSpacing: -0.5,
                        ),
                      ),
                    ],
                  ),
                  // Sync Button / Indicator
                  Material(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    elevation: 1,
                    shadowColor: Colors.black.withOpacity(0.05),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: _isSyncing ? null : _autoSync,
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        child: _isSyncing
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF10B981)),
                                ),
                              )
                            : const Icon(
                                LucideIcons.refreshCw,
                                size: 20,
                                color: Color(0xFF475569),
                              ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // TIME & ACTIVE PRAYER CARD
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF4F46E5), Color(0xFF6366F1)], // Indigo gradient
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF4F46E5).withOpacity(0.25),
                      blurRadius: 15,
                      offset: const Offset(0, 8),
                    )
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            _getActiveSholat(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _currentTimeString,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ],
                    ),
                    const Icon(
                      LucideIcons.clock,
                      size: 48,
                      color: Colors.white30,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // MAIN SCANNER CIRCLE CONTAINER
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      )
                    ],
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Scanner Graphic with Pulse Animation
                      AnimatedBuilder(
                        animation: _pulseController,
                        builder: (context, child) {
                          final double pulseScale = fpService.isConnected && fpService.isListening
                              ? 1.0 + (_pulseController.value * 0.08)
                              : 1.0;
                          return Transform.scale(
                            scale: pulseScale,
                            child: Container(
                              width: 140,
                              height: 140,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: fpService.isConnected
                                    ? (fpService.errorMessage != null
                                        ? const Color(0xFFFEF2F2) // Red Alert
                                        : const Color(0xFFECFDF5)) // Green success
                                    : const Color(0xFFF1F5F9), // Inactive Grey
                                border: Border.all(
                                  color: fpService.isConnected
                                      ? (fpService.errorMessage != null
                                          ? const Color(0xFFFCA5A5)
                                          : const Color(0xFFA7F3D0))
                                      : const Color(0xFFE2E8F0),
                                  width: 4,
                                ),
                                boxShadow: fpService.isConnected && fpService.isListening
                                    ? [
                                        BoxShadow(
                                          color: const Color(0xFF10B981).withOpacity(0.15),
                                          blurRadius: 20,
                                          spreadRadius: 5,
                                        )
                                      ]
                                    : [],
                              ),
                              child: Center(
                                child: Icon(
                                  LucideIcons.fingerprint,
                                  size: 72,
                                  color: fpService.isConnected
                                      ? (fpService.errorMessage != null
                                          ? const Color(0xFFEF4444)
                                          : const Color(0xFF10B981))
                                      : const Color(0xFF94A3B8),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 24),
                      
                      // Status Label Text
                      Text(
                        fpService.statusMessage,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: fpService.errorMessage != null
                              ? const Color(0xFFEF4444)
                              : const Color(0xFF1E293B),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _lastSyncText,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF94A3B8),
                        ),
                      ),

                      // Reconnect button if disconnected
                      if (!fpService.isConnected) ...[
                        const SizedBox(height: 20),
                        ElevatedButton.icon(
                          onPressed: () => fpService.connectDevice(),
                          icon: const Icon(LucideIcons.usb, size: 16),
                          label: const Text('Koneksikan Sensor'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF4F46E5),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // MATCHED STUDENT DETAILS MODAL INSET
              if (fpService.lastMatchedSantri != null) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5), // Emerald 50
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: const BoxDecoration(
                          color: Color(0xFF10B981),
                          shape: BoxShape.circle,
                        ),
                        child: const Center(
                          child: Icon(
                            LucideIcons.check,
                            color: Colors.white,
                            size: 24,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              fpService.lastMatchedSantri!['name'],
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF065F46), // Emerald 800
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Kamar ${fpService.lastMatchedSantri!['room']} • ${fpService.lastMatchedSantri!['gender']}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF047857),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // FOOTER NAVIGATION: GO TO ABSENSI MANUAL
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const ManualAbsensiPage()),
                  );
                },
                icon: const Icon(LucideIcons.fileSpreadsheet, size: 18),
                label: const Text('Buka Absensi Manual'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF1F5F9), // slate 100
                  foregroundColor: const Color(0xFF334155), // slate 700
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

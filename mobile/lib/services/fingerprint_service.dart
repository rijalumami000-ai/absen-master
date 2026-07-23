import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:zkfinger10/finger_status_type.dart';
import 'package:zkfinger10/zk_finger.dart';
import '../helpers/database_helper.dart';
import 'api_service.dart';

class FingerprintService with ChangeNotifier {
  bool _isConnected = false;
  String _statusMessage = 'Perangkat tidak terdeteksi';
  bool _isListening = false;
  Map<String, dynamic>? _lastMatchedSantri;
  String? _errorMessage;

  bool get isConnected => _isConnected;
  String get statusMessage => _statusMessage;
  bool get isListening => _isListening;
  Map<String, dynamic>? get lastMatchedSantri => _lastMatchedSantri;
  String? get errorMessage => _errorMessage;

  StreamSubscription? _statusSubscription;

  FingerprintService() {
    _initStreamListener();
  }

  // Menghubungkan ke sensor USB OTG
  Future<void> connectDevice() async {
    try {
      _statusMessage = 'Membuka koneksi ke alat...';
      notifyListeners();

      final bool? opened = await ZkFinger.openConnection();
      if (opened == true) {
        _isConnected = true;
        _statusMessage = 'Alat sidik jari terhubung';
        _errorMessage = null;

        // Load data template lokal ke alat
        await reloadLocalDatabaseToDevice();
        
        // Mulai dengarkan tap jari
        await startListening();
      } else {
        _isConnected = false;
        _statusMessage = 'Gagal mendeteksi alat. Pastikan kabel OTG tercolok.';
      }
      notifyListeners();
    } catch (e) {
      _isConnected = false;
      _statusMessage = 'Error koneksi: $e';
      notifyListeners();
    }
  }

  // Putus koneksi
  Future<void> disconnectDevice() async {
    try {
      await stopListening();
      await ZkFinger.closeConnection();
      _isConnected = false;
      _statusMessage = 'Alat sidik jari terputus';
      notifyListeners();
    } catch (e) {
      print('Disconnect error: $e');
    }
  }

  // Mulai memindai tap jari
  Future<void> startListening() async {
    if (!_isConnected) return;
    try {
      final bool? listening = await ZkFinger.startListen();
      if (listening == true) {
        _isListening = true;
        _statusMessage = 'Tempelkan jari Anda pada sensor...';
      }
      notifyListeners();
    } catch (e) {
      print('Start listen error: $e');
    }
  }

  // Stop memindai tap jari
  Future<void> stopListening() async {
    try {
      await ZkFinger.stopListen();
      _isListening = false;
      notifyListeners();
    } catch (e) {
      print('Stop listen error: $e');
    }
  }

  // Memuat data sidik jari SQLite lokal ke modul SDK internal scanner
  Future<void> reloadLocalDatabaseToDevice() async {
    try {
      final santriList = await DatabaseHelper.instance.getSantriList();
      final Map<String, String> templateMap = {};
      
      for (final s in santriList) {
        final String? fpId = s['fingerprint_id'];
        final String? fpTemplate = s['fingerprint_template'];
        if (fpId != null && fpId.isNotEmpty && fpTemplate != null && fpTemplate.isNotEmpty) {
          templateMap[fpId] = fpTemplate;
        }
      }

      if (templateMap.isNotEmpty) {
        await ZkFinger.clearAndLoadDatabase(vUserList: templateMap);
        print('Loaded ${templateMap.length} templates into device database memory');
      }
    } catch (e) {
      print('Load templates to device error: $e');
    }
  }

  // Callback listener stream status
  void _initStreamListener() {
    _statusSubscription = ZkFinger.statusChangeStream.receiveBroadcastStream().listen((event) async {
      if (event is Map) {
        final int statusTypeIndex = event['fingerStatus'] ?? 0;
        final String fingerprintId = event['id'] ?? '';
        final FingerStatusType statusType = FingerStatusType.values[statusTypeIndex];

        print('Fingerprint status event: $statusType, ID: $fingerprintId');

        switch (statusType) {
          case FingerStatusType.IDENTIFIED_SUCCESS:
            // Sukses diidentifikasi locally (Method A)
            _errorMessage = null;
            await _handleSuccessfulScan(fingerprintId);
            break;
          case FingerStatusType.IDENTIFIED_FAILED:
            // Jari terdeteksi tapi tidak cocok dengan database
            _lastMatchedSantri = null;
            _errorMessage = 'Sidik jari tidak dikenal/belum terdaftar';
            _statusMessage = 'Sidik jari tidak dikenal. Silakan coba lagi.';
            notifyListeners();
            // Reset status text setelah 3 detik
            Timer(const Duration(seconds: 3), () {
              if (_isConnected && _isListening && _errorMessage != null) {
                _errorMessage = null;
                _statusMessage = 'Tempelkan jari Anda pada sensor...';
                notifyListeners();
              }
            });
            break;
          case FingerStatusType.CAPTURE_ERROR:
            _errorMessage = 'Gagal membaca gambar sidik jari';
            notifyListeners();
            break;
          case FingerStatusType.FINGER_USB_PERMISSION_GRANTED:
            _statusMessage = 'Izin USB diberikan';
            await connectDevice();
            break;
          case FingerStatusType.FINGER_USB_PERMISSION_DENIED:
            _statusMessage = 'Izin USB ditolak';
            notifyListeners();
            break;
          default:
            break;
        }
      }
    });
  }

  // Handle scans yang teridentifikasi sukses
  Future<void> _handleSuccessfulScan(String fingerprintId) async {
    final santri = await DatabaseHelper.instance.getSantriByFingerprintId(fingerprintId);
    
    if (santri != null) {
      _lastMatchedSantri = santri;
      _statusMessage = 'Hadir: ${santri['name']}';
      _errorMessage = null;
      notifyListeners();

      // Catat kehadiran di backend (dan auto-antre jika offline)
      final nowStr = DateTime.now().toIso8601String();
      final dateStr = nowStr.split('T')[0];
      
      // Tentukan sholat berdasarkan jam saat ini
      final hour = DateTime.now().hour;
      String activeSholat = 'Subuh';
      if (hour >= 4 && hour < 6) activeSholat = 'Subuh';
      else if (hour >= 11 && hour < 14) activeSholat = 'Dzuhur';
      else if (hour >= 15 && hour < 17) activeSholat = 'Ashar';
      else if (hour >= 17 && hour < 19) activeSholat = 'Maghrib';
      else if (hour >= 19 && hour < 22) activeSholat = 'Isya';

      await ApiService.reportAttendance(
        santriId: santri['id'],
        date: dateStr,
        prayerTime: activeSholat,
        status: 'Hadir',
        method: 'Fingerprint',
        scannedAt: nowStr,
        academicYearId: santri['academic_year_id'],
      );

      // Reset info santri setelah 4 detik
      Timer(const Duration(seconds: 4), () {
        if (_lastMatchedSantri == santri) {
          _lastMatchedSantri = null;
          _statusMessage = 'Tempelkan jari Anda pada sensor...';
          notifyListeners();
        }
      });
    } else {
      _statusMessage = 'Sidik jari terdaftar (ID: $fingerprintId) tapi data santri tidak ditemukan lokal.';
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _statusSubscription?.cancel();
    super.dispose();
  }
}

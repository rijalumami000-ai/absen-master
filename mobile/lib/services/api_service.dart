import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:zkfinger10/zk_finger.dart';
import '../helpers/database_helper.dart';

class ApiService {
  static const String baseUrl = 'https://absen.alhamidcintamulya.my.id/api';

  // Sinkronisasi data santri dari backend ke SQLite lokal HP
  static Future<bool> syncSantriData() async {
    try {
      // 1. Fetch student list
      final response = await http.get(Uri.parse('$baseUrl/santri')).timeout(const Duration(seconds: 15));
      if (response.statusCode != 200) return false;
      final List<dynamic> santriList = jsonDecode(response.body);

      // 2. Fetch fingerprint templates
      final templatesResponse = await http.get(Uri.parse('$baseUrl/fingerprint/templates')).timeout(const Duration(seconds: 15));
      if (templatesResponse.statusCode != 200) return false;
      final List<dynamic> templatesList = jsonDecode(templatesResponse.body);

      // Create a map of fingerprint_id -> template_data
      final Map<String, String> templateMap = {};
      for (final t in templatesList) {
        if (t['fingerprint_id'] != null && t['template_data'] != null) {
          templateMap[t['fingerprint_id']] = t['template_data'];
        }
      }

      // Merge template_data into santri items
      final List<Map<String, dynamic>> finalSantriList = [];
      for (final s in santriList) {
        final Map<String, dynamic> item = Map<String, dynamic>.from(s);
        final String? fpId = item['fingerprint_id'];
        if (fpId != null && templateMap.containsKey(fpId)) {
          item['fingerprint_template'] = templateMap[fpId];
        } else {
          item['fingerprint_template'] = '';
        }
        finalSantriList.add(item);
      }

      // Store in local SQLite DB
      await DatabaseHelper.instance.replaceAllSantri(finalSantriList);

      // Load templates to local fingerprint hardware database
      if (templateMap.isNotEmpty) {
        await ZkFinger.clearAndLoadDatabase(vUserList: templateMap);
      }

      await DatabaseHelper.instance.setLastSync(DateTime.now().toIso8601String());
      return true;
    } catch (e) {
      print('Sync error: $e');
      return false;
    }
  }

  // Mengirim antrian absensi offline ke server
  static Future<void> syncOfflineAttendanceQueue() async {
    try {
      final queued = await DatabaseHelper.instance.getQueuedAttendance();
      if (queued.isEmpty) return;

      for (final item in queued) {
        final success = await _postAttendanceToServer(
          santriId: item['santri_id'],
          date: item['date'],
          prayerTime: item['prayer_time'],
          status: item['status'],
          method: item['method'],
          scannedAt: item['scanned_at'],
        );

        if (success) {
          // Hapus dari antrian lokal jika berhasil
          await DatabaseHelper.instance.deleteQueuedAttendance(item['id']);
        }
      }
    } catch (e) {
      print('Queue sync error: $e');
    }
  }

  // Helper kirim absensi individual ke server
  static Future<bool> _postAttendanceToServer({
    required int santriId,
    required String date,
    required String prayerTime,
    required String status,
    required String method,
    required String scannedAt,
  }) async {
    try {
      // Kita kirim via endpoint manual attendance batch
      final response = await http.post(
        Uri.parse('$baseUrl/attendance/manual'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'prayer_time': prayerTime,
          'date': date,
          'items': [
            {'santri_id': santriId, 'status': status}
          ]
        }),
      ).timeout(const Duration(seconds: 8));

      return response.statusCode == 200;
    } catch (e) {
      print('Post attendance error: $e');
      return false;
    }
  }

  // Mengirim absensi secara realtime (atau masuk antrean jika gagal)
  static Future<bool> reportAttendance({
    required int santriId,
    required String date,
    required String prayerTime,
    required String status,
    required String method,
    required String scannedAt,
    required int? academicYearId,
  }) async {
    // Jalankan sinkronisasi antrean sebelumnya terlebih dahulu jika terhubung ke internet
    await syncOfflineAttendanceQueue();

    // Coba kirim langsung ke server
    final success = await _postAttendanceToServer(
      santriId: santriId,
      date: date,
      prayerTime: prayerTime,
      status: status,
      method: method,
      scannedAt: scannedAt,
    );

    if (!success) {
      // Jika gagal (karena offline/koneksi putus), masukkan ke antrean SQLite
      await DatabaseHelper.instance.queueAttendance(
        santriId: santriId,
        date: date,
        prayerTime: prayerTime,
        status: status,
        method: method,
        scannedAt: scannedAt,
        academicYearId: academicYearId,
      );
    }
    
    return success;
  }
}

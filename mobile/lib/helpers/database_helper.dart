import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('absensi_lokal.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future _createDB(Database db, int version) async {
    // 1. Santri Table (Stores offline local cache of students)
    await db.execute('''
      CREATE TABLE santri (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        gender TEXT NOT NULL,
        room TEXT NOT NULL,
        parent_phone TEXT,
        fingerprint_id TEXT,
        fingerprint_template TEXT,
        has_fingerprint INTEGER DEFAULT 0,
        academic_year_id INTEGER,
        sekolah_info_santri_id INTEGER,
        mother_name TEXT,
        photo_url TEXT
      )
    ''');

    // 2. Offline Attendance log table (Queues attendance for offline sync)
    await db.execute('''
      CREATE TABLE offline_attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        santri_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        prayer_time TEXT NOT NULL,
        status TEXT NOT NULL,
        method TEXT NOT NULL,
        scanned_at TEXT NOT NULL,
        academic_year_id INTEGER
      )
    ''');

    // 3. Sync Metadata table (Stores sync timestamps)
    await db.execute('''
      CREATE TABLE sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    ''');
  }

  // --- Santri CRUD Helpers ---
  Future<void> replaceAllSantri(List<Map<String, dynamic>> list) async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.delete('santri');
      for (final s in list) {
        await txn.insert('santri', {
          'id': s['id'],
          'name': s['name'],
          'gender': s['gender'],
          'room': s['room'],
          'parent_phone': s['parent_phone'] ?? '',
          'fingerprint_id': s['fingerprint_id'] ?? '',
          'fingerprint_template': s['fingerprint_template'] ?? '',
          'has_fingerprint': (s['has_fingerprint'] == true || s['fingerprint_id'] != null) ? 1 : 0,
          'academic_year_id': s['academic_year_id'],
          'sekolah_info_santri_id': s['sekolah_info_santri_id'],
          'mother_name': s['mother_name'] ?? '',
          'photo_url': s['photo_url'] ?? '',
        });
      }
    });
  }

  Future<List<Map<String, dynamic>>> getSantriList({String? gender, String? room}) async {
    final db = await database;
    String whereString = '1=1';
    List<dynamic> whereArgs = [];

    if (gender != null && gender.isNotEmpty) {
      whereString += ' AND gender = ?';
      whereArgs.add(gender);
    }
    if (room != null && room.isNotEmpty) {
      whereString += ' AND room = ?';
      whereArgs.add(room);
    }

    return await db.query(
      'santri',
      where: whereString,
      whereArgs: whereArgs,
      orderBy: 'name ASC',
    );
  }

  Future<List<String>> getRooms() async {
    final db = await database;
    final res = await db.rawQuery('SELECT DISTINCT room FROM santri ORDER BY room ASC');
    return res.map((r) => r['room'] as String).toList();
  }

  Future<Map<String, dynamic>?> getSantriByFingerprintId(String fingerprintId) async {
    final db = await database;
    final res = await db.query(
      'santri',
      where: 'fingerprint_id = ?',
      whereArgs: [fingerprintId],
    );
    if (res.isNotEmpty) return res.first;
    return null;
  }

  // --- Offline Attendance Queue Helpers ---
  Future<void> queueAttendance({
    required int santriId,
    required String date,
    required String prayerTime,
    required String status,
    required String method,
    required String scannedAt,
    required int? academicYearId,
  }) async {
    final db = await database;
    await db.insert('offline_attendance', {
      'santri_id': santriId,
      'date': date,
      'prayer_time': prayerTime,
      'status': status,
      'method': method,
      'scanned_at': scannedAt,
      'academic_year_id': academicYearId,
    });
  }

  Future<List<Map<String, dynamic>>> getQueuedAttendance() async {
    final db = await database;
    return await db.query('offline_attendance');
  }

  Future<void> deleteQueuedAttendance(int id) async {
    final db = await database;
    await db.delete(
      'offline_attendance',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // --- Metadata Sync Helpers ---
  Future<void> setLastSync(String timestamp) async {
    final db = await database;
    await db.insert(
      'sync_metadata',
      {'key': 'last_sync', 'value': timestamp},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<String?> getLastSync() async {
    final db = await database;
    final res = await db.query(
      'sync_metadata',
      where: 'key = ?',
      whereArgs: ['last_sync'],
    );
    if (res.isNotEmpty) return res.first['value'] as String;
    return null;
  }
}

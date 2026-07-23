import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../helpers/database_helper.dart';
import '../services/api_service.dart';

class ManualAbsensiPage extends StatefulWidget {
  const ManualAbsensiPage({Key? key}) : super(key: key);

  @override
  State<ManualAbsensiPage> createState() => _ManualAbsensiPageState();
}

class _ManualAbsensiPageState extends State<ManualAbsensiPage> {
  String _selectedGender = 'Putri'; // Default Putri
  String _selectedRoom = '';
  String _searchQuery = '';
  
  List<String> _rooms = [];
  List<Map<String, dynamic>> _santriList = [];
  Map<int, String> _attendanceMap = {}; // santriId -> status
  
  bool _isLoading = false;
  bool _isSaving = false;
  String _selectedPrayerTime = 'Subuh';

  @override
  void initState() {
    super.initState();
    _determineActivePrayerTime();
    _loadFiltersAndData();
  }

  void _determineActivePrayerTime() {
    final hour = DateTime.now().hour;
    if (hour >= 4 && hour < 6) _selectedPrayerTime = 'Subuh';
    else if (hour >= 11 && hour < 14) _selectedPrayerTime = 'Dzuhur';
    else if (hour >= 15 && hour < 17) _selectedPrayerTime = 'Ashar';
    else if (hour >= 17 && hour < 19) _selectedPrayerTime = 'Maghrib';
    else if (hour >= 19 && hour < 22) _selectedPrayerTime = 'Isya';
    else _selectedPrayerTime = 'Subuh';
  }

  Future<void> _loadFiltersAndData() async {
    setState(() => _isLoading = true);
    try {
      final rooms = await DatabaseHelper.instance.getRooms();
      final santri = await DatabaseHelper.instance.getSantriList(
        gender: _selectedGender,
        room: _selectedRoom,
      );

      setState(() {
        _rooms = rooms;
        _santriList = santri;
        
        // Initialize attendance map with 'Hadir' by default for new selections
        for (final s in santri) {
          final id = s['id'] as int;
          if (!_attendanceMap.containsKey(id)) {
            _attendanceMap[id] = 'Hadir';
          }
        }
      });
    } catch (e) {
      print('Load error: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // Filter local search list
  List<Map<String, dynamic>> get _filteredSantri {
    if (_searchQuery.isEmpty) return _santriList;
    return _santriList.where((s) {
      final name = (s['name'] as String).toLowerCase();
      final room = (s['room'] as String).toLowerCase();
      return name.contains(_searchQuery.toLowerCase()) || room.contains(_searchQuery.toLowerCase());
    }).toList();
  }

  Future<void> _handleSave() async {
    setState(() => _isSaving = true);
    
    try {
      final todayStr = DateTime.now().toIso8601String().split('T')[0];
      final nowStr = DateTime.now().toIso8601String();
      
      int savedCount = 0;
      for (final s in _filteredSantri) {
        final id = s['id'] as int;
        final status = _attendanceMap[id] ?? 'Hadir';
        
        await ApiService.reportAttendance(
          santriId: id,
          date: todayStr,
          prayerTime: _selectedPrayerTime,
          status: status,
          method: 'Manual',
          scannedAt: nowStr,
          academicYearId: s['academic_year_id'],
        );
        savedCount++;
      }

      _showSuccessModal(savedCount);
    } catch (e) {
      _showErrorModal();
    } finally {
      setState(() => _isSaving = false);
    }
  }

  void _showSuccessModal(int count) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20.0)),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: const BoxDecoration(
                    color: Color(0xFFECFDF5),
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Icon(LucideIcons.checkCircle, color: Color(0xFF10B981), size: 28),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Berhasil Disimpan',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                ),
                const SizedBox(height: 8),
                Text(
                  'Data absensi $count santri sholat $_selectedPrayerTime berhasil dicatat.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                    Navigator.of(context).pop(); // Back to dashboard
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4F46E5),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Selesai'),
                )
              ],
            ),
          ),
        );
      },
    );
  }

  void _showErrorModal() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20.0)),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: const BoxDecoration(
                    color: Color(0xFFFEF2F2),
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Icon(LucideIcons.xCircle, color: Color(0xFFEF4444), size: 28),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Gagal Menyimpan',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Terjadi kesalahan saat memproses penyimpanan data absensi.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFEF4444),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Tutup'),
                )
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Absensi Manual',
          style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w700, fontSize: 18),
        ),
        leading: IconButton(
          icon: const Icon(LucideIcons.chevronLeft, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFFE2E8F0), height: 1),
        ),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // FILTERS BOARD
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                // Prayer Time Selector
                Row(
                  children: [
                    const Text(
                      'Waktu Sholat:',
                      style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _selectedPrayerTime,
                          isExpanded: true,
                          onChanged: (val) {
                            if (val != null) {
                              setState(() => _selectedPrayerTime = val);
                            }
                          },
                          items: ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya']
                              .map((sholat) => DropdownMenuItem(
                                    value: sholat,
                                    child: Text(sholat),
                                  ))
                              .toList(),
                        ),
                      ),
                    ),
                  ],
                ),
                const Divider(height: 24),
                // Gender & Room Filters row
                Row(
                  children: [
                    // Gender Filter
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Gender', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF64748B))),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _selectedGender,
                                isExpanded: true,
                                onChanged: (val) {
                                  if (val != null) {
                                    setState(() => _selectedGender = val);
                                    _loadFiltersAndData();
                                  }
                                },
                                items: const [
                                  DropdownMenuItem(value: 'Putra', child: Text('Putra')),
                                  DropdownMenuItem(value: 'Putri', child: Text('Putri')),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    // Room Filter
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Kamar', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF64748B))),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _selectedRoom,
                                isExpanded: true,
                                onChanged: (val) {
                                  if (val != null) {
                                    setState(() => _selectedRoom = val);
                                    _loadFiltersAndData();
                                  }
                                },
                                items: [
                                  const DropdownMenuItem(value: '', child: Text('Semua')),
                                  ..._rooms.map((r) => DropdownMenuItem(value: r, child: Text(r))),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                // Search Input Field
                TextField(
                  onChanged: (val) => setState(() => _searchQuery = val),
                  decoration: InputDecoration(
                    hintText: 'Cari nama santri...',
                    prefixIcon: const Icon(LucideIcons.search, size: 18, color: Color(0xFF94A3B8)),
                    filled: true,
                    fillColor: const Color(0xFFF1F5F9),
                    contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // LIST OF SANTRI
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(Color(0xFF4F46E5))))
                : _filteredSantri.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(LucideIcons.info, size: 36, color: Color(0xFF94A3B8)),
                            SizedBox(height: 12),
                            Text('Tidak ada santri yang cocok.', style: TextStyle(color: Color(0xFF94A3B8))),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        itemCount: _filteredSantri.length,
                        itemBuilder: (context, index) {
                          final s = _filteredSantri[index];
                          final id = s['id'] as int;
                          final currentStatus = _attendanceMap[id] ?? 'Hadir';

                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.02),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                )
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            s['name'],
                                            style: const TextStyle(
                                              fontSize: 15,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFF0F172A),
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            'Kamar ${s['room']} • ${s['gender']}',
                                            style: const TextStyle(
                                              fontSize: 12,
                                              color: Color(0xFF64748B),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    if (s['has_fingerprint'] == 1)
                                      const Icon(LucideIcons.fingerprint, size: 16, color: Color(0xFF10B981)),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                // Choice Status row buttons
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: ['Hadir', 'Sakit', 'Izin', 'Alfa'].map((opt) {
                                    final isSelected = currentStatus == opt;
                                    
                                    Color getBtnBg() {
                                      if (!isSelected) return const Color(0xFFF1F5F9);
                                      switch (opt) {
                                        case 'Hadir': return const Color(0xFFD1FAE5);
                                        case 'Sakit': return const Color(0xFFFEF3C7);
                                        case 'Izin': return const Color(0xFFDBEAFE);
                                        default: return const Color(0xFFFEE2E2);
                                      }
                                    }

                                    Color getBtnText() {
                                      if (!isSelected) return const Color(0xFF475569);
                                      switch (opt) {
                                        case 'Hadir': return const Color(0xFF065F46);
                                        case 'Sakit': return const Color(0xFF92400E);
                                        case 'Izin': return const Color(0xFF1E40AF);
                                        default: return const Color(0xFF991B1B);
                                      }
                                    }

                                    return InkWell(
                                      onTap: () {
                                        setState(() {
                                          _attendanceMap[id] = opt;
                                        });
                                      },
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                        decoration: BoxDecoration(
                                          color: getBtnBg(),
                                          borderRadius: BorderRadius.circular(20),
                                          border: Border.all(
                                            color: isSelected ? Colors.transparent : const Color(0xFFE2E8F0),
                                            width: 1,
                                          ),
                                        ),
                                        child: Text(
                                          opt,
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w600,
                                            color: getBtnText(),
                                          ),
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ),

          // SUBMIT FOOTER BAR
          Container(
            padding: const EdgeInsets.all(16.0),
            color: Colors.white,
            child: ElevatedButton(
              onPressed: _isSaving || _filteredSantri.isEmpty ? null : _handleSave,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF4F46E5),
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: _isSaving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Text('Simpan Absensi', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}

import '../models/booking_model.dart';

class AppData {
  static final List<BookingModel> bookings = [
    BookingModel(
      id: '1',
      spaceName: 'FMCIII Executive Lounge',
      spaceLocation: 'Canary Wharf, London',
      spaceImageUrl:
          'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80',
      workspaceName: 'FMCIII',
      seatId: 'A-12',
      location: 'Canary Wharf, London',
      date: DateTime(2026, 6, 10),
      startTime: '09:00',
      endTime: '17:00',
      totalAmount: 45.0,
      bookingRef: 'BMS-001',
      status: 'confirmed',
    ),
    BookingModel(
      id: '2',
      spaceName: 'Hive Soho Studio',
      spaceLocation: 'Soho, Central London',
      spaceImageUrl:
          'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&q=80',
      workspaceName: 'Hive Soho',
      seatId: 'B-05',
      location: 'Soho, Central London',
      date: DateTime(2026, 6, 18),
      startTime: '10:00',
      endTime: '14:00',
      totalAmount: 48.0,
      bookingRef: 'BMS-002',
      status: 'upcoming',
    ),
    BookingModel(
      id: '3',
      spaceName: 'The Foundry Hub',
      spaceLocation: 'Shoreditch, London',
      spaceImageUrl:
          'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&q=80',
      workspaceName: 'The Foundry',
      seatId: 'C-03',
      location: 'Shoreditch, London',
      date: DateTime(2026, 5, 5),
      startTime: '08:00',
      endTime: '16:00',
      totalAmount: 60.0,
      bookingRef: 'BMS-003',
      status: 'completed',
    ),
  ];
}

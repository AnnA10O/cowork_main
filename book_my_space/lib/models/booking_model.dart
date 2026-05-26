class BookingModel {
  final String id;
  final String spaceName;
  final String spaceLocation;
  final String spaceImageUrl;
  final String workspaceName;
  final String seatId;
  final String location;
  final DateTime date;
  final String startTime;
  final String endTime;
  final double totalAmount;
  final String bookingRef;
  final String status;

  const BookingModel({
    required this.id,
    required this.spaceName,
    required this.spaceLocation,
    required this.spaceImageUrl,
    required this.workspaceName,
    required this.seatId,
    required this.location,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.totalAmount,
    required this.bookingRef,
    required this.status,
  });
}
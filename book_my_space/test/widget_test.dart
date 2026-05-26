import 'package:flutter_test/flutter_test.dart';
import 'package:book_my_space/main.dart';

void main() {
  testWidgets('App renders without error', (WidgetTester tester) async {
    await tester.pumpWidget(const BookMySpaceApp());
    expect(find.byType(BookMySpaceApp), findsOneWidget);
  });
}

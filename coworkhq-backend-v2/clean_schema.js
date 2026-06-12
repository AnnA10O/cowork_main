const fs = require('fs');

let buf = fs.readFileSync('prisma/schema.prisma');
let str = '';
for (let i = 0; i < buf.length; i++) {
  if (buf[i] !== 0) str += String.fromCharCode(buf[i]);
}

// Strip non-printable ASCII except newlines
str = str.replace(/[^\x20-\x7E\n\r\t]/g, '');

const searchTarget = 'rejectedReason  String?';
if (str.includes(searchTarget) && !str.includes('checkInLogs')) {
  str = str.replace(searchTarget, searchTarget + '\n  checkInLogs     CheckInLog[]');
}

if (!str.includes('model CheckInLog')) {
  str += `
model CheckInLog {
  id          String   @id @default(uuid())
  bookingId   String
  scannedAt   DateTime @default(now())
  scannedBy   String?

  booking     Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  @@map("check_in_logs")
}
`;
}

fs.writeFileSync('prisma/schema.prisma', str, 'utf8');
console.log('Cleaned and updated schema properly.');

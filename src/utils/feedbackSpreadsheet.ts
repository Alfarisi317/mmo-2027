import * as XLSX from 'xlsx';
import { SiteFeedbackEntry } from '../types';

export const GOOGLE_APPS_SCRIPT_FEEDBACK_TEMPLATE = `function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents || '{}');
    var sheetName = payload.sheetName || 'Saran_Website_MMO2027';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow([
        'No',
        'Waktu Kirim (WIB)',
        'Nama Peserta',
        'Asal Sekolah',
        'NISN / No. Ujian',
        'Jenjang',
        'Babak',
        'Pesan / Saran Website'
      ]);
      sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    var nextNo = Math.max(1, sheet.getLastRow());
    sheet.appendRow([
      payload.rowNumber || nextNo,
      payload.submittedAtWib || new Date().toLocaleString('id-ID'),
      payload.participantName || '-',
      payload.school || '-',
      payload.nisnOrRegNumber || '-',
      payload.category || '-',
      payload.stage || '-',
      payload.message || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', row: sheet.getLastRow() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

function formatWebhookStatusLabel(status: SiteFeedbackEntry['webhookStatus']): string {
  switch (status) {
    case 'synced':
      return 'Terkirim ke Google Sheets';
    case 'failed':
      return 'Gagal Sinkron Sheets';
    default:
      return 'Tersimpan di Server';
  }
}

export function exportFeedbackToExcelBlob(entries: SiteFeedbackEntry[]): Blob {
  // Export chronological order (oldest first) for clean spreadsheet rows
  const ordered = [...entries].sort((a, b) => a.createdAt - b.createdAt);

  const rows = ordered.map((entry, idx) => ({
    'No': idx + 1,
    'Waktu Kirim (WIB)': entry.submittedAtWib,
    'Nama Peserta': entry.participantName,
    'Asal Sekolah': entry.school,
    'NISN / No. Ujian': entry.nisnOrRegNumber || '-',
    'Jenjang': entry.category,
    'Babak': entry.stage,
    'Pesan & Saran Website': entry.message,
    'Status Google Sheets': formatWebhookStatusLabel(entry.webhookStatus),
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(
    rows.length > 0
      ? rows
      : [
          {
            'No': '',
            'Waktu Kirim (WIB)': '',
            'Nama Peserta': '',
            'Asal Sekolah': '',
            'NISN / No. Ujian': '',
            'Jenjang': '',
            'Babak': '',
            'Pesan & Saran Website': '',
            'Status Google Sheets': '',
          },
        ]
  );

  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 26 },
    { wch: 28 },
    { wch: 18 },
    { wch: 10 },
    { wch: 14 },
    { wch: 60 },
    { wch: 24 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pesan_Saran_Website');

  const arrayBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  }) as ArrayBuffer;

  return new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(',') || str.includes(';') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportFeedbackToCsvBlob(entries: SiteFeedbackEntry[]): Blob {
  const ordered = [...entries].sort((a, b) => a.createdAt - b.createdAt);
  const headers = [
    'No',
    'Waktu Kirim (WIB)',
    'Nama Peserta',
    'Asal Sekolah',
    'NISN / No. Ujian',
    'Jenjang',
    'Babak',
    'Pesan & Saran Website',
    'Status Google Sheets',
  ];

  const lines = [headers.map(escapeCsvCell).join(',')];
  ordered.forEach((entry, idx) => {
    lines.push(
      [
        idx + 1,
        entry.submittedAtWib,
        entry.participantName,
        entry.school,
        entry.nisnOrRegNumber || '-',
        entry.category,
        entry.stage,
        entry.message,
        formatWebhookStatusLabel(entry.webhookStatus),
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  });

  // UTF-8 BOM for direct opening in Microsoft Excel (Indonesia)
  return new Blob(['\uFEFF' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
}

// Export utilities used by the Admin dashboard.
// Exposes `window.ExportUtils` with:
// - exportToExcel(selectedEventData, allQuestions, allResponses, filename)
// - exportToPDF(selectedEventData, allQuestions, allResponses, filename)
// - exportToWord(selectedEventData, allQuestions, allResponses, filename)

(function () {
    function loadScriptOnce(src) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                if (existing.getAttribute('data-loaded') === '1') return resolve();
                existing.addEventListener('load', () => resolve());
                existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.addEventListener('load', () => {
                script.setAttribute('data-loaded', '1');
                resolve();
            });
            script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
            document.head.appendChild(script);
        });
    }

    async function ensureLibs(kind) {
        // If CDNs are blocked (adblock/CSP/offline), we try to load them again here.
        // Uses the same URLs as `admin.html`.
        if (kind === 'xlsx' && !window.XLSX) {
            const candidates = [
                'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js',
                'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
                'https://unpkg.com/xlsx/dist/xlsx.full.min.js'
            ];

            let loaded = false;
            for (const src of candidates) {
                try {
                    await loadScriptOnce(src);
                    if (window.XLSX) {
                        loaded = true;
                        break;
                    }
                } catch (e) {
                    // try next candidate
                }
            }

            if (!loaded && !window.XLSX) {
                throw new Error('Failed to load XLSX from all CDN sources');
            }
        }

        if (kind === 'pdf') {
            if (!window.jspdf?.jsPDF) {
                await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }
        }

        if (kind === 'docx') {
            const docxLib = window.docx || window.Docx;
            if (!docxLib?.Document) {
                await loadScriptOnce('https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.js');
            }
        }
    }

    function getDocx() {
        return window.docx || window.Docx || null;
    }

    function escapeHtml(text) {
        if (text == null) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    function buildTableData(eventData, questions, responses) {
        const headers = [
            'Sr No',
            ...(questions || []).map(q => q.question)
        ];

        const rows = (responses || []).map((r, index) => {
            const answers = r.answers || {};
            const row = [
                index + 1
            ];
            (questions || []).forEach(q => {
                const value = answers[q.id];
                row.push(Array.isArray(value) ? value.join(', ') : (value ?? ''));
            });
            return row;
        });

        return { headers, rows, title: eventData?.title || 'Event' };
    }

    async function exportToExcel(eventData, questions, responses, filename) {
        await ensureLibs('xlsx');
        if (!window.XLSX) throw new Error('XLSX library not loaded');

        const { headers, rows, title } = buildTableData(eventData, questions, responses);
        const wb = window.XLSX.utils.book_new();
        const ws = window.XLSX.utils.aoa_to_sheet([headers, ...rows]);
        window.XLSX.utils.book_append_sheet(wb, ws, 'Responses');

        const xlsxArray = window.XLSX.write(wb, {
            bookType: 'xlsx',
            type: 'array'
        });
        const blob = new Blob([xlsxArray], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = URL.createObjectURL(blob);
        const opened = window.open(url, '_blank', 'noopener');

        if (!opened) {
            const fallbackLink = document.createElement('a');
            fallbackLink.href = url;
            fallbackLink.target = '_blank';
            fallbackLink.rel = 'noopener';
            document.body.appendChild(fallbackLink);
            fallbackLink.click();
            fallbackLink.remove();
        }

        setTimeout(() => URL.revokeObjectURL(url), 60000);
    }

    async function exportToPDF(eventData, questions, responses, filename) {
        await ensureLibs('pdf');
        const jsPDF = window.jspdf?.jsPDF;
        if (!jsPDF) throw new Error('jsPDF library not loaded');

        const { headers, rows, title } = buildTableData(eventData, questions, responses);
        const doc = new jsPDF({ orientation: 'landscape' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;
        const availableWidth = pageWidth - (margin * 2);
        const rowPadding = 3;
        const lineHeight = 5;
        const headerFill = [102, 126, 234];

        const columnCount = headers.length || 1;
        const colWidth = availableWidth / columnCount;

        const wrapText = (text, width) => doc.splitTextToSize(String(text ?? ''), width - (rowPadding * 2));

        let y = margin;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${title} - Responses`, margin, y);
        y += 10;

        const drawHeader = () => {
            doc.setFillColor(...headerFill);
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');

            let x = margin;
            headers.forEach(header => {
                doc.rect(x, y, colWidth, 8, 'F');
                const lines = wrapText(header, colWidth);
                doc.text(lines, x + rowPadding, y + 5.5);
                x += colWidth;
            });
            doc.setTextColor(0, 0, 0);
            y += 8;
        };

        const drawRow = (row) => {
            const wrappedCells = row.map(cell => wrapText(cell, colWidth));
            const rowHeight = Math.max(...wrappedCells.map(lines => Math.max(1, lines.length))) * lineHeight + (rowPadding * 2);

            if (y + rowHeight > pageHeight - margin) {
                doc.addPage();
                y = margin;
                drawHeader();
            }

            let x = margin;
            row.forEach((cell, idx) => {
                doc.rect(x, y, colWidth, rowHeight);
                const lines = wrappedCells[idx];
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(lines, x + rowPadding, y + rowPadding + 4);
                x += colWidth;
            });

            y += rowHeight;
        };

        drawHeader();
        rows.forEach(drawRow);

        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename || title}_Responses.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(url), 60000);
    }

    async function exportToWord(eventData, questions, responses, filename) {
        const { headers, rows, title } = buildTableData(eventData, questions, responses);

        const tableRows = rows.map(row => `
            <tr>
                ${row.map(cell => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('')}
            </tr>
        `).join('');

        const headerRow = headers.map(header => `<th>${escapeHtml(String(header))}</th>`).join('');
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(title)} - Responses</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; }
        h1 { font-size: 20px; margin-bottom: 16px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #333; padding: 6px 8px; vertical-align: top; }
        th { background: #667eea; color: #fff; text-align: left; }
    </style>
</head>
<body>
    <h1>${escapeHtml(title)} - Responses</h1>
    <table>
        <thead>
            <tr>${headerRow}</tr>
        </thead>
        <tbody>
            ${tableRows || '<tr><td>No responses</td></tr>'}
        </tbody>
    </table>
</body>
</html>`;

        const blob = new Blob([html], { type: 'application/msword' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${filename || title}_Responses.doc`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }

    window.ExportUtils = {
        exportToExcel,
        exportToPDF,
        exportToWord
    };
})();

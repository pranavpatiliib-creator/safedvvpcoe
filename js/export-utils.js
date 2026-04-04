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

    function capitalizeFirstLetter(text) {
        const value = String(text ?? '').trim();
        if (!value) return '';
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    function getReadableColumnLabel(col, index) {
        const raw = capitalizeFirstLetter(col?.label || '');
        if (raw) return raw;

        if (col?.kind === 'serial') return 'Sr No';
        if (col?.kind === 'blank') return `Blank ${index + 1}`;
        return `Question ${index}`;
    }

    const imageDataCache = new Map();

    async function blobToDataUrl(blob) {
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('Failed to read image'));
            reader.readAsDataURL(blob);
        });
    }

    async function loadImageDataUrl(src) {
        if (!src) return null;
        if (imageDataCache.has(src)) {
            return imageDataCache.get(src);
        }

        const r = await fetch(src, { cache: 'force-cache' });
        if (!r.ok) {
            throw new Error(`Failed to load ${src}`);
        }

        const blob = await r.blob();
        const dataUrl = await blobToDataUrl(blob);
        imageDataCache.set(src, dataUrl);
        return dataUrl;
    }

    async function loadFirstAvailableImage(sources) {
        for (const src of sources || []) {
            try {
                const dataUrl = await loadImageDataUrl(src);
                if (dataUrl) {
                    return { src, dataUrl };
                }
            } catch (e) {
                // try the next candidate
            }
        }
        return null;
    }

    function normalizePdfColumns(columns, questions) {
        const questionMap = new Map((questions || []).map(q => [String(q.id), q]));

        if (Array.isArray(columns) && columns.length > 0) {
            return columns.map((col, index) => {
                if (!col) return null;

                const kind = col.kind || (col.questionId ? 'question' : index === 0 ? 'serial' : 'blank');
                if (kind === 'serial') {
                    return { kind: 'serial', label: col.label || 'Sr No' };
                }

                if (kind === 'question') {
                    const questionId = String(col.questionId ?? '');
                    const question = questionMap.get(questionId);
                    return {
                        kind: 'question',
                        questionId,
                        label: capitalizeFirstLetter(col.label || question?.question || `Question ${questionId || index + 1}`)
                    };
                }

                return {
                    kind: 'blank',
                    label: capitalizeFirstLetter(col.label || `Blank ${index + 1}`)
                };
            }).filter(Boolean);
        }

        return [
            { kind: 'serial', label: 'Sr No' },
            ...(questions || []).map(q => ({
                kind: 'question',
                questionId: String(q.id),
                label: capitalizeFirstLetter(q.question || `Question ${q.id}`)
            }))
        ];
    }

    function buildPdfTableData(eventData, questions, responses, columns) {
        const normalizedColumns = normalizePdfColumns(columns, questions);
        const rows = (responses || []).map((response, index) => {
            const answers = response.answers || {};
            return normalizedColumns.map((col) => {
                if (col.kind === 'serial') {
                    return String(index + 1);
                }

                if (col.kind === 'blank') {
                    return '';
                }

                const value = answers[col.questionId];
                return Array.isArray(value) ? value.join(', ') : (value ?? '');
            });
        });

        return {
            columns: normalizedColumns,
            rows,
            title: eventData?.title || 'Event'
        };
    }

    function estimatePdfColumnWidths(doc, columns, rows, availableWidth) {
        const minWidths = columns.map(col => {
            if (col.kind === 'serial') return 12;
            if (col.kind === 'blank') return 18;
            return 24;
        });

        const weights = columns.map((col, index) => {
            const labelLength = String(col.label || '').length;
            const sampleLength = (rows || []).slice(0, 8).reduce((max, row) => {
                const cell = row[index] ?? '';
                return Math.max(max, String(cell).length);
            }, labelLength);

            if (col.kind === 'serial') return 1;
            if (col.kind === 'blank') return Math.max(1.2, Math.min(2.2, sampleLength / 8 + 0.8));
            return Math.max(1.5, Math.min(4.5, sampleLength / 8 + 1));
        });

        const minTotal = minWidths.reduce((sum, value) => sum + value, 0);
        if (minTotal >= availableWidth) {
            const scale = availableWidth / minTotal;
            return minWidths.map(value => Math.max(8, value * scale));
        }

        const weightTotal = weights.reduce((sum, value) => sum + value, 0) || 1;
        const widths = weights.map((weight, index) => Math.max(minWidths[index], (availableWidth * weight) / weightTotal));
        const totalWidth = widths.reduce((sum, value) => sum + value, 0);

        if (totalWidth <= availableWidth) {
            return widths;
        }

        const scale = availableWidth / totalWidth;
        return widths.map(value => value * scale);
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

    async function exportToPDF(eventData, questions, responses, filename, options = {}) {
        await ensureLibs('pdf');
        const jsPDF = window.jspdf?.jsPDF;
        if (!jsPDF) throw new Error('jsPDF library not loaded');

        const { columns, rows, title } = buildPdfTableData(eventData, questions, responses, options.columns);
        const headingText = capitalizeFirstLetter(options.heading || title);
        const orientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';
        const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;
        const availableWidth = pageWidth - (margin * 2);
        const headerFill = [255, 255, 255];
        const headerTextColor = [15, 23, 42];
        const bodyTextColor = [17, 24, 39];
        const rowPaddingX = 2.5;
        const rowPaddingY = 2.5;
        const lineHeight = 4.6;
        const columnWidths = estimatePdfColumnWidths(doc, columns, rows, availableWidth);
        const letterheadCandidates = options.letterheadUrls && options.letterheadUrls.length
            ? options.letterheadUrls
            : ['lh.jpg', 'lh.jpeg', 'collegeheader.jpeg'];
        const letterhead = await loadFirstAvailableImage(letterheadCandidates);
        const orgLines = [
            'First Year Engineering',
            'Dr. Vithalrao Vikhe Patil College Of Engineering, Ahilyanagar'
        ];

        const wrapText = (text, width) => doc.splitTextToSize(String(text ?? ''), Math.max(10, width - (rowPaddingX * 2)));

        const drawPageHeader = () => {
            let y = margin;

            if (letterhead) {
                const imageHeight = 30;
                doc.addImage(letterhead.dataUrl, 'JPEG', margin, y, availableWidth, imageHeight);
                y += imageHeight + 8;
            } else {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                doc.text(orgLines[0], pageWidth / 2, y + 5, { align: 'center' });
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.text(orgLines[1], pageWidth / 2, y + 10, { align: 'center' });
                y += 16;
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(15);
            doc.setTextColor(17, 24, 39);
            doc.text(headingText, pageWidth / 2, y + 6, { align: 'center' });
            y += 14;

            doc.setDrawColor(148, 163, 184);
            doc.setLineWidth(0.4);
            doc.line(margin, y, pageWidth - margin, y);
            y += 6;

            return y;
        };

        const drawHeaderRow = (y) => {
            const headerLineCounts = columns.map((col, index) => wrapText(col.label, columnWidths[index]).length || 1);
            const headerHeight = Math.max(1, ...headerLineCounts) * lineHeight + (rowPaddingY * 2);

            let x = margin;
            doc.setDrawColor(148, 163, 184);
            doc.setFillColor(...headerFill);
            doc.setTextColor(...headerTextColor);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);

            columns.forEach((col, index) => {
                const width = columnWidths[index];
                const lines = wrapText(getReadableColumnLabel(col, index), width);
                doc.rect(x, y, width, headerHeight, 'F');
                doc.rect(x, y, width, headerHeight);
                doc.text(lines, x + rowPaddingX, y + rowPaddingY + 3.5);
                x += width;
            });

            doc.setTextColor(...bodyTextColor);
            return headerHeight;
        };

        const drawBodyRow = (y, row) => {
            const wrappedCells = row.map((cell, index) => wrapText(cell, columnWidths[index]));
            const rowHeight = Math.max(1, ...wrappedCells.map(lines => lines.length || 1)) * lineHeight + (rowPaddingY * 2);

            let x = margin;
            doc.setTextColor(...bodyTextColor);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);

            row.forEach((cell, index) => {
                const width = columnWidths[index];
                const lines = wrappedCells[index];
                doc.rect(x, y, width, rowHeight);
                doc.text(lines, x + rowPaddingX, y + rowPaddingY + 3.5);
                x += width;
            });

            return rowHeight;
        };

        let y = drawPageHeader();
        y += drawHeaderRow(y);

        rows.forEach((row, rowIndex) => {
            const wrappedCells = row.map((cell, index) => wrapText(cell, columnWidths[index]));
            const rowHeight = Math.max(1, ...wrappedCells.map(lines => lines.length || 1)) * lineHeight + (rowPaddingY * 2);

            if (y + rowHeight > pageHeight - margin) {
                doc.addPage();
                y = drawPageHeader();
                y += drawHeaderRow(y);
            }

            y += drawBodyRow(y, row);

            if (rowIndex < rows.length - 1 && y > pageHeight - margin - 2) {
                doc.addPage();
                y = drawPageHeader();
                y += drawHeaderRow(y);
            }
        });

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

        const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const opened = window.open(url, '_blank', 'noopener,noreferrer');
        if (!opened) {
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename || title}_Responses.doc`;
            a.rel = 'noopener';
            document.body.appendChild(a);
            a.click();
            a.remove();
        }

        setTimeout(() => URL.revokeObjectURL(url), 60000);
    }

    window.ExportUtils = {
        exportToExcel,
        exportToPDF,
        exportToWord
    };
})();

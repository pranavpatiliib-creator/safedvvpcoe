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

    function formatAnswerValue(value) {
        if (value == null || value === '') return '';

        if (Array.isArray(value)) {
            return value
                .filter(item => item != null && item !== '')
                .map(item => String(item))
                .join(', ');
        }

        if (typeof value === 'object') {
            if (value.url) {
                return value.fileName ? `${value.fileName} (${value.url})` : String(value.url);
            }

            const memberNames = Array.isArray(value.member_names)
                ? value.member_names
                    .filter(name => name != null && String(name).trim() !== '')
                    .map(name => String(name).trim())
                : [];

            if (memberNames.length > 0) {
                return memberNames.join('\n');
            }

            if (value.group_size) {
                return `Group size: ${value.group_size}`;
            }

            return JSON.stringify(value);
        }

        return String(value);
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
        const resolveColumnLabel = (col, question, fallback) => {
            const fromSelection = capitalizeFirstLetter(col?.label || '');
            if (fromSelection) return fromSelection;

            const fromQuestion = capitalizeFirstLetter(question?.question || '');
            if (fromQuestion) return fromQuestion;

            return capitalizeFirstLetter(fallback || '');
        };

        if (Array.isArray(columns) && columns.length > 0) {
            return columns.map((col, index) => {
                if (!col) return null;

                const kind = col.kind || (col.questionId ? 'question' : index === 0 ? 'serial' : 'blank');
                if (kind === 'serial') {
                    return { kind: 'serial', label: resolveColumnLabel(col, null, 'Sr No') };
                }

                if (kind === 'question') {
                    const questionId = String(col.questionId ?? '');
                    const question = questionMap.get(questionId);
                    return {
                        kind: 'question',
                        questionId,
                        questionPart: col.questionPart || null,
                        label: resolveColumnLabel(col, question, `Question ${questionId || index + 1}`)
                    };
                }

                return {
                    kind: 'blank',
                    label: resolveColumnLabel(col, null, `Blank ${index + 1}`)
                };
            }).filter(Boolean);
        }

        return [
            { kind: 'serial', label: 'Sr No' },
            ...(questions || []).flatMap(q => {
                const questionId = String(q.id);
                const questionLabel = resolveColumnLabel(null, q, `Question ${q.id}`);

                if (q.type === 'group_members') {
                    return [
                        {
                            kind: 'question',
                            questionId,
                            questionPart: 'member_names',
                            label: questionLabel
                        },
                        {
                            kind: 'question',
                            questionId,
                            questionPart: 'group_size',
                            label: `No. of ${questionLabel}`
                        }
                    ];
                }

                return [{
                    kind: 'question',
                    questionId,
                    questionPart: null,
                    label: questionLabel
                }];
            })
        ];
    }

    function getQuestionCellValue(value, questionPart) {
        if (questionPart === 'group_size') {
            if (value && typeof value === 'object' && value.group_size != null && value.group_size !== '') {
                return String(value.group_size);
            }
            return '';
        }

        if (questionPart === 'member_names') {
            if (value && typeof value === 'object' && Array.isArray(value.member_names)) {
                return value.member_names
                    .filter(name => name != null && String(name).trim() !== '')
                    .map(name => String(name).trim())
                    .join('\n');
            }
            return '';
        }

        return formatAnswerValue(value);
    }

    function applyRowSelection(rows, options = {}) {
        const allRows = rows || [];
        const startValue = Number.parseInt(options.startRow, 10);
        const endValue = Number.parseInt(options.endRow, 10);
        const startIndex = Number.isFinite(startValue) && startValue > 0 ? startValue - 1 : 0;
        const endIndex = Number.isFinite(endValue) && endValue > 0 ? endValue : allRows.length;
        return allRows.slice(startIndex, Math.max(startIndex, endIndex));
    }

    function normalizeHeadingLines(heading) {
        return String(heading ?? '')
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);
    }

    function normalizeFooterSignatures(footer) {
        if (!footer || typeof footer !== 'object') {
            return { type: 'none', names: [] };
        }

        const type = ['single', 'triple'].includes(footer.type) ? footer.type : 'none';
        const names = Array.isArray(footer.names)
            ? footer.names.map((name) => String(name || '').trim()).filter(Boolean)
            : [];

        return { type, names };
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
                return getQuestionCellValue(value, col.questionPart);
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
                row.push(formatAnswerValue(value));
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

        const { columns, rows: allRows, title } = buildPdfTableData(eventData, questions, responses, options.columns);
        const rows = applyRowSelection(allRows, options);
        const headingText = capitalizeFirstLetter(options.heading || title);
        const headingLines = normalizeHeadingLines(headingText);
        const orientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';
        const footer = normalizeFooterSignatures(options.footer);
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
            const printableHeadingLines = headingLines.length > 0 ? headingLines : [capitalizeFirstLetter(title)];
            printableHeadingLines.forEach((line, index) => {
                doc.text(line, pageWidth / 2, y + 6 + (index * 6), { align: 'center' });
            });
            y += 8 + (printableHeadingLines.length * 6);

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
            doc.setTextColor(...headerTextColor);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);

            columns.forEach((col, index) => {
                const width = columnWidths[index];
                const lines = wrapText(getReadableColumnLabel(col, index), width);
                doc.setFillColor(...headerFill);
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

        const drawPageFooter = () => {
            if (!footer.names.length || footer.type === 'none') return;

            const footerY = pageHeight - margin - 6;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(71, 85, 105);

            if (footer.type === 'single') {
                const lineStart = pageWidth - margin - 55;
                const lineEnd = pageWidth - margin;
                doc.line(lineStart, footerY, lineEnd, footerY);
                doc.text(footer.names[0], (lineStart + lineEnd) / 2, footerY + 5, { align: 'center' });
                return;
            }

            const slots = [margin + 28, pageWidth / 2, pageWidth - margin - 28];
            slots.forEach((x, index) => {
                doc.line(x - 20, footerY, x + 20, footerY);
                doc.text(footer.names[index] || '', x, footerY + 5, { align: 'center' });
            });
        };

        const rowsPerPage = Number.parseInt(options.rowsPerPage, 10);
        let y = drawPageHeader();
        y += drawHeaderRow(y);
        let rowsOnPage = 0;

        rows.forEach((row, rowIndex) => {
            const wrappedCells = row.map((cell, index) => wrapText(cell, columnWidths[index]));
            const rowHeight = Math.max(1, ...wrappedCells.map(lines => lines.length || 1)) * lineHeight + (rowPaddingY * 2);
            const reachedManualPageSize = Number.isFinite(rowsPerPage) && rowsPerPage > 0 && rowsOnPage >= rowsPerPage;

            if (y + rowHeight > pageHeight - margin || reachedManualPageSize) {
                drawPageFooter();
                doc.addPage();
                y = drawPageHeader();
                y += drawHeaderRow(y);
                rowsOnPage = 0;
            }

            y += drawBodyRow(y, row);
            rowsOnPage += 1;

            if (rowIndex < rows.length - 1 && y > pageHeight - margin - 2) {
                drawPageFooter();
                doc.addPage();
                y = drawPageHeader();
                y += drawHeaderRow(y);
                rowsOnPage = 0;
            }
        });

        drawPageFooter();

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

    async function exportToWord(eventData, questions, responses, filename, options = {}) {
        const { columns, rows: allRows, title } = buildPdfTableData(eventData, questions, responses, options.columns);
        const rows = applyRowSelection(allRows, options);
        const headers = columns.map((col, index) => getReadableColumnLabel(col, index));
        const headingText = capitalizeFirstLetter(options.heading || title);
        const headingHtml = normalizeHeadingLines(headingText)
            .map((line) => `<div>${escapeHtml(line)}</div>`)
            .join('');
        const footer = normalizeFooterSignatures(options.footer);
        const letterheadCandidates = options.letterheadUrls && options.letterheadUrls.length
            ? options.letterheadUrls
            : ['lh.jpg', 'lh.jpeg', 'collegeheader.jpeg'];
        const letterhead = await loadFirstAvailableImage(letterheadCandidates);
        const rowsPerPage = Number.parseInt(options.rowsPerPage, 10);

        const rowGroups = [];
        if (Number.isFinite(rowsPerPage) && rowsPerPage > 0) {
            for (let index = 0; index < rows.length; index += rowsPerPage) {
                rowGroups.push(rows.slice(index, index + rowsPerPage));
            }
        } else {
            rowGroups.push(rows);
        }

        const headerRow = headers.map(header => `<th>${escapeHtml(String(header))}</th>`).join('');
        const letterheadHtml = letterhead
            ? `<div style="margin-bottom: 14px;"><img src="${letterhead.dataUrl}" alt="Letterhead" style="width:100%; max-height:140px; object-fit:contain;"></div>`
            : '';
        const tablesHtml = rowGroups.map((groupRows, groupIndex) => {
            const tableRows = groupRows.map(row => `
                <tr>
                    ${row.map(cell => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('')}
                </tr>
            `).join('');

            return `
                <div class="page-block">
                    ${groupIndex === 0 ? '' : '<div class="page-break"></div>'}
                    <table>
                        <thead>
                            <tr>${headerRow}</tr>
                        </thead>
                        <tbody>
                            ${tableRows || '<tr><td>No responses</td></tr>'}
                        </tbody>
                    </table>
                </div>
            `;
        }).join('');
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(title)} - Responses</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; }
        h1 { font-size: 20px; margin-bottom: 16px; }
        .doc-heading { text-align: center; margin-bottom: 16px; line-height: 1.4; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #333; padding: 6px 8px; vertical-align: top; }
        th { background: #ffffff; color: #111827; text-align: left; font-weight: 700; }
        .page-break { page-break-before: always; height: 0; }
        .doc-footer { margin-top: 34px; color: #475569; font-size: 11px; line-height: 1.5; }
        .doc-footer.single { display: flex; justify-content: flex-end; }
        .doc-footer.triple { display: grid; grid-template-columns: repeat(3, 1fr); gap: 36px; }
        .sign-box { min-height: 38px; text-align: center; }
        .sign-line { border-top: 1px solid #475569; padding-top: 8px; display: inline-block; min-width: 140px; }
    </style>
</head>
<body>
    ${letterheadHtml}
    <h1 class="doc-heading">${headingHtml || `<div>${escapeHtml(capitalizeFirstLetter(title))}</div>`}</h1>
    ${tablesHtml}
    ${footer.type === 'single' && footer.names[0] ? `
        <div class="doc-footer single">
            <div class="sign-box"><div class="sign-line">${escapeHtml(footer.names[0])}</div></div>
        </div>
    ` : ''}
    ${footer.type === 'triple' ? `
        <div class="doc-footer triple">
            <div class="sign-box"><div class="sign-line">${escapeHtml(footer.names[0] || '')}</div></div>
            <div class="sign-box"><div class="sign-line">${escapeHtml(footer.names[1] || '')}</div></div>
            <div class="sign-box"><div class="sign-line">${escapeHtml(footer.names[2] || '')}</div></div>
        </div>
    ` : ''}
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
